# CI/CD Quick Reference 🚀

Quick commands to verify your code will pass CI before pushing.

---

## Pre-Push Checklist ✓

Run these locally to ensure CI passes:

### 1. Blockchain
```bash
cd blockchain
pnpm install
pnpm compile      # Compile Solidity
pnpm test         # 35 tests
pnpm generate     # Generate TypeScript types
```

**Expected:** ✓ 35 passing (~5-7 seconds)

---

### 2. Circuits
```bash
cd circuits
pnpm install

# Only if you modified circuits:
circom src/totp_verifier.circom --r1cs --wasm --sym --c -o build/
pnpm run setup

# Test proof generation:
pnpm tsx scripts/generate_proof.ts 12345 1729353600
```

**Expected:** ✅ Proof generated and verified

---

### 3. Frontend
```bash
cd frontend
pnpm install
pnpm lint         # Biome linter
pnpm format       # Biome formatter
pnpm build        # Production build
```

**Expected:** ✓ Build completes without errors

---

## Full CI Pipeline

The GitHub Actions CI runs:

```yaml
1. Blockchain:
   - Compile contracts
   - Run 35 tests
   - Generate types
   - TypeScript check

2. Circuits:
   - Compile circuit
   - Generate keys
   - Test proof generation
   - TypeScript check

3. Frontend:
   - Lint with Biome
   - Build production
   - TypeScript check
```

---

## Common Issues

### "Contract not found"
```bash
cd blockchain && pnpm compile
```

### "Circuit files missing"
```bash
cd circuits && pnpm run setup
```

### "Type errors"
```bash
cd blockchain && pnpm generate  # Regenerate types
```

### "Biome errors"
```bash
cd frontend && pnpm format  # Auto-fix
```

---

## Quick Test Everything

```bash
# From project root:
pnpm build        # Builds blockchain + frontend
pnpm test         # Runs blockchain tests

# Manual circuit test:
cd circuits && pnpm tsx scripts/generate_proof.ts 12345 1729353600
```

---

## CI Badge

[![CI Pipeline](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml/badge.svg)](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml)

View full CI runs: [GitHub Actions](https://github.com/WhyAsh5114/ethonline-2025/actions)
