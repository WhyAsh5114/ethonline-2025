# ChronoVault Documentation

Complete documentation for the ChronoVault ZK-TOTP Wallet with transaction-bound proofs and two-device authentication.

---

## � Core Documentation

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md) ⭐
**Complete Technical Architecture**

Everything you need to understand how ChronoVault works:
- System overview and architecture layers
- Core components (circuits, contracts, frontend)
- **Transaction-bound ZK proofs** (key innovation)
- **Two-device QR authentication flow**
- Multi-part QR code system
- Technical implementation details
- Data flow and performance metrics

**Best for:** Developers, architects, security researchers  
**Reading time:** ~30 minutes

---

### 2. [SECURITY.md](./SECURITY.md) 🛡️
**Security Model & Attack Prevention**

Comprehensive security analysis:
- Threat model and security goals
- Transaction commitment binding
- **Attack scenarios with detailed protections**
- Multi-layer security (6 layers)
- Replay attack prevention (one-time use)
- Best practices for users and developers
- Comparison with other approaches

**Best for:** Security auditors, developers, advanced users  
**Reading time:** ~25 minutes

---

### 3. [ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md) 🎓
**Complete ELI5 Guide**

Learn zero-knowledge TOTP from scratch:
- What is TOTP? (with examples)
- What are zero-knowledge proofs? (with analogies)
- How do the circuits work?
- **Transaction binding explained** (updated!)
- Proof generation step-by-step
- Smart contract verification process
- Security analysis for everyone

**Best for:** Everyone - beginners to experts  
**Reading time:** ~45 minutes

---

## 🎯 Quick Start Guide

**New to the project?** Follow this path:

1. **Start here:** [../README.md](../README.md) - Project overview
2. **Understand the tech:** [ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md) - ELI5 guide
3. **Learn the architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
4. **Security deep dive:** [SECURITY.md](./SECURITY.md) - Attack prevention

---

## 🔑 Key Concepts

### Transaction-Bound Proofs

Unlike traditional TOTP wallets that use Merkle trees, ChronoVault **cryptographically binds each proof to specific transaction parameters**:

```
Proof proves:
✓ I know the TOTP secret
✓ I generated the correct code for this time
✓ I authorize THIS EXACT transaction (to, value, data, nonce)
```

**Result:** Intercepted proofs cannot be reused for different transactions.

