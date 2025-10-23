# Frontend Integration Guide

This document explains the integration of ZK proofs and smart contracts with the ChronoVault frontend.

## Overview

The frontend now includes full integration with:
- **TOTP Setup**: Generate and verify Time-based One-Time Passwords
- **ZK Proof Generation**: Create zero-knowledge proofs in the browser
- **Smart Wallet Deployment**: Deploy TOTPWallet contracts
- **Transaction Execution**: Execute transactions through the TOTP-protected wallet

## Architecture

### Core Components

#### 1. ZK Proof System (`src/lib/zk-proof.ts`)
- `generateZKProof()`: Generate proofs using snarkjs in the browser
- `verifyZKProof()`: Verify proofs locally
- `formatProofForSolidity()`: Convert proofs to Solidity-compatible format
- `calculateSecretHash()`: Hash TOTP secrets using Poseidon
- `calculateTOTPCode()`: Calculate TOTP codes using Poseidon hashing

#### 2. React Hooks

**`useZKProof` (`src/hooks/use-zk-proof.ts`)**
- Manages ZK proof generation and verification state
- Provides methods: `generateProof()`, `verifyProof()`, `clearProof()`
- Returns proof data in both raw and Solidity-compatible formats

**`useTOTPWallet` (`src/hooks/use-totp-wallet.ts`)**
- Interacts with TOTPWallet smart contracts
- Methods: `deployWallet()`, `verifyProof()`, `executeTransaction()`
- Manages wallet deployment and transaction execution

**`useTOTPSetup` (`src/hooks/use-totp-setup.ts`)**
- Handles TOTP secret generation and management
- Stores secrets in session storage
- Provides QR codes for authenticator apps

#### 3. UI Components

**`TOTPSetup` (`src/components/totp-setup.tsx`)**
- QR code display for authenticator apps
- Manual secret entry option
- Verification flow

**`WalletDeployment` (`src/components/wallet-deployment.tsx`)**
- Deploy new TOTPWallet contracts
- Input EntryPoint and Verifier addresses
- Display deployed wallet address

**`ProofVerification` (`src/components/proof-verification.tsx`)**
- Generate TOTP codes
- Create ZK proofs
- Verify proofs locally and on-chain

**`TransactionExecution` (`src/components/transaction-execution.tsx`)**
- Execute transactions through wallet
- Send ETH and call contract functions
- Support for custom calldata

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

This installs:
- `snarkjs`: ZK proof generation
- `circomlibjs`: Poseidon hashing
- All wagmi/viem dependencies for blockchain interactions

### 2. Circuit Files

The ZK circuit files must be accessible in the browser:

```
frontend/public/circuits/
├── totp_verifier.wasm       # Circuit WASM
├── totp_verifier_final.zkey # Proving key
└── verification_key.json    # Verification key
```

These files are copied from `circuits/build/` during the build process.

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## Usage Flow

### 1. Connect Wallet
```typescript
// User connects via WalletConnect, MetaMask, or Coinbase Wallet
// Handled by wagmi connectors in src/lib/wagmi.ts
```

### 2. Setup TOTP
```typescript
const { generateSecret, totpSecret } = useTOTPSetup();

// Generate secret
const secret = generateSecret(userAddress);

// Secret is numeric string: "12345678901234567890"
// SecretHash is calculated using Keccak256 (TODO: migrate to Poseidon)
```

### 3. Deploy Wallet
```typescript
const { deployWallet } = useTOTPWallet();

await deployWallet({
  entryPointAddress: "0x...", // ERC-4337 EntryPoint
  verifierAddress: "0x...",   // TOTPVerifier contract
  ownerAddress: userAddress,
  initialSecretHash: secretHash,
});
```

### 4. Generate Proof
```typescript
const { generateProof, solidityProof } = useZKProof();

// Get current TOTP code
const totpCode = generateTOTPCode(totpSecret);

// Generate proof (takes ~2-5 seconds in browser)
await generateProof(totpSecret, totpCode);

// solidityProof contains formatted proof for contract call
```

