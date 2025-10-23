# 🚀 Quick Deployment Guide

## Step 1: Setup Environment Variables

Create `.env` file in `blockchain/` directory:

```bash
cd blockchain
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Get Sepolia ETH from: https://sepoliafaucet.com/
# Get RPC URL from: https://www.alchemy.com/ (free tier)
# Get private key from MetaMask (Account details → Show private key)

SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here_without_0x
```

## Step 2: Deploy to Sepolia

```bash
cd blockchain
pnpm deploy:sepolia
```

That's it! The script will:
- ✅ Deploy MockEntryPoint and TOTPVerifier
- ✅ Automatically update frontend contract addresses
- ✅ Save deployment info to `deployments/` directory

## Step 3: Test in Frontend

```bash
cd frontend
pnpm dev
```

Open http://localhost:3000 and:
1. Connect wallet (make sure you're on Sepolia)
2. Go to Dashboard
3. The "Deploy Wallet" tab will have addresses pre-filled!

## What Was Changed?

### Backend (Blockchain):
- ✅ `hardhat.config.ts` - Added dotenv support for Sepolia config
- ✅ `scripts/deploy.ts` - Automated deployment script
- ✅ `.env.example` - Template for environment variables
- ✅ `DEPLOYMENT.md` - Detailed deployment guide
- ✅ Added `deploy:sepolia` and `deploy:local` scripts to package.json

### Frontend:
- ✅ `src/lib/contract-addresses.ts` - Central config for deployed addresses
- ✅ `src/components/wallet-deployment.tsx` - Auto-fills addresses from config
- ✅ Addresses update automatically when you deploy

### Infrastructure:
- ✅ `.gitignore` - Ignores `.env` files and deployment records
- ✅ `blockchain/deployments/` - Stores deployment history

## Quick Commands Reference

```bash
# Deploy to Sepolia
cd blockchain && pnpm deploy:sepolia

# Deploy to local Hardhat (for testing)
cd blockchain && pnpm deploy:local

# Check current addresses in frontend
cat frontend/src/lib/contract-addresses.ts

# View deployment history
ls -l blockchain/deployments/
```

## Troubleshooting

**Error: insufficient funds**
→ Get Sepolia ETH from https://sepoliafaucet.com/

**Error: connection refused**
→ Check your SEPOLIA_RPC_URL in .env

**Error: invalid private key**
→ Make sure private key doesn't have `0x` prefix

**Addresses not showing in UI**
→ Check `frontend/src/lib/contract-addresses.ts` was updated

## Next Steps

After deployment, you can:
1. Test the full TOTP wallet flow
2. Verify contracts on Etherscan (see DEPLOYMENT.md)
3. Share the deployed addresses with your team

## Need Help?

See detailed documentation:
- `blockchain/DEPLOYMENT.md` - Full deployment guide
- `docs/END_TO_END_FLOW.md` - Complete system architecture
