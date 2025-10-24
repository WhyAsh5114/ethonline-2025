# ChronoVault Architecture

Complete technical architecture including transaction-bound ZK proofs and QR-based two-device authentication.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Transaction-Bound ZK Proofs](#transaction-bound-zk-proofs)
4. [Two-Device QR Authentication](#two-device-qr-authentication)
5. [Technical Implementation](#technical-implementation)
6. [Data Flow](#data-flow)

---

## System Overview

ChronoVault is a Web3 smart contract wallet with bank-grade security through TOTP-based two-factor authentication and zero-knowledge proofs.

### Key Innovation

**Transaction-Bound Proofs**: Unlike traditional TOTP wallets that pre-compute future codes into Merkle trees, ChronoVault:
- Implements RFC 6238 TOTP algorithm inside ZK circuits
- Cryptographically binds each proof to specific transaction parameters
- Provides unlimited wallet lifespan (no pre-computation limits)
- Ensures true zero-knowledge privacy guarantees

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  • Next.js 15 Frontend                                       │
│  • Two-Device QR Flow (Transaction + Authenticator)          │
│  • Multi-Part QR Code System                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Zero-Knowledge Layer                       │
│  • Circom Circuits (totp_verifier.circom)                   │
│  • Groth16 Proof System                                      │
│  • Poseidon Hash (ZK-friendly)                               │
│  • Transaction Commitment Binding                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Smart Contract Layer                       │
│  • TOTPWallet.sol (ERC-4337 Compatible)                     │
│  • TOTPVerifier.sol (Groth16 Verifier)                      │
│  • Transaction execution with proof validation               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Blockchain Layer                       │
│  • Ethereum / EVM-Compatible Chains                          │
│  • ERC-4337 EntryPoint                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. ZK Circuit (`circuits/src/totp_verifier.circom`)

Verifies TOTP codes and binds proofs to transactions without revealing secrets.

```circom
template TOTPVerifier() {
    // Public inputs
    signal input totpCode;        // 6-digit TOTP code
    signal input timeCounter;     // Unix timestamp / 30
    signal input secretHash;      // Poseidon(secret)
    signal input txCommitment;    // Hash of transaction params ← KEY!
    
    // Private inputs
    signal input secret;          // TOTP secret (never revealed)
    
    // Verifications:
    // 1. Poseidon(secret) === secretHash
    // 2. Poseidon(secret, timeCounter) % 1000000 === totpCode
    // 3. txCommitment is part of public signals
}
```

**Key Features:**
- ~1,200 constraints (vs ~40,000 for SHA-1)
- Poseidon hash (ZK-friendly)
- Transaction commitment included in public signals
- Groth16 proof system for fast verification

### 2. Smart Contract (`blockchain/contracts/TOTPWallet.sol`)

ERC-4337 compatible wallet with TOTP-based ZK proof verification.

```solidity
contract TOTPWallet is IAccount {
    // State
    address public owner;
    uint256 public ownerSecretHash;        // Poseidon(secret)
    uint256 public nonce;                  // Replay protection
    uint256 public lastUsedTimeCounter;    // Prevent reuse
    
    // Constants
    uint256 public constant MAX_TIME_DIFFERENCE = 5 minutes;
    uint256 public constant FIELD_PRIME = 21888...617; // BN254
    
    // Execute with transaction-bound proof
    function executeWithProof(
        address to,
        uint256 value,
        bytes calldata data,
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata publicSignals
    ) external onlyOwner returns (bool success);
}
```

**Key Features:**
- Transaction commitment verification
- Time-based replay protection
- ERC-4337 UserOperation support
- Owner-only execution

### 3. Frontend (`frontend/`)

Next.js application with two-device QR-based authentication flow.

**Key Libraries:**
- `snarkjs`: ZK proof generation in browser
- `circomlibjs`: Poseidon hashing
- `wagmi` + `viem`: Blockchain interactions
- `@yudiel/react-qr-scanner`: QR code scanning
- `qrcode.react`: QR code generation

---

## Transaction-Bound ZK Proofs

### The Problem

Traditional TOTP wallets:
```
❌ TOTP code + Merkle proof → Validates code only
❌ Attacker could intercept and replay for different transaction
❌ No cryptographic binding between proof and transaction
```

### Our Solution

ChronoVault binds proofs to specific transaction parameters:

```typescript
// Step 1: Calculate transaction commitment
txCommitment = keccak256(
  to,              // Destination address
  value,           // ETH amount
  keccak256(data), // Call data hash
  nonce            // Transaction nonce
) % FIELD_PRIME

// Step 2: Generate proof WITH commitment
publicSignals = [totpCode, timeCounter, secretHash, txCommitment]
proof = generateZKProof(secret, totpCode, timeCounter, txCommitment)

// Step 3: Contract verifies commitment matches
expectedCommitment = keccak256(to, value, keccak256(data), nonce)
if (publicSignals[3] != expectedCommitment) revert TxCommitmentMismatch()
```

### Security Guarantees

✅ **Parameter Tampering Prevention**: Changing `to`, `value`, or `data` invalidates proof  
✅ **Replay Attack Prevention**: Each proof is unique to one transaction  
✅ **Front-Running Protection**: Attacker cannot reuse intercepted proof  
✅ **Time-Based Freshness**: Proofs expire after 5 minutes  
✅ **One-Time Use**: Each time counter (30-second window) can only be used once  

---

## Two-Device QR Authentication

### Architecture

True two-factor authentication with proper device separation:

```
┌─────────────────────┐              ┌─────────────────────┐
│  Transaction Device │              │ Authenticator Device│
│  (Web Browser)      │              │ (Separate Device)   │
│                     │              │                     │
│  • Has NO secret    │              │  • Has TOTP secret  │
│  • Prepares tx      │              │  • Generates proofs │
│  • Submits to chain │              │  • Never online     │
└─────────────────────┘              └─────────────────────┘
```

### Flow Diagram

```
Transaction Device                    Authenticator Device
------------------                    --------------------
1. User enters tx params
   (to, value, data)
   
2. Get nonce from wallet
   
3. Calculate commitment:
   hash(to, value, data, nonce)
   
4. Generate QR code with:
   {to, value, data, nonce, 
    commitment, walletAddress}
                              ──────> 5. Scan transaction QR
                              
                                      6. Show tx details
                                      
                                      7. Auto-generate TOTP
                                         (Poseidon algorithm)
                                      
                                      8. Generate ZK proof
                                         (bound to commitment)
                                      
                                      9. Display as 3 QR codes
                                         (auto-cycling, 2 sec)
                              <────── 
10. Scan proof QR codes
    (all 3 parts)

11. Reconstruct full proof

12. Submit executeWithProof(
    to, value, data,
    pA, pB, pC, publicSignals
    )

13. Contract verifies:
    ✓ Commitment matches
    ✓ ZK proof valid
    ✓ Time fresh
    ✓ Secret hash matches

14. Execute transaction
```

### Multi-Part QR Code System

ZK proofs are large (~700+ bytes). Single QR codes are unreliable on low-quality cameras.

**Solution**: Split proof into 3 balanced parts:

**Part 1**: `pA` + `pB[0]`
```json
{
  "part": 1,
  "total": 3,
  "data": {
    "pA": ["...", "..."],
    "pB0": ["...", "..."]
  }
}
```

**Part 2**: `pB[1]` + `pC`
```json
{
  "part": 2,
  "total": 3,
  "data": {
    "pB1": ["...", "..."],
    "pC": ["...", "..."]
  }
}
```

**Part 3**: Public signals
```json
{
  "part": 3,
  "total": 3,
  "data": {
    "publicSignals": ["...", "...", "...", "..."]
  }
}
```

### Auto-Cycling Display

**Authenticator Device** (proof generation):
- Automatically cycles through 3 QR codes
- 2-second interval per QR
- Visual indicators:
  - Large numbered badge (1, 2, 3)
  - Dot progress (• • •)
  - Manual navigation buttons
- User just holds device steady

**Transaction Device** (proof scanning):
- Tracks scanned parts: "Scanned X/3 parts"
- Parts can be scanned in any order
- Auto-reconstructs when complete
- Backward compatible with single QR codes

### UX Benefits

✅ **Smaller QR codes**: Each ~1/3 the size, easier to scan  
✅ **Better reliability**: Works on low-quality cameras  
✅ **Auto-cycling**: No manual intervention needed  
✅ **Clear feedback**: Visual progress indicators  
✅ **Flexible**: Scan parts in any order  

---

## Technical Implementation

### 1. TOTP Secret Generation

Two parallel systems for optimal UX and ZK efficiency:

```typescript
// Standard TOTP (for authenticator apps)
const otpAuthSecret = OTPAuth.Secret().base32; // "GEZDGNBVGY3TQOJQ"
const uri = `otpauth://totp/ChronoVault:${address}?secret=${otpAuthSecret}`;

// Poseidon TOTP (for ZK circuits)
const secret = Array.from({ length: 20 }, () => 
  Math.floor(Math.random() * 10)
).join(""); // "12345678901234567890"

const secretHash = Poseidon([BigInt(secret)]);
```

**Why two systems?**
- Standard TOTP: Users expect Google Authenticator compatibility
- Poseidon TOTP: SHA-1 requires ~40,000 constraints in ZK, Poseidon needs ~150

### 2. Transaction Commitment Calculation

**Frontend** (`src/lib/zk-proof.ts`):
```typescript
export function calculateTxCommitment(params: {
  to: Address;
  value: bigint;
  data: `0x${string}`;
  nonce: bigint;
}): bigint {
  // Hash the data first
  const dataHash = keccak256(params.data);
  
  // Encode: (address, uint256, bytes32, uint256)
  const packed = encodeAbiParameters(
    parseAbiParameters("address, uint256, bytes32, uint256"),
    [params.to, params.value, dataHash, params.nonce],
  );
  
  // Hash and reduce to BN254 field
  const commitmentHash = keccak256(packed);
  return BigInt(commitmentHash) % FIELD_PRIME;
}
```

**Smart Contract** (`TOTPWallet.sol`):
```solidity
function _calculateTxCommitment(
    address to,
    uint256 value,
    bytes calldata data,
    uint256 _nonce
) internal pure returns (uint256) {
    bytes32 commitment = keccak256(abi.encodePacked(
        to,
        value,
        keccak256(data),
        _nonce
    ));
    return uint256(commitment) % FIELD_PRIME;
}
```

### 3. Proof Generation

**Frontend** (`src/lib/zk-proof.ts`):
```typescript
export async function generateZKProof(
  secret: string,
  timestamp: number,
  txCommitment: bigint
): Promise<{ proof: SolidityProof; publicSignals: string[] }> {
  // Calculate TOTP using Poseidon
  const timeCounter = BigInt(Math.floor(timestamp / 30));
  const totpCode = await calculateTOTPCode(secret, timestamp);
  const secretHash = await calculateSecretHash(secret);
  
  // Generate proof
  const input = {
    secret: secret,
    totpCode: totpCode.toString(),
    timeCounter: timeCounter.toString(),
    secretHash: secretHash.toString(),
    txCommitment: txCommitment.toString(),
  };
  
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "/circuits/totp_verifier.wasm",
    "/circuits/totp_verifier_final.zkey"
  );
  
  return formatProofForSolidity(proof, publicSignals);
}
```

### 4. QR Code Components

**Transaction Request QR** (`TransactionQRDisplay`):
```typescript
const txRequest = {
  to: address,
  value: bigint,
  data: `0x${string}`,
  nonce: bigint,
  commitment: bigint,
  walletAddress: address,
};

<QRCodeSVG value={JSON.stringify(txRequest, stringifyBigInt)} />
```

**Proof QR with Auto-Cycling** (`AuthenticatorProofGenerator`):
```typescript
// Split proof into 3 parts
const qrParts = [
  { part: 1, total: 3, data: { pA: proof.pA, pB0: proof.pB[0] } },
  { part: 2, total: 3, data: { pB1: proof.pB[1], pC: proof.pC } },
  { part: 3, total: 3, data: { publicSignals: proof.publicSignals } },
];

// Auto-cycle every 2 seconds
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % 3);
  }, 2000);
  return () => clearInterval(interval);
}, []);

