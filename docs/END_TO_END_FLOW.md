# End-to-End TOTP + ZK Proof Flow

## Overview

This document explains how the TOTP and ZK proof systems work together end-to-end in ChronoVault.

## Dual TOTP System

ChronoVault uses **two parallel TOTP systems**:

### 1. Standard TOTP (User-Facing)
- **Purpose**: User convenience and verification during setup
- **Algorithm**: SHA-1 based (RFC 6238)
- **Secret Format**: Base32 string
- **Compatible With**: Google Authenticator, Authy, 1Password, etc.
- **Used For**: QR code generation, initial verification

### 2. Poseidon TOTP (ZK Circuit)
- **Purpose**: Zero-knowledge proof generation
- **Algorithm**: Poseidon hash (ZK-friendly)
- **Secret Format**: 20-digit numeric string
- **Compatible With**: Our custom ZK circuit
- **Used For**: Generating proofs for on-chain verification

## Why Two Systems?

**User Experience**: Users expect to use familiar authenticator apps (Google Authenticator, Authy, etc.), which use standard SHA-1 TOTP.

**ZK Efficiency**: SHA-1 is extremely expensive in ZK circuits (requires ~40,000+ constraints). Poseidon hash is designed for ZK circuits and only needs ~150 constraints.

**Solution**: Generate both types of secrets, use the appropriate one for each context.

## Complete User Flow

### Step 1: TOTP Setup

```typescript
// 1. Generate secrets
const { secret, otpAuthSecret, secretHash, uri } = await generateTOTPSecret(userAddress);

// secret: "12345678901234567890" (numeric, for ZK)
// otpAuthSecret: "GEZDGNBVGY3TQOJQ" (Base32, for authenticator apps)
// secretHash: Poseidon(secret) (for on-chain storage)
// uri: "otpauth://totp/..." (for QR code)
```

**What happens:**
- User scans QR code with authenticator app
- Authenticator generates SHA-1 based TOTP codes
- User enters code to verify setup
- Frontend verifies using `otpAuthSecret`
- Numeric `secret` and `secretHash` stored for later ZK proof generation

### Step 2: Wallet Deployment

```typescript
// Deploy wallet with Poseidon-based secret hash
await deployWallet({
  entryPointAddress,
  verifierAddress,
  ownerAddress,
  initialSecretHash, // Poseidon(secret)
});
```

**On-chain state:**
- `TOTPWallet.ownerSecretHash = Poseidon(secret)`
- This will be used to verify ZK proofs

### Step 3: Generate ZK Proof

```typescript
// 1. Calculate Poseidon-based TOTP code
const timestamp = Math.floor(Date.now() / 1000);
const timeCounter = BigInt(Math.floor(timestamp / 30));
const totpCode = Poseidon(secret, timeCounter) % 1000000;

// 2. Generate ZK proof
const proof = await generateZKProof(secret, totpCode.toString(), timestamp);

// Proof proves:
// - I know the secret
// - Poseidon(secret) == secretHash (public)
// - Poseidon(secret, timeCounter) % 1000000 == totpCode (public)
```

**What the circuit verifies:**
```circom
// Step 1: Verify secret hash
Poseidon(secret) === secretHash

// Step 2: Generate TOTP code
totpHash = Poseidon(secret, timeCounter)
totpCodeComputed = totpHash % 1000000

// Step 3: Verify TOTP code
totpCode === totpCodeComputed
```

### Step 4: Verify Proof On-Chain

```typescript
// Submit proof to wallet contract
await walletContract.verifyZKProof(pA, pB, pC, publicSignals);

// publicSignals = [totpCode, timeCounter, secretHash]
```

**On-chain verification:**
1. Check `publicSignals[2]` (secretHash) matches `wallet.ownerSecretHash`
2. Check timestamp freshness (within 5 minutes)
3. Verify Groth16 proof using TOTPVerifier contract
4. Emit `ZKProofVerified` event

### Step 5: Execute Transaction

```typescript
// After proof verification, execute transaction
await walletContract.execute(to, value, data);
```

## Key Technical Details

### Secret Generation

```typescript
// Numeric secret (for ZK)
const secret = Array.from({ length: 20 }, () => 
  Math.floor(Math.random() * 10)
).join("");
// Example: "82647195038462910574"

// Base32 secret (for authenticator apps)
const otpAuthSecret = OTPAuth.Secret().base32;
// Example: "GEZDGNBVGY3TQOJQ"
```

### Secret Hash Calculation

```typescript
// Using Poseidon (matches circuit)
const poseidon = await buildPoseidon();
const secretBigInt = BigInt(secret);
const secretHashField = poseidon([secretBigInt]);
const secretHash = BigInt(poseidon.F.toString(secretHashField));
```

### TOTP Code Calculation

