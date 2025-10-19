# ChronoVault

[![CI Pipeline](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml/badge.svg)](https://github.com/WhyAsh5114/ethonline-2025/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](#)
[![Node.js](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-35%20passing-success?style=flat-square)](#)

A Web3 wallet with bank-grade security through TOTP-based two-factor authentication and zero-knowledge proofs.

[Overview](#overview) • [Features](#features) • [Getting Started](#getting-started) • [Architecture](#architecture) • [Development](#development) • [Deployment](#deployment)

---

## Overview

ChronoVault brings Web2-style security usability to Web3 self-custody wallets. By integrating Time-based One-Time Password (TOTP) two-factor authentication with zero-knowledge proofs (ZKPs), users get transaction-level 2FA without compromising privacy or decentralization.

Built on ERC-4337 account abstraction, ChronoVault requires users to prove possession of a valid TOTP code for every transaction—without ever exposing the secret on-chain. The system combines client-side ZK circuit proofs with smart contract validation to create a secure, privacy-preserving authentication layer that prevents unauthorized transactions while maintaining the self-custody principles of Web3.

### How It Works

1. **Client-Side Proof Generation**: The user's device generates a ZK proof demonstrating knowledge of a valid TOTP code for the current timestamp
2. **On-Chain Verification**: Smart contracts verify the proof's validity without accessing the TOTP secret
3. **Replay Attack Prevention**: Timestamp-based validation ensures each proof can only be used once
4. **Privacy-First**: TOTP secrets never leave the user's device or touch the blockchain

## Features

- **TOTP-Based 2FA**: Authy-like time-based one-time password authentication for every transaction
- **Zero-Knowledge Proofs**: Privacy-preserving verification that never exposes secrets on-chain
- **ERC-4337 Account Abstraction**: Native smart contract wallet support with programmable security policies
- **Replay Attack Protection**: Synchronized timestamp validation prevents proof reuse
- **Self-Custody**: Complete user control over keys and authentication secrets
- **Modern Stack**: Built with Next.js, Hardhat, Wagmi, and Viem for a seamless developer experience

## Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher ([Download](https://nodejs.org))
- **pnpm**: Fast, disk space efficient package manager
  ```bash
  npm install -g pnpm@10.18.0
  ```

### Quick Start

#### Option 1: GitHub Codespaces (Recommended)

Open this project directly in your browser with a fully configured environment:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Codespaces-Open-blue?style=flat-square&logo=github)](https://codespaces.new/WhyAsh5114/ethonline-2025)

#### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/WhyAsh5114/ethonline-2025.git
   cd ethonline-2025
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development**
   
   In separate terminal windows:
   
   ```bash
   # Terminal 1: Compile and watch blockchain contracts
   pnpm dev:blockchain
   
   # Terminal 2: Start the frontend development server
   pnpm dev:frontend
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture

ChronoVault follows a monorepo structure with two main packages:

```
ethonline-2025/
├── blockchain/          # Smart contracts and blockchain infrastructure
│   ├── contracts/       # Solidity smart contracts
│   ├── test/           # Contract test suites
│   ├── scripts/        # Deployment and utility scripts
│   └── generated.ts    # Auto-generated TypeScript types
│
├── frontend/           # Next.js web application
│   └── src/
│       ├── app/        # Next.js app router pages
│       ├── components/ # React components
│       ├── hooks/      # Custom React hooks
│       └── lib/        # Utilities and wagmi configuration
│
└── package.json        # Monorepo workspace configuration
```

### Technology Stack

**Smart Contracts**
- Solidity 0.8.28
- Hardhat for development and testing
- Viem for Ethereum interactions
- Wagmi CLI for TypeScript type generation

**Frontend**
- Next.js 15 with App Router and Turbopack
- React 19
- Wagmi v2 for Web3 interactions
- TanStack Query for state management
- Tailwind CSS for styling
- shadcn/ui for component library
- Biome for linting and formatting

## Development

### Blockchain Development

Navigate to the blockchain package:

```bash
cd blockchain
```

**Compile contracts**
```bash
pnpm compile
```

**Generate TypeScript types**
```bash
pnpm generate
```

**Run tests**
```bash
pnpm test
```

**Build (compile + generate)**
```bash
pnpm build
```

### Frontend Development

Navigate to the frontend package:

```bash
cd frontend
```

**Start dev server**
```bash
pnpm dev
```

**Build for production**
```bash
pnpm build
```

**Lint code**
```bash
pnpm lint
```

**Format code**
```bash
pnpm format
```

### Monorepo Commands

From the root directory, you can run:

```bash
# Build everything
pnpm build

# Compile and generate blockchain types
pnpm dev:blockchain

# Start frontend dev server
pnpm dev:frontend
```

## Deployment

### Smart Contracts

ChronoVault supports deployment to multiple networks:

- **Local Hardhat**: For testing and development
- **Sepolia Testnet**: For staging and testing
- **Optimism**: Production deployment (configured via Hardhat)

Configure your deployment by setting environment variables:

```bash
export SEPOLIA_RPC_URL="https://..."
export SEPOLIA_PRIVATE_KEY="0x..."
```

Deploy contracts:

```bash
cd blockchain
npx hardhat ignition deploy ./ignition/modules/Counter.ts --network sepolia
```

### Frontend Application

The frontend can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Self-hosted**

> [!NOTE]
> Before deploying the frontend, ensure you've built the blockchain package to generate the latest contract types.

## Project Structure Details

### Blockchain Package

The blockchain package uses Hardhat with the Viem toolbox for a modern Ethereum development experience:

- **Contracts**: Solidity smart contracts implementing account abstraction and TOTP verification
- **Type Generation**: Wagmi CLI automatically generates TypeScript types from compiled contracts
- **Testing**: Comprehensive test suites using Hardhat's testing framework
- **Network Configuration**: Supports local, testnet, and mainnet deployments

### Frontend Package

The frontend is a modern Next.js application:

- **App Router**: Uses Next.js 15's app directory for routing
- **Web3 Integration**: Wagmi hooks for seamless blockchain interactions
- **UI Components**: shadcn/ui components built on Radix UI primitives
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript coverage with generated contract types

## Contributing

Contributions are welcome! This project was developed for ETHOnline 2025.

## Resources

- [ERC-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [TOTP Algorithm (RFC 6238)](https://datatracker.ietf.org/doc/html/rfc6238)
- [Zero-Knowledge Proofs](https://ethereum.org/en/zero-knowledge-proofs/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Next.js Documentation](https://nextjs.org/docs)

## License

ISC
