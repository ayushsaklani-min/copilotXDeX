# TikTakDex - Full-Featured DEX on Polygon Amoy 🚀

A complete Uniswap V2-style Automated Market Maker (AMM) decentralized exchange built for the TIK-TAK-TOE token ecosystem on Polygon Amoy testnet.

## 🌟 Features

### Core DEX Functionality
- **Multi-Pair AMM**: Support for TIK-TAK, TIK-TOE, and TAK-TOE trading pairs
- **Liquidity Management**: Add/remove liquidity with LP token rewards
- **Token Swapping**: Real-time price calculations with slippage protection
- **Fee Distribution**: 0.3% trading fees (0.25% to LPs, 0.05% to protocol)

### Advanced Features
- **Real-time Analytics**: Trading volume, TVL, and pool statistics
- **Price Impact Calculation**: Transparent pricing with impact warnings
- **Slippage Protection**: Configurable slippage tolerance (0.1%, 0.5%, 1%)
- **Transaction Simulation**: Preview transactions before execution
- **Responsive Design**: Mobile-first UI with dark theme

### Smart Contract Features
- **Safe Math Operations**: Solidity 0.8.19 with built-in overflow protection
- **Event Logging**: Comprehensive event emission for tracking
- **Gas Optimization**: Efficient contract design for minimal gas usage
- **Multi-token Support**: Extensible architecture for additional tokens

## 🏗️ Architecture

### Smart Contracts
```
contracts/
├── TikTakDex.sol          # Main AMM contract
├── TikTakLP.sol           # LP token contract
└── MockERC20.sol         # Test token contract
```

### Frontend Structure
```
src/
├── app/dex/               # DEX application
│   ├── page.tsx          # Main DEX page
│   └── components/       # DEX components
│       ├── SwapForm.tsx
│       ├── LiquidityForm.tsx
│       └── PoolAnalytics.tsx
├── hooks/                # Custom React hooks
│   ├── useDex.ts
│   ├── useLiquidity.ts
│   └── usePrices.ts
└── config/               # Contract configuration
    └── contracts.json    # Auto-generated contract addresses & ABIs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Polygon Amoy testnet MATIC (get from [faucet](https://faucet.polygon.technology/))

### Installation & Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd copilot3.0
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Create .env file
   echo "RPC_URL=https://rpc-amoy.polygon.technology/" > .env
   echo "PRIVATE_KEY=<your_private_key>" >> .env
   ```

3. **Deploy Contracts**
   ```bash
   # Compile contracts
   npm run compile
   
   # Deploy to Polygon Amoy
   npm run deploy:amoy
   ```

4. **Start Development Server**
   ```bash
   npm run start:dex
   ```

