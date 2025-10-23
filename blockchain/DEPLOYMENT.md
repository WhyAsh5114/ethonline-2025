# Sepolia Deployment Guide

## Prerequisites

1. **Sepolia ETH**: You need testnet ETH for deployment
   - Get free Sepolia ETH from: https://sepoliafaucet.com/
   - Or: https://www.alchemy.com/faucets/ethereum-sepolia

2. **RPC Endpoint**: Get a free RPC endpoint from:
   - Alchemy: https://www.alchemy.com/
   - Infura: https://infura.io/
   - Or use public RPC: `https://rpc.sepolia.org`

3. **Private Key**: Export from MetaMask
   - Click account → Account details → Show private key
   - ⚠️ NEVER commit this to git!

## Setup Environment Variables

1. Create `.env` file in the `blockchain/` directory:

```bash
cd blockchain
cp .env.example .env
```

2. Edit `.env` and add your values:

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

## Deploy Contracts

Deploy to Sepolia testnet:

```bash
cd blockchain
pnpm hardhat run scripts/deploy.ts --network sepolia
```

This will:
1. ✅ Deploy `MockEntryPoint` contract
2. ✅ Deploy `TOTPVerifier` contract
3. ✅ Automatically update `frontend/src/lib/contract-addresses.ts`
4. ✅ Save deployment info to `blockchain/deployments/`

## Expected Output

```
🚀 Deploying TOTP contracts...

📦 Deploying MockEntryPoint...
✅ MockEntryPoint deployed at: 0x1234...

📦 Deploying TOTPVerifier...
✅ TOTPVerifier deployed at: 0x5678...

📋 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network: sepolia (Chain ID: 11155111)
EntryPoint: 0x1234...
Verifier: 0x5678...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Updated frontend contract addresses

💾 Deployment info saved to: blockchain/deployments/sepolia-1234567890.json
```

## Verify Contracts (Optional)

If you want to verify on Etherscan, you'll need an Etherscan API key:

1. Get API key from: https://etherscan.io/myapikey

2. Add to `.env`:
```bash
ETHERSCAN_API_KEY=your_api_key_here
```

3. Verify contracts:
```bash
pnpm hardhat verify --network sepolia <DEPLOYED_ADDRESS>
```

## Frontend Configuration

After deployment, the frontend will automatically use the deployed addresses when you visit the "Deploy Wallet" tab. The script updates `frontend/src/lib/contract-addresses.ts` automatically.

You can verify the addresses were updated by checking:

```bash
cat ../frontend/src/lib/contract-addresses.ts
```

Should show:
```typescript
sepolia: {
  entryPoint: "0x1234...", // Your deployed address
  verifier: "0x5678...", // Your deployed address
},
```

## Troubleshooting

### "insufficient funds for intrinsic transaction cost"
- You need Sepolia ETH. Get from faucets listed above.

### "nonce too low" or "nonce too high"
- Reset account nonce in MetaMask: Settings → Advanced → Clear activity tab data

### "connection refused" or "timeout"
- Check your RPC URL is correct
- Try using public RPC: `https://rpc.sepolia.org`

### "invalid private key"
- Make sure private key is in `.env` without `0x` prefix
- Make sure no extra spaces or quotes

## Next Steps

After successful deployment:

1. ✅ Contracts are deployed to Sepolia
2. ✅ Frontend knows the addresses
3. ✅ You can test the full flow:
   - Connect wallet (make sure you're on Sepolia network)
   - Setup TOTP
   - Deploy wallet (addresses auto-filled)
   - Generate proof
   - Verify proof
   - Execute transaction

## Network Switching

To switch between networks in the frontend:

1. Make sure MetaMask is on the right network
2. The app uses wagmi's network detection
3. Addresses are configured in `contract-addresses.ts`

## Gas Costs (Estimated)

- MockEntryPoint: ~500,000 gas (~0.001 ETH on Sepolia)
- TOTPVerifier: ~3,000,000 gas (~0.006 ETH on Sepolia)
- **Total**: ~0.007 ETH on Sepolia

## View on Etherscan

After deployment, view your contracts:
- https://sepolia.etherscan.io/address/YOUR_ENTRYPOINT_ADDRESS
- https://sepolia.etherscan.io/address/YOUR_VERIFIER_ADDRESS
