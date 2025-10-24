# ChronoVault Documentation

This directory contains comprehensive documentation for the ChronoVault TOTP Wallet project.

## 🔐 Security Documentation (IMPORTANT!)

- **[SECURITY_MODEL.md](./SECURITY_MODEL.md)** - **NEW!** Comprehensive security model including transaction commitment binding, attack prevention, and threat analysis
- **[ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md)** - ELI5 guide to how ZK-TOTP works (updated with new security features)

## Documentation Index

### 1. [ZK_TOTP_EXPLANATION.md](ZK_TOTP_EXPLANATION.md)
**Complete ELI5 Guide to Zero-Knowledge TOTP**

A comprehensive, step-by-step explanation of how the ZK-TOTP smart contract wallet works.

**Topics covered:**
- The Basic Problem & TOTP fundamentals
- Zero-Knowledge Proofs explained
- Components (Circuits, Poseidon, Keys)
- Proof generation & verification
- TOTPVerifier.sol breakdown
- Security analysis & real-world usage

**Best for:** Everyone - beginners to experts  
**Reading time:** ~45 minutes

---

### 2. [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md)
**Complete Test Suite Guide**

Detailed documentation for all 36 tests in the TOTPWallet contract.

**Topics covered:**
- Test setup & infrastructure
- 36 tests organized by category:
  - Deployment (4)
  - ZK Proof Verification (8) - **includes NEW replay protection test**
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
