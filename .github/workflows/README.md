# CI Pipeline Documentation 🚀

GitHub Actions pipeline that tests all workspaces on every push.

---

## What It Does

**5 Jobs:** Blockchain Tests → Circuits Build → Frontend Build → Integration → Summary

**Runtime:** ~3-4 minutes (with cache)

**Triggers:** Push or PR to `master` or `erc-4337-contracts` branches

---

## Jobs

### 1. Blockchain Tests (~15s)
- Compiles Solidity contracts
- Runs 35 tests
- Generates TypeScript types
- Validates TypeScript compilation

### 2. Circuits Build (~2-3min)
- Installs circom compiler
- Compiles ZK circuit (144 instances, 492 constraints)
- Generates proving/verification keys
- Tests proof generation
- Exports TOTPVerifier.sol

### 3. Frontend Build (~30-60s)
- Runs Biome linter
- Checks code formatting
- Builds Next.js production bundle

### 4. Integration Check (~2-3min)
- Runs full monorepo build
- Verifies all artifacts generated

### 5. Summary (always runs)
- Reports overall status
- Fails if any job fails

---

## Local Testing

Before pushing, run:

```bash
# Blockchain
cd blockchain && pnpm compile && pnpm test

# Circuits
cd circuits && pnpm run setup

# Frontend
cd frontend && pnpm lint && pnpm build

# Full build
cd .. && pnpm build
```

---

## Optimizations

- **Caching:** Powers of Tau (18MB) cached between runs
- **Parallel Jobs:** Blockchain, Circuits, Frontend run simultaneously
- **Frozen Lockfiles:** Reproducible builds
- **Clean Exits:** `CI=true` prevents test hanging

---

## Common Issues

**Tests hang in CI?**  
→ Ensure `CI=true` is set (already configured in workflow)

**Circuit build fails?**  
→ Check circom installation and Powers of Tau download

**Frontend lint errors?**  
→ Run `pnpm lint --write` locally to auto-fix

---

## Status

[![CI Pipeline](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml/badge.svg)](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml)

View runs: https://github.com/WhyAsh5114/ethonline-2025/actions

---

## Related Docs

- [Test Documentation](../../docs/TEST_DOCUMENTATION.md)
- [ZK TOTP Explanation](../../docs/ZK_TOTP_EXPLANATION.md)