See [ARCHITECTURE.md#transaction-bound-zk-proofs](./ARCHITECTURE.md#transaction-bound-zk-proofs) for details.

### Two-Device Authentication

True 2FA with proper device separation:

```
Transaction Device              Authenticator Device
• Prepares transaction          • Has TOTP secret
• NO secret stored              • Generates proofs
• Submits to blockchain         • Works offline
```

QR codes transfer data between devices with **multi-part splitting** for reliability.

See [ARCHITECTURE.md#two-device-qr-authentication](./ARCHITECTURE.md#two-device-qr-authentication) for the complete flow.

### Multi-Layer Security

```
1. Device Separation (QR-based air gap)
2. Transaction Commitment Binding (cryptographic)
3. Zero-Knowledge Proofs (Groth16)
4. Time-Based Freshness (5-minute window)
5. One-Time Use Protection (no replay)
6. Nonce-Based Ordering (sequential)
```

See [SECURITY.md#security-layers](./SECURITY.md#security-layers) for detailed analysis.

---

## 📖 Additional Resources

### Component Documentation

- [blockchain/README.md](../blockchain/README.md) - Smart contracts
- [circuits/README.md](../circuits/README.md) - ZK circuits
- [frontend/README.md](../frontend/README.md) - Web application

### Testing

- [blockchain/test/](../blockchain/test/) - Smart contract tests (35 tests)
- [frontend/e2e/](../frontend/e2e/) - End-to-end tests with Playwright

### Deployment

- [blockchain/DEPLOYMENT.md](../blockchain/DEPLOYMENT.md) - Contract deployment guide
- [DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md) - Quick deployment steps

---

## 🚀 Development Workflow

### 1. Setup
```bash
# Install dependencies
pnpm install

# Compile circuits (optional - pre-built included)
cd circuits && pnpm run setup
```

### 2. Development
```bash
# Terminal 1: Blockchain
pnpm dev:blockchain

# Terminal 2: Frontend
pnpm dev:frontend
```

### 3. Testing
```bash
# Blockchain tests
cd blockchain && pnpm test

# Frontend E2E tests
cd frontend && pnpm test:e2e
```

---

## 🔍 Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js 15)                   │
│  • Two-Device QR Flow                                    │
│  • Multi-Part QR Codes                                   │
│  • ZK Proof Generation (Browser)                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              ZK Circuits (Circom + Groth16)              │
│  • TOTP Verification                                     │
│  • Transaction Commitment Binding                        │
│  • Poseidon Hash (ZK-friendly)                           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         Smart Contracts (Solidity + ERC-4337)            │
│  • TOTPWallet (Account Abstraction)                      │
│  • TOTPVerifier (Proof Verification)                     │
│  • Transaction Execution                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Why ChronoVault is Different

### vs. Traditional TOTP Wallets (1wallet, SmartOTP)

**They use:**
- ❌ Pre-computed Merkle trees (limited lifespan)
- ❌ No transaction binding
- ❌ Vulnerable to brute-force if client compromised

**We use:**
- ✅ On-demand ZK proofs (unlimited lifespan)
- ✅ Transaction-bound proofs (parameter tampering impossible)
- ✅ True zero-knowledge privacy

### Key Innovations

1. **Transaction Commitment Binding**: Proofs are cryptographically bound to exact transaction parameters
2. **On-Demand TOTP**: Implements RFC 6238 in ZK circuits (no pre-computation)
3. **Multi-Part QR**: Reliable proof transfer on low-quality cameras
4. **One-Time Use**: Each time window can only be used once (replay protection)

See [SECURITY.md#comparison-with-other-approaches](./SECURITY.md#comparison-with-other-approaches) for detailed comparison.

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Circuit Constraints | ~1,200 (vs ~40,000 for SHA-1) |
| Proof Generation | 2-5 seconds (browser) |
| Proof Verification | ~250,000 gas |
| QR Code Parts | 3 (auto-cycling) |
| Time Window | 30 seconds |
| Proof Freshness | 5 minutes |
| Time Counter Reuse | Never (one-time use) |

---

## 🤝 Contributing

Found an issue? Want to improve documentation?

1. Check existing issues
2. Open a new issue with details
3. Submit pull request with fixes

---

## 📝 License

ISC License - See [../LICENSE](../LICENSE) for details

---

## 🔗 Links

- **GitHub**: [WhyAsh5114/ethonline-2025](https://github.com/WhyAsh5114/ethonline-2025)
- **CI Status**: [![CI Pipeline](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml/badge.svg)](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml)


### 3. [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md)
**Complete Test Suite Guide**

Detailed documentation for all 36 tests in the TOTPWallet contract.

**Topics covered:**
- Test setup & infrastructure
- 36 tests organized by category:
  - Deployment (4)
  - ZK Proof Verification (8) - includes replay protection test
  - Timestamp Freshness (4)
  - Transaction Execution (4)
  - Batch Execution (4)
  - Ownership Transfer (4)
  - EntryPoint Integration (5)
  - UserOp Validation (3)
- Testing patterns & best practices

**Best for:** Developers  
**Reading time:** ~30 minutes

---

### 4. [END_TO_END_FLOW.md](END_TO_END_FLOW.md)
**Complete User Flow Guide**

Step-by-step guide through the entire ChronoVault user experience, including the two-device QR authentication flow.

**Topics covered:**
- Dual TOTP system (SHA-1 + Poseidon)
- Secret generation and management
- Two-device QR flow (transaction → authenticator → transaction)
- Testing procedures
- Security considerations
- Troubleshooting common issues

**Best for:** Developers, QA engineers  
**Reading time:** ~20 minutes

---

### 5. [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)
**Frontend Integration Summary**

Overview of the frontend implementation including all components, hooks, and user flows.

**Topics covered:**
- Component architecture
- React hooks for ZK proofs and wallet operations
- Two-device user flow diagrams
- Technical highlights
- Testing checklist
- Known limitations and future improvements

**Best for:** Frontend developers  
**Reading time:** ~15 minutes

---

## 🗺️ Quick Navigation

**Understand how it works** → [ZK_TOTP_EXPLANATION.md](ZK_TOTP_EXPLANATION.md)

**Understand the tests** → [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md)

**CI/CD info** → [../.github/workflows/README.md](../.github/workflows/README.md)

**Get started** → [../README.md](../README.md)

---

##  External Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Viem Documentation](https://viem.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