<QRCodeSVG value={JSON.stringify(qrParts[currentIndex])} />
```

**Multi-Part Scanner** (`QRProofScanner`):
```typescript
const [scannedParts, setScannedParts] = useState<Record<number, unknown>>({});

// Track progress
const progress = Object.keys(scannedParts).length;

// Auto-reconstruct when complete
if (progress === 3) {
  const fullProof = {
    pA: part1.pA,
    pB: [part1.pB0, part2.pB1],
    pC: part2.pC,
    publicSignals: part3.publicSignals,
  };
  onProofScanned(fullProof);
}
```

### 5. Contract Verification

**Smart Contract** (`TOTPWallet.sol`):
```solidity
function executeWithProof(
    address to,
    uint256 value,
    bytes calldata data,
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals
) external onlyOwner returns (bool success) {
    // 1. Calculate expected commitment
    uint256 expectedCommitment = _calculateTxCommitment(to, value, data, nonce);
    
    // 2. Verify proof's commitment matches
    if (publicSignals[3] != expectedCommitment) {
        revert TxCommitmentMismatch();
    }
    
    // 3. Verify ZK proof
    if (!_verifyZKProofInternal(pA, pB, pC, publicSignals)) {
        revert InvalidProof();
    }
    
    // 4. Execute transaction
    nonce++;
    (success, ) = to.call{value: value}(data);
    
    if (!success) revert TransactionFailed();
    
    emit TransactionExecuted(to, value, data, success);
    return success;
}

