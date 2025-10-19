# TOTP ZK Circuits

This directory contains the zero-knowledge circuits for TOTP verification using circom.

## Prerequisites

Install circom compiler:
```bash
# On Linux/Mac
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

## Structure

```
circuits/
├── src/              # Circuit source files
│   ├── totp_verifier.circom    # Main TOTP verification circuit
│   └── utils/                   # Helper circuits
├── test/             # Circuit tests
├── build/            # Compiled circuits (generated)
└── scripts/          # Helper scripts for proof generation
```

## Development

### Compile Circuits
```bash
pnpm compile
```

### Generate Proving/Verification Keys
```bash
pnpm setup
```

### Generate a Proof
```bash
pnpm gen-proof
```

### Generate Solidity Verifier
```bash
pnpm gen-verifier
```

## Circuit Design

### Public Inputs
- `totpCode`: The 6-digit TOTP code (0-999999)
- `timestamp`: Unix timestamp / 30 (time step counter)
- `secretHash`: Poseidon hash of the secret key

### Private Inputs
- `secret`: The TOTP secret key (up to 32 bytes)

### Verification Logic
1. Compute time-based counter from timestamp
2. Generate TOTP code using HMAC-SHA256
3. Verify computed code matches provided code
4. Verify hash of secret matches provided hash

## Security Considerations

- Secret key never leaves the prover
- Only the hash of the secret is public
- Timestamp freshness enforced by smart contract (5 min window)
- Standard TOTP algorithm (RFC 6238)