**Standard (SHA-1):**
```typescript
const totp = new OTPAuth.TOTP({
  secret: OTPAuth.Secret.fromBase32(otpAuthSecret),
  algorithm: "SHA1",
  digits: 6,
  period: 30,
});
const code = totp.generate(); // e.g., "123456"
```

**Poseidon (for ZK):**
```typescript
const timeCounter = BigInt(Math.floor(timestamp / 30));
const totpHash = poseidon([secretBigInt, timeCounter]);
const totpCode = BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);
const code = totpCode.toString().padStart(6, "0"); // e.g., "654321"
```

**Important:** These codes are DIFFERENT! The authenticator app shows the SHA-1 code, but the ZK proof uses the Poseidon code.

## Testing the Flow

### Test 1: Verify Poseidon Calculation

```bash
cd frontend
pnpm exec tsx test-totp-poseidon.ts
```

This verifies that the frontend's Poseidon TOTP calculation is correct and consistent.

### Test 2: Generate Proof with Circuit

```bash
cd circuits
pnpm exec tsx scripts/generate_proof.ts <secret> <timestamp> <totpCode>
```

Example:
```bash
pnpm exec tsx scripts/generate_proof.ts 12345678901234567890 1729700000
```

This will:
1. Calculate `totpCode` using Poseidon
2. Generate ZK proof
3. Verify proof locally
4. Output Solidity calldata

### Test 3: End-to-End in Frontend

1. Start dev server: `pnpm dev`
2. Connect wallet
3. Setup TOTP (scan QR with authenticator)
4. Deploy wallet
5. Generate ZK proof (automatically uses Poseidon code)
6. Verify proof on-chain
7. Execute transaction

## Security Considerations

### Secret Storage

- **Numeric secret**: Stored in session storage during session
- **Base32 secret**: Stored in session storage during session
- **Secret hash**: Stored on-chain (public, but doesn't reveal secret)

### Proof Freshness & Replay Protection

**Time Window Validation:**
- Timestamps must be within 5 minutes of current time
- Prevents use of very old or future-dated proofs
- Enforced by smart contract `_checkTimestampFreshness()`

**One-Time Use Protection:**
- Each `timeCounter` (30-second window) can only be used ONCE
- Smart contract tracks `lastUsedTimeCounter` 
- New proofs must have strictly increasing timeCounters
- **Critical:** Even if a proof is intercepted, it becomes immediately useless after first use
- Prevents replay attacks within the 5-minute freshness window

**How It Works:**
```solidity
// Contract checks:
if (timeCounter <= lastUsedTimeCounter) revert TimeCounterAlreadyUsed();
// ... verify proof ...
lastUsedTimeCounter = timeCounter; // Mark as used
```

### Zero-Knowledge Property

The ZK proof reveals:
- ✅ The secret hash (public anyway)
- ✅ The TOTP code (changes every 30 seconds)
- ✅ The time counter (derived from timestamp)

The ZK proof DOES NOT reveal:
- ❌ The actual numeric secret
- ❌ Any information that allows deriving the secret

### Nonce Protection

- Each wallet has a nonce counter
- Prevents transaction replay attacks
- Independent of TOTP verification

## Troubleshooting

### "Invalid TOTP code" during setup

**Cause**: Using Poseidon code instead of SHA-1 code

**Solution**: Ensure `verifyTOTPCode` uses `otpAuthSecret` (Base32) not `secret` (numeric)

### "Proof verification failed"

**Possible causes:**
1. Using SHA-1 code instead of Poseidon code for proof
2. Timestamp too old (>5 minutes)
3. Secret hash mismatch
4. Circuit files not loaded

**Solution**: 
- Proof generation automatically calculates Poseidon code
- Check timestamp is current
- Verify secretHash matches on-chain value

### "Secret hash mismatch"

**Cause**: On-chain hash doesn't match proof's hash

**Solution**: Ensure the same numeric secret is used for both wallet deployment and proof generation

## Performance Metrics

- **Proof Generation**: ~2-5 seconds in browser
- **Proof Verification (on-chain)**: ~250,000 gas
- **TOTP Calculation**: <1ms (both algorithms)
- **Circuit Constraints**: ~1,200 (Poseidon) vs ~40,000 (SHA-1)

## Future Improvements

1. **Single TOTP System**: Research ZK-friendly algorithms compatible with standard authenticators
2. **Batched Proofs**: Generate multiple proofs for offline signing
3. **Recovery Flow**: Social recovery with ZK proofs
4. **Hardware Wallets**: Integration with hardware-based TOTP
5. **Mobile Optimization**: Optimize circuit loading for mobile browsers

## References

- [RFC 6238 - TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [Poseidon Hash](https://eprint.iacr.org/2019/458.pdf)
- [Groth16 Proofs](https://eprint.iacr.org/2016/260.pdf)
- [ERC-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