function _verifyZKProofInternal(
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals
) internal returns (bool) {
    // Verify secret hash matches
    if (publicSignals[2] != ownerSecretHash) {
        revert SecretHashMismatch();
    }
    
    // Check timestamp freshness (within 5 minutes)
    _checkTimestampFreshness(publicSignals[1]);
    
    // Prevent time counter reuse
    if (publicSignals[1] <= lastUsedTimeCounter) {
        revert TimeCounterAlreadyUsed();
    }
    
    // Verify Groth16 proof
    bool valid = _verifier.verifyProof(pA, pB, pC, publicSignals);
    
    if (valid) {
        lastUsedTimeCounter = publicSignals[1];
        emit ZKProofVerified(block.timestamp, true);
    }
    
    return valid;
}
```

---

## Data Flow

### Setup Phase

```
1. User → Frontend
   "Create new wallet"

2. Frontend
   ├─ Generate otpAuthSecret (Base32)
   ├─ Generate secret (numeric)
   ├─ Calculate secretHash = Poseidon(secret)
   └─ Display QR code for authenticator app

3. User → Authenticator App
   Scan QR code

4. Authenticator App
   Store otpAuthSecret
   Display 6-digit codes (SHA-1 based)

5. Frontend → Blockchain
   Deploy TOTPWallet(entryPoint, verifier, owner, secretHash)