5. **Access DEX**
   - Open [http://localhost:3000/dex](http://localhost:3000/dex)
   - Connect MetaMask to Polygon Amoy
   - Start trading!

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start Next.js development server
npm run start:dex        # Start DEX application

# Smart Contracts
npm run compile          # Compile Solidity contracts
npm run deploy:amoy      # Deploy contracts to Polygon Amoy
npm run test             # Run Hardhat tests
npm run test:coverage    # Run tests with coverage report

# Production
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## 🔧 Configuration

### Network Configuration
- **Network**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology/
- **Explorer**: https://amoy.polygonscan.com/

### Token Addresses
```javascript
const TOKENS = {
  TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
};
```

### Contract Configuration
After deployment, contract addresses and ABIs are automatically written to `src/config/contracts.json`:

```json
{
  "network": "polygon-amoy",
  "chainId": 80002,
  "dexAddress": "0x...",
  "tokens": { ... },
  "pairs": [ ... ],
  "abis": { ... }
}
```

## 💡 Usage Guide

### Swapping Tokens
1. Navigate to the **Swap** tab
2. Select input and output tokens
3. Enter amount (or click MAX)
4. Adjust slippage tolerance if needed
5. Approve token spending (first time only)
6. Execute swap

### Adding Liquidity
1. Navigate to the **Liquidity** tab
2. Select **Add Liquidity**
3. Choose token pair
4. Enter amounts (maintains ratio automatically)
5. Approve both tokens
6. Add liquidity

### Removing Liquidity
1. Navigate to the **Liquidity** tab
2. Select **Remove Liquidity**
3. Choose your position
4. Enter LP token amount
5. Remove liquidity

### Viewing Analytics
1. Navigate to the **Analytics** tab
2. View trading volume charts
3. Monitor TVL trends
4. Check pool statistics
5. Analyze trading activity

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/TikTakDex.test.js
```

### Test Coverage
The test suite covers:
- ✅ Pair creation and management
- ✅ Liquidity addition/removal
- ✅ Token swapping mechanics
- ✅ Fee distribution
- ✅ Error handling
- ✅ Edge cases

## 🔒 Security Features

### Smart Contract Security
- **Safe Math**: Built-in overflow/underflow protection
- **Access Control**: Owner-only functions properly protected
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Full transaction traceability

### Frontend Security
- **Input Sanitization**: All user inputs validated
- **Error Boundaries**: Graceful error handling
- **Transaction Simulation**: Preview before execution
- **Slippage Protection**: Configurable price impact limits

## 📊 Analytics & Monitoring

### Real-time Metrics
- **Trading Volume**: 24h, 7d, 30d views
- **Total Value Locked (TVL)**: Pool liquidity tracking
- **Price Charts**: Interactive price history
- **Pool Statistics**: Reserve ratios and fees

### Event Tracking
- `Swap` events for trade monitoring
- `AddLiquidity`/`RemoveLiquidity` for LP activity
- `Sync` events for reserve updates

## 🚀 Deployment

### Contract Deployment
```bash
# Deploy to Polygon Amoy
npm run deploy:amoy

# Verify deployment
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify
npm run start
```

## 🔧 Customization

### Adding New Tokens
1. Update token addresses in `scripts/deploy.js`
2. Add token to supported tokens list
3. Create new trading pairs
4. Update frontend token lists

### Modifying Fees
1. Update fee constants in `TikTakDex.sol`
2. Redeploy contracts
3. Update frontend fee displays

### Styling Changes
1. Modify Tailwind classes in components
2. Update color scheme in `globals.css`
3. Customize animations and transitions

## 📈 Performance Optimization

### Gas Optimization
- Efficient contract design
- Minimal storage operations
- Optimized function calls
- Batch operations where possible

### Frontend Optimization
- React hooks for state management
- Memoization for expensive calculations
- Lazy loading for components
- Efficient re-rendering

## 🐛 Troubleshooting

### Common Issues

**"Transaction Failed"**
- Check gas limits
- Verify token approvals
- Ensure sufficient balance
- Check slippage settings

**"Insufficient Liquidity"**
- Add initial liquidity to pools
- Check reserve balances
- Verify pair exists

**"Wrong Network"**
- Switch to Polygon Amoy
- Add network to MetaMask
- Check RPC configuration

### Debug Mode
```bash
# Enable debug logging
DEBUG=true npm run dev

# Check contract state
npx hardhat console --network amoy
```

## 📚 API Reference

### Smart Contract Functions

#### TikTakDex
- `createPair(token0, token1)` - Create new trading pair
- `addLiquidity(token0, token1, amount0, amount1, to)` - Add liquidity
- `removeLiquidity(token0, token1, lpAmount, to)` - Remove liquidity
- `swapExactTokensForTokens(tokenIn, tokenOut, amountIn, to)` - Execute swap
- `getAmountOut(amountIn, tokenIn, tokenOut)` - Calculate output amount
- `getReserves(token0, token1)` - Get pair reserves

#### TikTakLP
- `mint(to, amount)` - Mint LP tokens
- `burn(from, amount)` - Burn LP tokens
- Standard ERC20 functions

### React Hooks

#### useDex
```typescript
const {
  pairs,
  totalTVL,
  volume24h,
  getAmountOut,
  swapTokens,
  refreshData
} = useDex(signer, address);
```

#### useLiquidity
```typescript
const {
  positions,
  addLiquidity,
  removeLiquidity,
  refreshPositions
} = useLiquidity(signer, address);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Uniswap V2** - AMM design inspiration
- **OpenZeppelin** - Secure contract libraries
- **Hardhat** - Development framework
- **Next.js** - React framework
- **Tailwind CSS** - Styling framework

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Community Server](https://discord.gg/your-server)
- **Twitter**: [@TikTakDex](https://twitter.com/TikTakDex)

---

**Built with ❤️ for the DeFi community**

*TikTakDex - Your gateway to decentralized trading on Polygon Amoy*
