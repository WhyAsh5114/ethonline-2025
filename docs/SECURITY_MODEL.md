# Security Model & Attack Prevention 🛡️

This document describes the comprehensive security model of the ChronoVault TOTP wallet, including protections against various attack vectors even when the private key is compromised.

---

## Table of Contents

1. [Threat Model](#threat-model)
2. [Core Security Principles](#core-security-principles)
3. [Transaction Commitment Binding](#transaction-commitment-binding)
4. [Attack Scenarios & Protections](#attack-scenarios--protections)
5. [Security Layers](#security-layers)
6. [Proof Lifecycle](#proof-lifecycle)

---

## Threat Model

### Assumptions

**What Attackers May Have:**
- ✅ Your private key (compromised seed phrase/keystore)
- ✅ Access to public blockchain data (all transactions visible)
- ✅ Ability to see transactions in mempool before mining
- ✅ Ability to submit transactions with higher gas (front-running)
- ✅ Knowledge of smart contract code and circuit design

**What Attackers Do NOT Have:**
- ❌ Your TOTP secret (stored securely on your device)
- ❌ Your authenticator app
- ❌ Ability to generate valid ZK proofs without the secret

### Security Goals

1. **Prevent unauthorized transactions** even with compromised private key
2. **Prevent front-running attacks** on legitimate transactions
3. **Prevent parameter tampering** (changing transaction destination/amount)
4. **Prevent replay attacks** using old proofs
5. **Maintain privacy** of the TOTP secret

---

## Core Security Principles

### 1. Zero-Knowledge Proof Authentication

Every transaction requires a zero-knowledge proof that demonstrates:
- Knowledge of the TOTP secret
- Correct TOTP code for current time
- Fresh timestamp (within 5 minutes)
- Commitment to specific transaction parameters

### 2. Transaction Commitment Binding

**The proof is cryptographically bound to transaction parameters:**

```solidity
txCommitment = keccak256(abi.encodePacked(
    to,              // Destination address
    value,           // ETH amount to send
    keccak256(data), // Call data hash
    nonce            // Transaction nonce
))
```

This commitment becomes part of the public signals in the ZK proof:
```
publicSignals = [totpCode, timeCounter, secretHash, txCommitment]
```

**Why This Matters:**
- The proof mathematically proves knowledge of TOTP for THIS SPECIFIC transaction
- Changing any parameter invalidates the proof
- Attacker cannot reuse proof for different transaction

### 3. Nonce-Based Ordering

Each successful transaction increments a nonce, ensuring:
- Transactions execute in order
- Old proofs cannot be reused
- Transaction uniqueness

### 4. Time-Based Freshness

Multiple layers of time-based protection:
- TOTP changes every 30 seconds
- Proofs expire after 5 minutes
- Time counter must strictly increase (no reuse of old time windows)

---

## Transaction Commitment Binding

### Circuit-Level Binding

**Updated Circuit (`totp_verifier.circom`):**

```circom
template TOTPVerifier() {
    // Public inputs
    signal input totpCode;        // 6-digit TOTP code
    signal input timeCounter;     // Unix timestamp / 30
    signal input secretHash;      // Poseidon hash of secret
    signal input txCommitment;    // Hash of transaction parameters ← NEW!
    
    // Private inputs
    signal input secret;          // The TOTP secret
    
    // ... verification logic ...
}
```

The `txCommitment` is now part of the public inputs, meaning:
1. It's included in the proof generation
2. It's verified by the ZK verifier
3. It cannot be changed without regenerating the entire proof

### Smart Contract Verification

**Contract Function (`TOTPWallet.sol`):**

```solidity
function executeWithProof(
    address to,
    uint256 value,
    bytes calldata data,
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals  // Now includes txCommitment!
) external onlyOwner returns (bool success) {
    // 1. Calculate expected commitment from actual parameters
    bytes32 expectedTxCommitment = keccak256(abi.encodePacked(
        to,
        value,
        keccak256(data),
        nonce
    ));
    
    // 2. Verify proof's commitment matches actual transaction
    if (uint256(expectedTxCommitment) != publicSignals[3]) {
        revert TxCommitmentMismatch();
    }
    
    // 3. Verify the ZK proof (includes TOTP verification)
    _verifyZKProofInternal(pA, pB, pC, publicSignals);
    
    // 4. Execute transaction
    nonce++;
    (success, ) = to.call{value: value}(data);
    // ...
}
```

### Frontend Commitment Calculation

**Proof Generation (`zk-proof.ts`):**

```typescript
// Calculate transaction commitment using same method as contract
export function calculateTxCommitment(txParams: TxParams): bigint {
  // First hash the data
  const dataHash = keccak256(txParams.data as `0x${string}`);

  // Encode parameters: (address, uint256, bytes32, uint256)
  const packed = encodeAbiParameters(
    parseAbiParameters("address, uint256, bytes32, uint256"),
    [txParams.to, txParams.value, dataHash, txParams.nonce],
  );

  // Hash the packed parameters
  const commitmentHash = keccak256(packed);
  return BigInt(commitmentHash);
}
```

---

## Attack Scenarios & Protections

### Attack 1: Compromised Private Key

**Scenario:**
```
Attacker steals your seed phrase/private key
Attacker has full control over the owner EOA
Attacker tries to drain wallet funds
```

**Protection:**
```solidity
// Old vulnerable code (REMOVED):
function execute(address to, uint256 value, bytes calldata data) 
    external onlyOwner {
    // Just checks msg.sender == owner
    // ❌ Attacker with private key can drain wallet!
}

// New secure code:
function execute(address to, uint256 value, bytes calldata data) 
    external pure returns (bool) {
    revert DirectExecuteDisabled();
    // ✅ Direct execution blocked!
}

function executeWithProof(...proof...) external onlyOwner {
    // Requires valid TOTP proof
    // ✅ Attacker needs your TOTP secret, not just private key!
}
```

**Result:** ✅ **Attack Blocked**
- Attacker cannot execute transactions without TOTP
- Even with private key, they cannot generate valid proofs
- Your funds remain secure

---

### Attack 2: Front-Running with Modified Parameters

**Scenario:**
```
You submit: executeWithProof(to=Bob, value=1 ETH, proof)
Attacker sees in mempool
Attacker submits with higher gas: executeWithProof(to=Attacker, value=100 ETH, proof)
```

**Protection:**
```
Your Transaction:
  to = Bob
  value = 1 ETH
  nonce = 5
  txCommitment in proof = keccak256(Bob, 1 ETH, 0x, 5) = 0xABC...

Attacker's Transaction:
  to = Attacker
  value = 100 ETH  
  nonce = 5
  expectedCommitment = keccak256(Attacker, 100 ETH, 0x, 5) = 0xDEF...
  proof still contains = 0xABC...

Contract verification:
  require(0xDEF... == 0xABC...)  // ❌ MISMATCH!
  revert TxCommitmentMismatch()
```

**Result:** ✅ **Attack Blocked**
- Proof is mathematically bound to YOUR transaction parameters
- Changing any parameter breaks the binding
- Attacker's transaction reverts

---

### Attack 3: Front-Running with Same Parameters

**Scenario:**
```
You submit: executeWithProof(to=Bob, value=1 ETH, proof)
Attacker copies ENTIRE transaction
Attacker submits with higher gas: executeWithProof(to=Bob, value=1 ETH, proof)
```

**Protection:**
```
Scenario A: Attacker's tx mines first
  1. Attacker's tx executes
  2. lastUsedTimeCounter = 58707830
  3. Your tx arrives
  4. Contract checks: if (58707830 <= lastUsedTimeCounter) revert
  5. Your tx reverts with TimeCounterAlreadyUsed()
  
Scenario B: Your tx mines first  
  1. Your tx executes ✅
  2. lastUsedTimeCounter = 58707830
  3. Attacker's tx arrives
  4. Attacker's tx reverts with TimeCounterAlreadyUsed()
```

**Result:** ⚠️ **Transaction Race**
- One transaction will succeed (yours or attacker's)
- Both send 1 ETH to Bob (your intended recipient)
- Attacker gains nothing, just wastes gas
- You can retry with new TOTP code if yours fails

**Mitigation:**
- Use private mempool (Flashbots, etc.) to hide transactions
- Accept that attacker can "help" you but not harm you
- Transaction still goes where you intended

---

### Attack 4: Replay Attack (Old Proof)

**Scenario:**
```
You execute transaction on Monday with proof A
Attacker saves proof A
Attacker tries to replay proof A on Tuesday
```

**Protection:**
```solidity
function _verifyZKProofInternal(...publicSignals...) internal {
    uint256 timeCounter = publicSignals[1];
    
    // Check 1: Time counter must be fresh (within 5 minutes)
    uint256 timestamp = timeCounter * 30;
    _checkTimestampFreshness(timestamp);
    
    // Check 2: Time counter must INCREASE
    if (timeCounter <= lastUsedTimeCounter) {
        revert TimeCounterAlreadyUsed();
    }
    
    // Update tracking
    lastUsedTimeCounter = timeCounter;
}
```

**Result:** ✅ **Attack Blocked**
- Old proof has old timeCounter
- Contract enforces strictly increasing timeCounter
- Replay reverts with TimeCounterAlreadyUsed()

---

### Attack 5: Proof Interception & Parameter Modification

**Scenario:**
```
You generate proof for: send 1 ETH to Bob
Attacker intercepts proof before you submit
Attacker tries: send 100 ETH to Attacker using your proof
```

**Protection:**
```
This is identical to Attack 2 (Front-Running with Modified Parameters)

Your proof.publicSignals[3] = hash(Bob, 1 ETH, nonce)
Attacker tries to use with (Attacker, 100 ETH, nonce)
Contract calculates: hash(Attacker, 100 ETH, nonce) ≠ proof.publicSignals[3]
revert TxCommitmentMismatch()
```

**Result:** ✅ **Attack Blocked**
- Proof is cryptographically bound to specific parameters
- Cannot be used for different transaction

---

### Attack 6: Nonce Manipulation

**Scenario:**
```
You generate proof with nonce=5
Before you submit, attacker increments nonce to 6
Your transaction uses expectedNonce=5, actual nonce=6
```

**Protection:**
```typescript
// Frontend fetches current nonce BEFORE generating proof
const nonce = await publicClient.readContract({
  address: walletAddress,
  abi: totpWalletAbi,
  functionName: "nonce",
});

// Generate proof with current nonce
const txParams = { to, value, data, nonce };
const proof = await generateZKProof(secret, totpCode, timestamp, txParams);

// Contract verifies nonce matches
const expectedCommitment = keccak256(to, value, keccak256(data), nonce);
if (proof.publicSignals[3] != expectedCommitment) revert;
```

**Result:** ⚠️ **Nonce Race Condition**
- If nonce changes between proof generation and submission, tx fails
- User must regenerate proof with new nonce
- Attacker cannot use old proof (wrong commitment)

**Mitigation:**
- Submit transaction quickly after proof generation
- Retry with new proof if nonce changes
- Use proper nonce management in wallet UI

---

## Security Layers

### Layer 1: Access Control
```solidity
modifier onlyOwner() {
    if (msg.sender != owner) revert OnlyOwner();
    _;
}
```
- Only wallet owner can call executeWithProof
- Prevents unauthorized external calls

### Layer 2: TOTP Verification
```solidity
function _verifyZKProofInternal(...) internal {
    // Verify secret hash matches
    if (publicSignals[2] != ownerSecretHash) revert SecretHashMismatch();
    
    // Verify TOTP code is correct
    bool isValid = _verifier.verifyProof(pA, pB, pC, publicSignals);
    if (!isValid) revert InvalidProof();
}
```
- Proves knowledge of TOTP secret
- Verifies correct code generation

### Layer 3: Time-Based Protection
```solidity
// Check timestamp is fresh (within 5 minutes)
_checkTimestampFreshness(timestamp);

// Check time counter hasn't been used
if (timeCounter <= lastUsedTimeCounter) revert TimeCounterAlreadyUsed();

// Update last used
lastUsedTimeCounter = timeCounter;
```
- Prevents old proof reuse
- Enforces freshness
- Prevents replay attacks

### Layer 4: Transaction Binding
```solidity
// Calculate expected commitment
bytes32 expectedTxCommitment = keccak256(abi.encodePacked(
    to, value, keccak256(data), nonce
));

// Verify proof commits to this transaction
if (uint256(expectedTxCommitment) != publicSignals[3]) {
    revert TxCommitmentMismatch();
}
```
- Binds proof to specific transaction
- Prevents parameter tampering
- Prevents proof misuse

### Layer 5: Nonce Sequencing
```solidity
nonce++;  // Increment after successful execution
```
- Ensures transaction ordering
- Prevents nonce-based replay
- Provides transaction uniqueness

---

## Proof Lifecycle

### 1. Proof Generation (Frontend)

```typescript
// User enters transaction details
const to = "0xBob...";
const value = parseEther("1.0");
const data = "0x";

// Fetch current nonce
const nonce = await contract.read.nonce();

// Calculate transaction commitment
const txCommitment = calculateTxCommitment({ to, value, data, nonce });

// Generate ZK proof with TOTP
const proof = await generateZKProof(secret, totpCode, timestamp, {
  to,
  value,
  data,
  nonce
});

// proof.publicSignals = [totpCode, timeCounter, secretHash, txCommitment]
```

### 2. Proof Submission (Transaction)

```solidity
function executeWithProof(
    address to,
    uint256 value,
    bytes calldata data,
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals
) external onlyOwner
```

### 3. Proof Verification (Contract)

```solidity
// Step 1: Check transaction commitment
bytes32 expectedCommitment = keccak256(abi.encodePacked(to, value, keccak256(data), nonce));
require(uint256(expectedCommitment) == publicSignals[3]);

// Step 2: Verify ZK proof
require(publicSignals[2] == ownerSecretHash);
require(publicSignals[1] > lastUsedTimeCounter);
require(_verifier.verifyProof(pA, pB, pC, publicSignals));

// Step 3: Update state
lastUsedTimeCounter = publicSignals[1];
nonce++;

// Step 4: Execute
(bool success, ) = to.call{value: value}(data);
```

### 4. Proof Expiration

**Proofs become invalid when:**
- ✅ Time counter already used (lastUsedTimeCounter check)
- ✅ Timestamp too old (> 5 minutes)
- ✅ Nonce changed (commitment mismatch)
- ✅ Transaction parameters don't match commitment

---

## Summary

### Security Guarantees

✅ **Private Key Compromise**: Funds remain safe, TOTP required  
✅ **Front-Running**: Proof bound to specific transaction parameters  
✅ **Replay Attacks**: Time-based and nonce-based protection  
✅ **Parameter Tampering**: Cryptographic commitment verification  
✅ **Secret Privacy**: Zero-knowledge proofs, secret never revealed  

### Attack Surface Minimization

1. **No trusted third parties**: Fully on-chain verification
2. **No secret storage on-chain**: Only hash stored
3. **No reusable proofs**: One-time use enforced
4. **No parameter flexibility**: Strict commitment binding
5. **No old transactions**: Time-based expiration

### Best Practices for Users

1. **Keep TOTP secret secure**: Store in secure authenticator app
2. **Use fresh codes**: Generate new TOTP for each transaction
3. **Submit quickly**: Minimize time between proof generation and submission
4. **Monitor transactions**: Watch for unexpected nonce changes
5. **Use private mempool**: Consider Flashbots to hide from front-runners

---

## Technical References

- **ZK Circuits**: `/circuits/src/totp_verifier.circom`
- **Smart Contract**: `/blockchain/contracts/TOTPWallet.sol`
- **Proof Generation**: `/frontend/src/lib/zk-proof.ts`
- **Transaction Hook**: `/frontend/src/hooks/use-totp-wallet.ts`

---

**Last Updated**: October 23, 2025  
**Security Model Version**: 2.0 (Transaction Commitment Binding)
