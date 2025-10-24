# ChronoVault Documentation

This directory contains comprehensive documentation for the ChronoVault TOTP Wallet project.

## 🔐 Security Documentation (IMPORTANT!)

- **[SECURITY_MODEL.md](./SECURITY_MODEL.md)** - Comprehensive security model including transaction commitment binding, attack prevention, and threat analysis
- **[ZK_TOTP_EXPLANATION.md](./ZK_TOTP_EXPLANATION.md)** - ELI5 guide to how ZK-TOTP works (updated with new security features)
- **[QR_IMPLEMENTATION.md](./QR_IMPLEMENTATION.md)** - **NEW!** Multi-part QR code system for two-device authentication flow

## Documentation Index

### 1. [QR_IMPLEMENTATION.md](QR_IMPLEMENTATION.md) **✨ NEW!**
**Multi-Part QR Code Authentication System**

Complete guide to the two-device QR-based authentication flow with multi-part proof transfer.

**Topics covered:**
- Two-device architecture (transaction device ↔ authenticator device)
- Multi-part QR code system (3-part proof splitting)
- Auto-cycling QR display with visual indicators
- Multi-part scanner with progress tracking
- Auto-fill TOTP and immediate code generation
- QR scanner library selection (@yudiel/react-qr-scanner)
- Security guarantees and benefits

**Best for:** Frontend developers, UI/UX designers, security architects  
**Reading time:** ~15 minutes  
**Status:** ✅ FULLY OPERATIONAL - End-to-end tested and working

---

### 2. [ZK_TOTP_EXPLANATION.md](ZK_TOTP_EXPLANATION.md)
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