### 5. Verify Proof
```typescript
const { verifyProof } = useTOTPWallet();

// Verify on-chain
const isValid = await verifyProof(walletAddress, solidityProof);
```

### 6. Execute Transaction
```typescript
const { executeTransaction } = useTOTPWallet();

await executeTransaction({
  walletAddress,
  to: recipientAddress,
  value: parseEther("0.1"),
  data: "0x", // Optional calldata
});
```

## Technical Details

### ZK Proof Generation

The proof generation happens entirely in the browser using WebAssembly:

1. **Input Preparation**: Convert secret and TOTP code to field elements
2. **Witness Generation**: Execute WASM circuit with inputs
3. **Proof Creation**: Generate Groth16 proof using proving key
4. **Format Conversion**: Convert to Solidity-compatible format

**Performance**: ~2-5 seconds on modern browsers

### Circuit Files Size
- WASM: ~1.5 MB
- Proving Key (zkey): ~3.5 MB
- Verification Key: ~1 KB

These are loaded on-demand when generating proofs.

### Security Considerations

1. **Secret Storage**: TOTP secrets stored in session storage (cleared on browser close)
2. **ZK Properties**: Secret never leaves the browser or blockchain
3. **Proof Freshness**: Timestamps verified on-chain (5-minute window)
4. **Replay Protection**: Each timeCounter can only be used once (immediate expiration)
   - Contract tracks `lastUsedTimeCounter`
   - Only accepts strictly increasing time windows
   - Prevents proof reuse even within freshness window
5. **Nonce Protection**: Wallet contract includes transaction nonce for additional safety

## Smart Contract Integration

### Generated Types

Contract ABIs and types are generated in `blockchain/generated.ts`:

```typescript
import {
  totpWalletAbi,
  totpVerifierAbi,
  mockEntryPointAbi,
} from "blockchain/generated";
```

### Key Contract Functions

**TOTPWallet**
- `verifyZKProof(pA, pB, pC, publicSignals)`: Verify a proof
- `execute(to, value, data)`: Execute transaction
- `updateSecretHash(newHash)`: Rotate TOTP secret

**TOTPVerifier**
- `verifyProof(pA, pB, pC, publicSignals)`: Standalone verification

## Development

### Running Dev Server

```bash
cd frontend
pnpm dev
```

Starts Next.js dev server with Turbopack at http://localhost:3000

### Building for Production

```bash
pnpm build
```

This:
1. Compiles smart contracts
2. Generates TypeScript types
3. Builds Next.js app

### Linting and Formatting

```bash
pnpm lint   # Check code quality
pnpm format # Format code with Biome
```

## Troubleshooting

### "Cannot find module 'snarkjs'"
- Run `pnpm install` in the frontend directory
- Check that `snarkjs` is in package.json dependencies

### "Failed to load WASM file"
- Ensure circuit files are in `public/circuits/`
- Check browser console for 404 errors
- Verify file paths in proof generation code

### "Proof verification failed"
- Check TOTP code is current (30-second window)
- Verify secret hash matches wallet's stored hash
- Ensure timestamp is within 5-minute window

### "Transaction failed"
- Check wallet has sufficient ETH balance
- Verify EntryPoint has deposited funds
- Ensure proof was verified before transaction

## Next Steps

1. **Production Secrets**: Implement secure key management
2. **Poseidon Hash**: Migrate secret hashing to Poseidon for consistency
3. **Batch Proofs**: Support multiple proofs in single transaction
4. **Recovery Flow**: Implement social recovery with ZK proofs
5. **Mobile Support**: Optimize circuit loading for mobile browsers

## Resources

- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [wagmi Documentation](https://wagmi.sh)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Groth16 Proofs](https://eprint.iacr.org/2016/260.pdf)
