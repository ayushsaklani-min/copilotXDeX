# TikTakDex Deployment Guide

## 🚀 Quick Setup Commands

### 1. Environment Setup
```bash
# Create .env file with your configuration
echo "RPC_URL=https://rpc-amoy.polygon.technology/" > .env
echo "PRIVATE_KEY=<your_private_key>" >> .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Deploy to Polygon Amoy
```bash
npm run deploy:amoy
```

### 5. Start DEX Application
```bash
npm run start:dex
```

## 📋 What Happens During Deployment

1. **Contract Compilation**: Solidity contracts are compiled and optimized
2. **Network Connection**: Connects to Polygon Amoy testnet
3. **Contract Deployment**: Deploys TikTakDex and TikTakLP contracts
4. **Token Configuration**: Adds TIK, TAK, TOE tokens as supported
5. **Pair Creation**: Creates TIK-TAK, TIK-TOE, TAK-TOE trading pairs
6. **Configuration Generation**: Writes contract addresses and ABIs to `src/config/contracts.json`
7. **Deployment Report**: Generates `deploy-report.json` with deployment details

## 🔍 Verification

After deployment, you can verify the contracts:

```bash
# Verify main DEX contract
npx hardhat verify --network amoy <DEX_ADDRESS>

# Check deployment report
cat deploy-report.json
```

## 🎯 Next Steps

1. **Add Initial Liquidity**: Fund the pools with initial liquidity
2. **Test Swaps**: Execute test transactions
3. **Monitor Activity**: Use analytics dashboard
4. **Share with Community**: Deploy frontend to production

## ⚠️ Important Notes

- **Testnet Only**: This is deployed on Polygon Amoy testnet
- **No Real Money**: All tokens are test tokens
- **Gas Fees**: You need MATIC for gas (get from faucet)
- **Private Key**: Never commit your private key to version control

## 🆘 Troubleshooting

**Deployment Fails**
- Check RPC URL is correct
- Ensure private key has MATIC for gas
- Verify network connection

**Frontend Not Loading**
- Check contract addresses in `src/config/contracts.json`
- Verify network is Polygon Amoy
- Clear browser cache

**Transactions Failing**
- Check token approvals
- Verify sufficient balance
- Check slippage settings

---

**🎉 DEX deployed and front-end connected!**

Your TikTakDex is now live on Polygon Amoy testnet. Visit `/dex` to start trading!
