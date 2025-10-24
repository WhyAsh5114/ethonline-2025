# Security Model & Attack Prevention 🛡️

Comprehensive security model of ChronoVault including transaction-bound proofs and multi-layer protection.

---

## Table of Contents

1. [Threat Model](#threat-model)
2. [Core Security Features](#core-security-features)
3. [Transaction Commitment Binding](#transaction-commitment-binding)
4. [Attack Scenarios & Protections](#attack-scenarios--protections)
5. [Security Layers](#security-layers)
6. [Replay Attack Prevention](#replay-attack-prevention)

---

## Threat Model

### What Attackers May Have

✅ **Your private key** (compromised seed phrase/keystore)  
✅ **Access to blockchain data** (all transactions are public)  
✅ **Mempool visibility** (can see pending transactions)  
✅ **Front-running capability** (can submit higher gas transactions)  
✅ **Contract code knowledge** (smart contracts and circuits are public)  

### What Attackers Do NOT Have

❌ **Your TOTP secret** (stored securely on your authenticator device)  
❌ **Your authenticator app** (separate physical device)  
❌ **Ability to generate valid ZK proofs** (requires the secret)  

### Security Goals

1. **Prevent unauthorized transactions** even with compromised private key
2. **Prevent front-running attacks** on legitimate transactions
3. **Prevent parameter tampering** (changing destination/amount)
4. **Prevent replay attacks** using old proofs
5. **Maintain privacy** of the TOTP secret
6. **Ensure two-factor authentication** with proper device separation

---

## Core Security Features

### 1. Zero-Knowledge Proof Authentication

Every transaction requires a ZK proof demonstrating:

```
✓ Knowledge of the TOTP secret
✓ Correct TOTP code for current time
✓ Fresh timestamp (within 5 minutes)
✓ Commitment to specific transaction parameters ← KEY INNOVATION
```

**Circuit Verification:**
```circom
// Verify secret knowledge
Poseidon(secret) === secretHash

// Verify TOTP code generation
totpCode === Poseidon(secret, timeCounter) % 1000000

// Transaction commitment is part of public signals
publicSignals = [totpCode, timeCounter, secretHash, txCommitment]
```

### 2. Transaction Commitment Binding

**The proof is cryptographically bound to transaction parameters:**

```solidity
txCommitment = keccak256(abi.encodePacked(
    to,              // Destination address
    value,           // ETH amount to send
    keccak256(data), // Call data hash
    nonce            // Transaction nonce
)) % FIELD_PRIME
```

This commitment becomes **part of the ZK proof**:
- Included in proof generation as public input
- Verified by the ZK circuit
- Checked by smart contract against actual transaction

**Critical Implication:**
```
Proof is valid ONLY for this exact transaction.
Changing ANY parameter → Proof becomes invalid.
```

### 3. Multi-Layer Time-Based Protection

**Layer 1: TOTP Time Windows (30 seconds)**
- TOTP code changes every 30 seconds
- Each time window has unique code
- Based on `timeCounter = floor(timestamp / 30)`

**Layer 2: Proof Freshness (5 minutes)**
```solidity
uint256 currentTime = block.timestamp;
uint256 proofTime = timeCounter * 30;

// Proof must be within 5 minutes
require(
    currentTime >= proofTime && 
    currentTime - proofTime <= MAX_TIME_DIFFERENCE,
    "Timestamp too old or in future"
);
```

**Layer 3: One-Time Use Protection**
```solidity
// Each time counter can only be used ONCE
require(
    timeCounter > lastUsedTimeCounter,
    "Time counter already used"
);

// After successful verification
lastUsedTimeCounter = timeCounter;
```

**Combined Protection:**
- Even within 5-minute window, each 30-second slot is one-time use
- Prevents replay attacks with intercepted proofs
- Provides 10 unique time windows per 5-minute period

### 4. Nonce-Based Transaction Ordering

```solidity
uint256 public nonce;

function executeWithProof(...) external {
    // Nonce is part of txCommitment calculation
    uint256 commitment = keccak256(abi.encodePacked(
        to, value, keccak256(data), nonce
    ));
    
    // After successful execution
    nonce++;
}
```

**Properties:**
- Transactions execute in order
- Each transaction has unique nonce
- Cannot skip nonces
- Combined with time counter for double protection

---

## Transaction Commitment Binding

### How It Works

**Step 1: Frontend Calculates Commitment**
```typescript
// When preparing transaction
const txCommitment = calculateTxCommitment({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  value: 1000000000000000000n, // 1 ETH
  data: "0x",
  nonce: 5n,
});

// Example: txCommitment = 12345...789 (BN254 field element)
```

**Step 2: Commitment Included in Proof**
```typescript
// Generate ZK proof WITH commitment
const { proof, publicSignals } = await generateZKProof(
  secret,
  timestamp,
  txCommitment // ← Bound to transaction
);

// publicSignals[3] = txCommitment
```

**Step 3: Contract Verifies Match**
```solidity
function executeWithProof(
    address to,
    uint256 value,
    bytes calldata data,
    uint[2] calldata pA,
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals
) external {
    // Calculate expected commitment from actual parameters
    uint256 expected = _calculateTxCommitment(to, value, data, nonce);
    
    // Verify proof's commitment matches
    if (publicSignals[3] != expected) {
        revert TxCommitmentMismatch();
    }
    
    // Now verify ZK proof
    _verifyZKProofInternal(pA, pB, pC, publicSignals);
    
    // Execute transaction
    nonce++;
    (bool success, ) = to.call{value: value}(data);
}
```

### Why BN254 Field Modulo?

```solidity
// BN254 is the elliptic curve used by Groth16
uint256 public constant FIELD_PRIME = 
    21888242871839275222246405745257275088548364400416034343698204186575808495617;

// Reduce commitment to field element
uint256 commitment = uint256(keccak256(...)) % FIELD_PRIME;
```

**Reason:** ZK circuits operate in finite fields. The commitment must be a valid field element to be included in the proof.

---

## Attack Scenarios & Protections

### Attack 1: Compromised Private Key 🔴

**Scenario:**
```
Attacker steals seed phrase → Controls owner EOA → Tries to drain wallet
```

**Protection:**
```solidity
// Old vulnerable approach (NOT our implementation):
function execute(address to, uint256 value, bytes calldata data) 
    external onlyOwner {
    // ❌ Just checks msg.sender == owner
    // Attacker with private key can drain wallet!
}

// Our secure approach:
function executeWithProof(
    address to,
    uint256 value,
    bytes calldata data,
    uint[2] calldata pA,    // Requires ZK proof
    uint[2][2] calldata pB,
    uint[2] calldata pC,
    uint[4] calldata publicSignals
) external onlyOwner {
    // ✅ Must provide valid ZK proof
    // ✅ Proof requires TOTP secret
    // ✅ Attacker doesn't have TOTP secret
}
```

**Result:** ✅ Attack FAILS. Transaction reverts without valid TOTP proof.

---

### Attack 2: Proof Interception & Reuse 🔴

**Scenario:**
```
Attacker monitors mempool → Sees legitimate proof → Tries to reuse for different transaction
```

**Attempt 1: Change Transaction Parameters**
```solidity
// Original transaction
executeWithProof(
    to: 0xAlice,
    value: 1 ETH,
    data: 0x,
    proof: [pA, pB, pC, publicSignals] // Contains commitment to 0xAlice + 1 ETH
)

// Attacker tries to change destination
executeWithProof(
    to: 0xAttacker, // ← Changed
    value: 1 ETH,
    data: 0x,
    proof: [pA, pB, pC, publicSignals] // Same proof
)

// Contract calculates: 
expected = hash(0xAttacker, 1 ETH, 0x, nonce)
actual = publicSignals[3] // Contains hash(0xAlice, 1 ETH, 0x, nonce)

// expected != actual → revert TxCommitmentMismatch()
```

**Result:** ✅ Attack FAILS. Commitment mismatch detected.

**Attempt 2: Replay Exact Transaction**
```solidity
// Wait for original transaction to mine
// Try to submit again with same proof

executeWithProof(
    to: 0xAlice,      // Same
    value: 1 ETH,     // Same
    data: 0x,         // Same
    proof: [...] // Same proof, same timeCounter
)

// Contract checks:
if (timeCounter <= lastUsedTimeCounter) {
    revert TimeCounterAlreadyUsed();
}
```

**Result:** ✅ Attack FAILS. Time counter already used.

---

### Attack 3: Front-Running 🔴

**Scenario:**
```
Attacker sees transaction in mempool → Submits with higher gas → Tries to execute first
```

**Attempt:**
```solidity
// Legitimate transaction in mempool
executeWithProof(to: 0xAlice, value: 1 ETH, ..., proof)

// Attacker front-runs with higher gas
executeWithProof(to: 0xAttacker, value: 1 ETH, ..., proof)
```

**Protection:**
- Transaction commitment binding prevents changing parameters
- Even if front-run, attacker cannot modify destination
- Legitimate transaction will still execute correctly
- Attacker wastes gas on failed transaction

**Result:** ✅ Attack FAILS. Cannot change committed parameters.

---

### Attack 4: Replay Attack (Old Proof) 🔴

**Scenario:**
```
Attacker saves old proof → Tries to use it days/weeks later
```

**Protection 1: Time Freshness**
```solidity
uint256 proofTime = timeCounter * 30;
uint256 currentTime = block.timestamp;

if (currentTime - proofTime > MAX_TIME_DIFFERENCE) {
    revert TimestampTooOld(); // Max 5 minutes
}
```

**Protection 2: One-Time Use**
```solidity
if (timeCounter <= lastUsedTimeCounter) {
    revert TimeCounterAlreadyUsed();
}
```

**Result:** ✅ Attack FAILS. Proof too old AND time counter already used.

---

### Attack 5: Proof Forgery 🔴

**Scenario:**
```
Attacker tries to create fake proof without knowing secret
```

**Why It Fails:**

1. **Zero-Knowledge Property**: Cannot derive secret from publicSignals
2. **Cryptographic Hardness**: Groth16 proofs are computationally infeasible to forge
3. **Secret Hash Verification**: Proof must match `ownerSecretHash` on-chain

```solidity
// Smart contract verification
if (publicSignals[2] != ownerSecretHash) {
    revert SecretHashMismatch();
}

// Groth16 verification (cryptographically secure)
bool valid = _verifier.verifyProof(pA, pB, pC, publicSignals);
```

**Result:** ✅ Attack FAILS. Cannot forge valid proof without secret.

---

### Attack 6: TOTP Code Brute Force 🔴

**Scenario:**
```
Attacker tries to guess TOTP code (6 digits = 1,000,000 combinations)
```

**Protection:**

1. **Must also know secret**: Cannot generate valid proof with just TOTP code
2. **Time window**: Only 30 seconds per code
3. **One attempt per timeCounter**: Contract tracks used time counters
4. **Circuit verification**: Must prove `Poseidon(secret, timeCounter) % 1000000 === totpCode`

**Result:** ✅ Attack FAILS. Requires secret to generate valid proof.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Device Separation                              │
│ • Transaction device has NO secret                      │
│ • Authenticator device generates proofs offline         │
│ • QR-based air-gapped communication                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Transaction Commitment Binding                 │
│ • Proof cryptographically bound to tx parameters        │
│ • Cannot change destination, amount, or data            │
│ • Calculated: hash(to, value, data, nonce) % FIELD     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Zero-Knowledge Proof                           │
│ • Proves secret knowledge without revealing it          │
│ • Groth16: ~128-bit security                            │
│ • Verifies: Poseidon(secret, time) % 1M = code         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Time-Based Freshness                           │
│ • Proofs valid for 5 minutes                            │
│ • TOTP changes every 30 seconds                         │
│ • Old proofs automatically rejected                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 5: One-Time Use Protection                        │
│ • Each timeCounter can only be used ONCE               │
│ • Contract tracks lastUsedTimeCounter                   │
│ • Prevents replay within freshness window               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 6: Nonce-Based Ordering                           │
│ • Sequential transaction execution                       │
│ • Nonce part of commitment calculation                  │
│ • Cannot skip or reorder transactions                   │
└─────────────────────────────────────────────────────────┘
```

---

## Replay Attack Prevention

### The Challenge

Within the 5-minute freshness window, there are 10 potential TOTP time windows (30 seconds each). Without additional protection, a captured proof could potentially be replayed.

### The Solution: One-Time Use Enforcement

```solidity
contract TOTPWallet {
    // Track the last used time counter
    uint256 public lastUsedTimeCounter;
    
    function _verifyZKProofInternal(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata publicSignals
    ) internal returns (bool) {
        uint256 timeCounter = publicSignals[1];
        
        // 1. Check time counter hasn't been used
        if (timeCounter <= lastUsedTimeCounter) {
            revert TimeCounterAlreadyUsed();
        }
        
        // 2. Verify ZK proof
        bool valid = _verifier.verifyProof(pA, pB, pC, publicSignals);
        
        // 3. Mark time counter as used
        if (valid) {
            lastUsedTimeCounter = timeCounter;
        }
        
        return valid;
    }
}
```

### How It Works

**Scenario:** Attacker intercepts proof in mempool

```
Time: 12:00:00 → timeCounter = 43200
User generates proof for timeCounter 43200
Attacker sees proof in mempool

Option 1: Front-run with same proof
→ Contract: timeCounter 43200 > lastUsedTimeCounter (0)
→ Proof verifies, transaction executes
→ lastUsedTimeCounter = 43200
→ User's transaction: timeCounter 43200 <= lastUsedTimeCounter (43200)
→ Reverts with TimeCounterAlreadyUsed

Option 2: Try to replay after user's transaction
→ Contract: timeCounter 43200 <= lastUsedTimeCounter (43200)
→ Reverts immediately
```

**Result:** First transaction using each timeCounter succeeds, all subsequent attempts fail.

### Timeline Example

```
12:00:00 | timeCounter: 43200 | User generates proof
12:00:05 | timeCounter: 43200 | User submits (✓ Success)
         | lastUsedTimeCounter = 43200
12:00:10 | timeCounter: 43200 | Attacker tries same proof (✗ Fails)
12:00:30 | timeCounter: 43201 | New time window begins
12:00:35 | timeCounter: 43201 | User generates new proof (✓ Success)
         | lastUsedTimeCounter = 43201
12:01:00 | timeCounter: 43202 | New time window begins
```

### Security Properties

✅ **Immediate Protection**: Proof becomes useless after first use  
✅ **No Grace Period**: No time window where replay is possible  
✅ **Strictly Increasing**: Must use monotonically increasing timeCounters  
✅ **Front-Run Resistant**: First transaction wins, others fail  
✅ **Simple Implementation**: Single state variable tracks protection  

---

## Best Practices

### For Users

1. **Protect Your TOTP Secret**
   - Store on secure authenticator device
   - Never share or upload online
   - Use hardware authenticators when possible

2. **Verify Transaction Details**
   - Check destination address on authenticator device
   - Verify amount before generating proof
   - Review data if calling contracts

3. **Use Separate Devices**
   - Transaction device for browsing/preparing
   - Authenticator device for proof generation
   - Keep authenticator offline when possible

4. **Monitor Wallet Activity**
   - Check transaction history regularly
   - Verify timeCounter increases correctly
   - Report any suspicious activity

### For Developers

1. **Always Include Transaction Commitment**
   - Never generate proofs without commitment
   - Verify commitment matches in contract
   - Use consistent hashing (keccak256)

2. **Implement Time Checks**
   - Enforce 5-minute freshness window
   - Check timeCounter strictly increases
   - Validate timestamp against block.timestamp

3. **Secure Circuit Implementation**
   - Use Poseidon for ZK-friendly hashing
   - Include all necessary constraints
   - Audit circuit logic thoroughly

4. **Test Attack Scenarios**
   - Test replay attempts
   - Test parameter tampering
   - Test front-running scenarios
   - Test time window edge cases

---

## Audit Considerations

### Critical Components to Review

1. **Circuit Logic** (`totp_verifier.circom`)
   - Poseidon hash implementation
   - TOTP code calculation
   - Transaction commitment handling
   - Constraint completeness

2. **Smart Contract** (`TOTPWallet.sol`)
   - Commitment calculation correctness
   - Time validation logic
   - One-time use enforcement
   - Re-entrancy protection

3. **Frontend Proof Generation** (`zk-proof.ts`)
   - Commitment calculation matches contract
   - Proper field reduction (% FIELD_PRIME)
   - Secure random number generation
   - Input validation

4. **QR Code Security**
   - No secret leakage in QR codes
   - Proper transaction binding
   - Multi-part proof integrity

### Testing Requirements

- [ ] Unit tests for all security functions
- [ ] Integration tests for end-to-end flow
- [ ] Fuzz testing for edge cases
- [ ] Gas optimization without security compromise
- [ ] Multi-device testing scenarios
- [ ] Time-based replay attack tests

---

## Comparison with Other Approaches

### vs. Pre-Computed Merkle Trees (1wallet, SmartOTP)

**Their Approach:**
```
❌ Pre-compute all future TOTP codes
❌ Hash into Merkle tree at wallet creation
❌ Limited lifespan (tree exhaustion)
❌ Vulnerable to brute-force if client compromised
❌ No transaction binding
```

**Our Approach:**
```
✅ On-demand TOTP calculation
✅ Zero-knowledge proofs
✅ Unlimited lifespan
✅ Transaction-bound proofs
✅ No pre-computed data to compromise
```

### vs. Multi-Sig Wallets

**Multi-Sig:**
```
• Requires multiple parties
• Complex coordination
• No privacy (all signers visible)
• High gas costs
```

**ChronoVault:**
```
• Single user with 2FA
• Simple UX with QR codes
• Privacy-preserving (ZK proofs)
• Moderate gas costs
```

### vs. Hardware Wallets

**Hardware Wallets:**
```
• Requires special device
• Limited programmability
• No 2FA beyond device itself
• Physical device can be lost
```

**ChronoVault:**
```
• Works with any authenticator app
• Fully programmable (smart contract)
• True 2FA (key + TOTP)
• Secret can be backed up securely
```

---

## Threat Response

### If Private Key Compromised

1. **Immediate:** Attacker cannot drain wallet (needs TOTP secret)
2. **Short-term:** Transfer wallet ownership to new key using TOTP proof
3. **Long-term:** Deploy new wallet with new keys

### If TOTP Secret Compromised

1. **Immediate:** Update `ownerSecretHash` using current proof
2. **Alternative:** Transfer funds to new wallet
3. **Prevention:** Use hardware authenticators

### If Both Compromised

1. **Immediate:** Funds at risk, transfer ASAP
2. **Mitigation:** Social recovery (future feature)
3. **Prevention:** Never store both on same device

---

## Future Security Enhancements

1. **Social Recovery**: ZK-based guardian recovery system
2. **Spending Limits**: Daily/weekly limits with different auth levels
3. **Biometric Integration**: Combine with device biometrics
4. **Hardware TOTP**: Support for hardware authenticators
5. **Multi-Factor**: Additional factors beyond TOTP
6. **Emergency Timelock**: Delay large transactions for review

---

## References

- [Groth16 Proofs](https://eprint.iacr.org/2016/260.pdf)
- [Poseidon Hash](https://eprint.iacr.org/2019/458.pdf)
- [RFC 6238 - TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [ERC-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [BN254 Elliptic Curve](https://neuromancer.sk/std/bn/bn254)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and implementation
- [ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md) - ELI5 guide to ZK-TOTP
- [../README.md](../README.md) - Project overview
