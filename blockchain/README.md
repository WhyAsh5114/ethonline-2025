# Blockchain Package

This package contains the Hardhat smart contracts and TypeScript type generation for the ChronoVault monorepo.

## Setup

Install dependencies from the root of the monorepo:
```shell
pnpm install
```

## Development Workflow

### 1. Compile Contracts
```shell
pnpm compile
```

### 2. Generate TypeScript Types
After compiling, generate TypeScript types using wagmi-cli:
```shell
pnpm generate
```

Or run both in one command:
```shell
pnpm build
```

### 3. Run Tests
```shell
pnpm test
```

## Type Generation

This project uses `@wagmi/cli` to generate TypeScript types from compiled Hardhat contracts. The generated types are exported in `generated.ts` and can be imported in the frontend package:

```typescript
import { counterAbi, counterConfig } from 'blockchain/generated'
```

### Configuration

Type generation is configured in `wagmi.config.ts`. To add deployed contract addresses:

```typescript
export default defineConfig({
  out: 'generated.ts',
  contracts: [],
  plugins: [
    hardhat({
      project: '.',
      deployments: {
        Counter: {
          31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Local hardhat
          11155111: '0x...', // Sepolia testnet
        },
      },
    }),
  ],
})
```

## Usage in Frontend

The generated types provide full TypeScript type safety when interacting with contracts from the frontend:

```typescript
import { useReadContract, useWriteContract } from 'wagmi'
import { counterAbi } from 'blockchain/generated'

// Fully type-safe contract reads
const { data } = useReadContract({
  address: '0x...',
  abi: counterAbi,
  functionName: 'x', // Autocomplete and type-checked!
})

// Fully type-safe contract writes
const { writeContract } = useWriteContract()
writeContract({
  address: '0x...',
  abi: counterAbi,
  functionName: 'incBy', // Autocomplete and type-checked!
  args: [BigInt(5)], // Args are type-checked!
})
```

## Project Structure

```
blockchain/
├── contracts/          # Solidity contracts
├── test/              # Contract tests
├── ignition/          # Hardhat Ignition deployment modules
├── scripts/           # Deployment and utility scripts
├── generated.ts       # Generated TypeScript types (auto-generated)
├── wagmi.config.ts    # Wagmi CLI configuration
└── hardhat.config.ts  # Hardhat configuration
```

## Original Hardhat Documentation

This project was bootstrapped from Hardhat 3 Beta. For more details:
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