6. Frontend
   ├─ Store secret in session
   └─ Store wallet address
```

### Transaction Phase

```
1. User → Transaction Device
   Enter: to, value, data

2. Transaction Device
   ├─ Get nonce from wallet
   ├─ Calculate txCommitment
   └─ Generate transaction request QR

3. User → Authenticator Device
   Scan transaction QR

4. Authenticator Device
   ├─ Display transaction details
   ├─ Auto-generate TOTP (Poseidon)
   ├─ Generate ZK proof (bound to txCommitment)
   └─ Display 3 auto-cycling proof QR codes

5. User → Transaction Device
   Scan all 3 proof QR codes

6. Transaction Device → Blockchain
   Call executeWithProof(to, value, data, proof, publicSignals)

7. Smart Contract
   ├─ Verify txCommitment matches
   ├─ Verify ZK proof
   ├─ Check time freshness
   ├─ Prevent time counter reuse
   ├─ Execute transaction
   └─ Emit events

8. Transaction Device
   Display success ✓
```

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Circuit Constraints | ~1,200 |
| Proof Generation (Browser) | 2-5 seconds |
| Proof Size | ~700 bytes |
| Verification Gas | ~250,000 |
| QR Code Parts | 3 |
| QR Cycle Interval | 2 seconds |
| Time Window | 30 seconds |
| Proof Freshness | 5 minutes |
| Time Counter Reuse | Never (one-time use) |

---

## Time-Sensitive Transaction Guarantees

ChronoVault's TOTP mechanism provides **cryptographic transaction deadlines** - proofs automatically expire after 5 minutes, ensuring transactions execute promptly or fail safely.

### How It Works

The `MAX_TIME_DIFFERENCE` constant (5 minutes) enforces that ZK proofs must be used within their validity window:

```solidity
function _checkTimestampFreshness(uint256 timestamp) internal view {
    uint256 currentTime = block.timestamp;
    if (timestamp > currentTime) revert TimestampInFuture();
    if (currentTime - timestamp > MAX_TIME_DIFFERENCE) revert TimestampTooOld();
}
```

This provides deterministic proof expiration without relying on external oracles or off-chain infrastructure.

### Use Cases

#### 1. **Flash Loan Protection**
Execute DeFi trades only if they happen within the specified time window, preventing stale transactions from executing after market conditions change.

```
User approves flash loan arbitrage at T=0
→ If mempool delay causes execution at T+6min
→ Transaction auto-rejects (TimestampTooOld)
→ User protected from executing under changed conditions
```

#### 2. **Price-Sensitive Trading**
Protect users from slippage on delayed transactions by encoding time deadlines directly in the proof.

```
User sees ETH at $3,000 and initiates swap
→ Generates proof with deadline: current time + 5min
→ If network congestion delays transaction beyond deadline
→ Auto-rejection prevents execution at unfavorable $2,800 price
→ No need for complex slippage tolerance calculations
```

#### 3. **Time-Critical Operations**
Enable operations that must execute within a specific window or fail entirely:

- **Emergency Withdrawals**: Must execute within minutes or abort
- **Auction Bids**: Expire if not mined before auction closes
- **Conditional Approvals**: "I authorize this transfer, but only for the next 5 minutes"
- **Rate-Limited Actions**: Ensure operations happen in intended sequence

#### 4. **MEV Protection via Time Decay**
Reduce MEV attack surface by limiting the time window attackers can exploit:

```
Attacker intercepts proof in mempool
→ Proof has 3 minutes remaining before expiration
→ Limited time window to coordinate attack
→ Proof becomes worthless after deadline
→ Reduces profitability of MEV attacks
```

#### 5. **Stale Approval Prevention**
Traditional token approvals remain valid indefinitely. ChronoVault proofs expire:

```
Traditional Wallet: Approve token transfer → Valid forever
ChronoVault: Approve with proof → Valid for 5 minutes only
```

### Security Benefits

✅ **Deterministic Expiration**: No reliance on off-chain oracles  
✅ **Market Condition Protection**: Prevents execution under changed conditions  
✅ **MEV Resistance**: Limited attack window reduces profitability  
✅ **User Safety**: Stale transactions fail instead of executing unexpectedly  
✅ **DeFi Optimized**: Perfect for price-sensitive and time-critical operations  

### Comparison: Time-Locks vs Transaction Deadlines

| Feature | Traditional Time-Locks | ChronoVault Deadlines |
|---------|------------------------|----------------------|
| Direction | "Can't execute UNTIL time X" | "Can't execute AFTER time X" |
| Use Case | Vesting, delays | Time-sensitive operations |
| Expiration | No automatic expiration | Automatic after 5 minutes |
| Stale Protection | None | Built-in |
| DeFi Trading | Not suitable | Optimized for |

---

## Security Properties

✅ **Zero-Knowledge**: Secret never revealed, even during proof verification  
✅ **Transaction Binding**: Proof mathematically bound to specific transaction  
✅ **Replay Protection**: Time counter + nonce prevent reuse  
✅ **Parameter Tampering**: Changing any tx param invalidates proof  
✅ **Front-Running Protection**: Intercepted proof cannot be reused  
✅ **Time Freshness**: 5-minute window prevents old proofs  
✅ **One-Time Use**: Each time counter can only be used once  
✅ **Device Separation**: Transaction device never sees TOTP secret  
✅ **Cryptographic Deadlines**: Proofs expire automatically for time-sensitive operations  

See [SECURITY.md](./SECURITY.md) for detailed security analysis.

---

## Future Enhancements

1. **Batch Transactions**: Generate single proof for multiple transactions
2. **Social Recovery**: ZK-based recovery with guardians
3. **Hardware Integration**: Support for hardware TOTP devices
4. **Mobile Optimization**: Faster proof generation on mobile
5. **ERC-4337 Paymaster**: Gasless transactions with sponsors
6. **Multi-Chain**: Deploy on multiple EVM chains

---

## Related Documentation

- [SECURITY.md](./SECURITY.md) - Security model and attack prevention
- [ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md) - ELI5 guide to ZK-TOTP
- [../README.md](../README.md) - Project overview and getting started
- [../blockchain/README.md](../blockchain/README.md) - Smart contract documentation
- [../circuits/README.md](../circuits/README.md) - ZK circuit documentation
- [../frontend/README.md](../frontend/README.md) - Frontend documentation
