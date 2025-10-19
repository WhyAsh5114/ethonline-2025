# CI/CD Quick Reference 🚀

Quick commands to verify your code will pass CI before pushing.

---

## Pre-Push Checklist

Run these commands locally to ensure CI will pass:

### 1️⃣ Blockchain Tests
```bash
cd blockchain
pnpm install
pnpm compile      # Compile Solidity contracts
pnpm test         # Run 35 tests
pnpm generate     # Generate TypeScript types
pnpm exec tsc --noEmit  # Check TypeScript
```

**Expected output:**
```
✓ 35 passing (5-7 seconds)
```

---

### 2️⃣ Circuits Build
```bash
cd circuits
pnpm install

# Compile circuit
circom src/totp_verifier.circom --r1cs --wasm --sym --c -o build/

# Generate keys
pnpm run setup

# Test proof generation
pnpm tsx scripts/generate_proof.ts 12345 1729353600

# Check TypeScript
pnpm exec tsc --noEmit
```

**Expected output:**
```
✅ Circuit compiled successfully
✅ Proving key generated
✅ Verification key generated
✅ Proof generated and verified locally
```

---

### 3️⃣ Frontend Lint & Build
```bash
cd frontend
pnpm install
pnpm lint         # Biome linter
pnpm format       # Biome formatter
pnpm build        # Next.js production build
```

**Expected output:**
```
Checked X files in Yms. No errors found.
✓ Creating an optimized production build
```

---

### 4️⃣ Full Monorepo Build
```bash
# From project root
pnpm install
pnpm build        # Builds all workspaces
```

**Expected output:**
```
✅ Blockchain compiled
✅ Circuits built
✅ Frontend built
```

---

## Common Issues & Fixes

### ❌ "Tests hanging"
```bash
# Ensure CI environment variable is set
CI=true pnpm test
```

### ❌ "circom: command not found"
```bash
# Install circom
wget https://github.com/iden3/circom/releases/download/v2.2.1/circom-linux-amd64
chmod +x circom-linux-amd64
sudo mv circom-linux-amd64 ~/.local/bin/circom
```

### ❌ "Biome formatting errors"
```bash
cd frontend
pnpm format --write  # Auto-fix formatting
```

### ❌ "Type errors in blockchain"
```bash
cd blockchain
pnpm compile      # Regenerate artifacts
pnpm generate     # Regenerate types
```

### ❌ "Missing Powers of Tau"
```bash
cd circuits
mkdir -p build
wget -O build/powersOfTau28_hez_final_18.ptau \
  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_18.ptau
```

---

## CI Pipeline Status

View the pipeline: https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml

### Workflow runs on:
- ✅ Push to `master` branch
- ✅ Push to `erc-4337-contracts` branch
- ✅ Pull requests to those branches

---

## Running Individual CI Jobs Locally

### Simulate Blockchain Job
```bash
cd blockchain
pnpm install --frozen-lockfile
pnpm compile
CI=true pnpm test
pnpm generate
pnpm exec tsc --noEmit
```

### Simulate Circuits Job
```bash
cd circuits
pnpm install --frozen-lockfile
circom src/totp_verifier.circom --r1cs --wasm --sym --c -o build/
npx snarkjs r1cs info build/totp_verifier.r1cs
npx tsx scripts/setup.ts
npx tsx scripts/generate_proof.ts 12345 1729353600
pnpm exec tsc --noEmit
```

### Simulate Frontend Job
```bash
cd frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm exec biome check --write
NODE_ENV=production pnpm build
```

### Simulate Integration Job
```bash
# From root
pnpm install --frozen-lockfile
pnpm build
```

---

## Pipeline Timing

| Job | First Run | Cached |
|-----|-----------|--------|
| Blockchain | ~15s | ~10s |
| Circuits | ~3min | ~2min |
| Frontend | ~60s | ~30s |
| Integration | ~3min | ~2min |
| **Total** | **~5min** | **~3min** |

---

## Watch CI Status

```bash
# Install GitHub CLI
gh auth login

# Watch workflow runs
gh run watch

# View latest run
gh run view

# List recent runs
gh run list --workflow=ci.yml
```

---

## Troubleshooting CI Failures

### 1. Check Workflow Logs
```bash
gh run view --log
```

### 2. Download Artifacts (if configured)
```bash
gh run download <run-id>
```

### 3. Re-run Failed Jobs
```bash
gh run rerun <run-id> --failed
```

### 4. Debug Locally
```bash
# Install act (runs GitHub Actions locally)
brew install act  # macOS
# or
sudo apt install act  # Ubuntu

# Run workflow locally
act push
```

---

## Environment Variables

### Set in CI
```yaml
CI: true              # Ensures tests exit cleanly
NODE_ENV: production  # Production optimizations
```

### Optional Local
```bash
export CI=true
export NODE_ENV=production
```

---

## Related Documentation

- [CI Workflow](../.github/workflows/ci.yml) - Full workflow definition
- [CI README](../.github/workflows/README.md) - Detailed pipeline docs
- [Test Documentation](TEST_DOCUMENTATION.md) - Test suite guide
- [ZK Explanation](ZK_TOTP_EXPLANATION.md) - System architecture

---

**Quick tip:** Run `pnpm test` in blockchain/ before every commit to catch issues early! 🎯
