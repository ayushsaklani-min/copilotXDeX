# 🚀 TikTakDex - Advanced DeFi Platform with Reputation System

[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy-8247E5?style=flat-square&logo=polygon)](https://polygon.technology/)
[![Hardhat](https://img.shields.io/badge/Hardhat-^2.26.3-yellow?style=flat-square&logo=hardhat)](https://hardhat.org/)

> **A comprehensive Web3 DeFi platform featuring reputation-based dynamic fees, AI-powered trading assistance, and a complete token ecosystem on Polygon Amoy testnet.**

## 🌟 **Overview**

TikTakDex is a next-generation decentralized exchange (DEX) that combines traditional AMM mechanics with innovative reputation-based fee structures. Users earn reputation points through trading activities and receive automatic fee discounts based on their tier level.

### **🎯 Key Features**

- **🔄 Dynamic Fee System**: Reputation-based fees from 0.05% to 0.30%
- **🏆 Tier System**: Bronze, Silver, Gold, and Diamond tiers with visual badges
- **📊 Live Leaderboard**: Real-time reputation rankings with achievements
- **🤖 AI Assistant**: Gemini-powered trading insights and portfolio analysis
- **🪙 Token Factory**: Create custom ERC20 tokens with reputation rewards
- **💧 Liquidity Management**: Add/remove liquidity with LP token rewards
- **📈 Analytics Dashboard**: Comprehensive pool statistics and trading data
- **🎨 Modern UI**: Neobrutalist design with smooth animations

---

## 🏗️ **Architecture**

### **Frontend Stack**
- **Framework**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS with custom neobrutalist theme
- **Web3**: Ethers.js v6 with MetaMask integration
- **Animations**: Framer Motion for smooth transitions
- **AI**: Google Gemini API for intelligent assistance
- **Data**: Alchemy API + CoinGecko for real-time data

### **Smart Contracts**
- **Network**: Polygon Amoy Testnet (Chain ID: 80002)
- **Language**: Solidity ^0.8.20 with OpenZeppelin libraries
- **Framework**: Hardhat for development and deployment
- **Security**: Comprehensive test suite with edge case coverage

---

## 🎖️ **Reputation System**

### **Scoring Mechanism**
| Action | Points | Description |
|--------|--------|-------------|
| 🔄 **Swap** | +1 | Each successful token swap |
| 💧 **Add Liquidity** | +2 | Providing liquidity to pools |
| 🪙 **Create Token** | +5 | Deploying new ERC20 tokens |

### **Tier Structure**
| Tier | Points | Fee Rate | Badge |
|------|--------|----------|-------|
| 🥉 **Bronze** | 10-49 | 0.30% | Default tier |
| 🥈 **Silver** | 50-99 | 0.20% | 33% fee reduction |
| 🥇 **Gold** | 100-499 | 0.10% | 67% fee reduction |
| 💎 **Diamond** | 500+ | 0.05% | 83% fee reduction |

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- MetaMask browser extension
- Polygon Amoy testnet MATIC ([Get from faucet](https://faucet.polygon.technology/))

### **Installation**

```bash
# Clone the repository
git clone https://github.com/ayushsaklani-min/web3_copilot.git
cd web3_copilot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env file
```

### **Environment Setup**

Create a `.env` file in the root directory:

```env
# Blockchain
RPC_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=your_private_key_here

# APIs (Optional)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### **Development**

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### **Smart Contract Deployment**

```bash
# Compile contracts
npm run compile

# Deploy to Polygon Amoy
npm run deploy:amoy

# Set reputation contract
npm run set:reputation
```

---

## 📱 **User Interface**

### **Main Dashboard** (`/`)
- **Portfolio Overview**: Real-time token balances with USD values
- **AI Assistant**: Contextual DeFi guidance and portfolio insights
- **Wallet Management**: One-click connection with auto network switching

### **DEX Suite** (`/dex`)
- **🔄 Swap**: Token trading with real-time quotes and fee display
- **💧 Liquidity**: Add/remove liquidity with LP token management
- **📊 Analytics**: Pool statistics, TVL, and trading volume charts
- **🤖 AI Assistant**: Trading advice and market analysis

### **Token Management** (`/dex/tokens`)
- **🪙 Create Tokens**: Deploy custom ERC20 tokens with metadata
- **🏆 Achievements**: Live leaderboard with tier progression
- **📈 Portfolio**: View created tokens and reputation history

---

## 🔧 **Smart Contracts**

### **TikTakDex.sol** - Main AMM Contract
```solidity
// Core AMM functionality
- Uniswap V2-style automated market maker
- Multi-pair support (TIK-TAK, TIK-TOE, TAK-TOE)
- Dynamic fee calculation based on reputation
- LP token minting and burning
- Reserve management with K-value tracking

// Reputation integration
- getUserFeeRate(address): Returns dynamic fee (5-30 basis points)
- FeeAdjusted event: Emitted on each swap with fee details
- Reputation contract integration via IReputation interface
```

### **TokenFactory.sol** - Token Creation
```solidity
- LaunchToken: Custom ERC20 with initial supply
- TokenFactory: Deploy new tokens with metadata
- Event emission for tracking and reputation rewards
```

### **TikTakLP.sol** - Liquidity Provider Tokens
```solidity
- Standard ERC20 LP tokens for each trading pair
- Mint/burn functionality for liquidity management
- Pair-specific naming and metadata
```

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/TikTakDex.test.js
```

### **Test Coverage**
- ✅ Pair creation and management
- ✅ Liquidity addition/removal
- ✅ Token swapping mechanics
- ✅ Fee distribution and reputation integration
- ✅ Error handling and edge cases
- ✅ Gas optimization validation

---

## 📊 **Contract Addresses** (Polygon Amoy)

| Contract | Address |
|----------|---------|
| **TikTakDex** | `0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba` |
| **TIK Token** | `0xf0dc4aa8063810B4116091371a74D55856c9Fa87` |
| **TAK Token** | `0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3` |
| **TOE Token** | `0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc` |
| **Reputation** | `0x07535D0f538689918901e53bC8ab25bb7ee66237` |
| **TokenFactory** | `0x68F18B79F942B1e2Ad4Df83b8b5D3822696Cdf8A` |

---

## 🎨 **Design System**

### **Visual Theme**
- **Background**: Dark gradient (gray-900 → blue-900 → purple-900)
- **Accents**: Cyan/blue gradients for primary actions
- **Typography**: Geist Sans + Geist Mono fonts
- **Components**: Neon-style cards with backdrop blur effects

### **Responsive Design**
- Mobile-first approach with adaptive layouts
- Breakpoints: sm/md/lg/xl/2xl
- Touch-friendly interface for mobile trading

---

## 🔌 **API Integration**

### **External Services**
- **Alchemy**: Token balance fetching and blockchain data
- **CoinGecko**: Real-time price data for USD conversions
- **Google Gemini**: AI-powered trading assistance
- **Polygon Amoy**: Blockchain interactions and transactions

### **Internal APIs**
- **Simulation**: `/api/simulate` for transaction previews
- **Contract Config**: Auto-generated from deployment artifacts

---

## 🚀 **Deployment**

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Start production server
npm run start

# Deploy to Vercel/Netlify
npm run deploy
```

### **Smart Contract Deployment**
```bash
# Deploy to Polygon Amoy
npm run deploy:amoy

# Verify contracts on explorer
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

---

## 📈 **Performance & Security**

### **Gas Optimization**
- Efficient contract design with minimal storage operations
- Optimized function calls and batch operations
- Smart contract gas usage analysis and optimization

### **Security Features**
- **Safe Math**: Built-in overflow/underflow protection
- **Access Control**: Owner-only functions properly protected
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Full transaction traceability
- **Test Coverage**: Comprehensive test suite with edge cases

---

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure responsive design for all UI components

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Uniswap V2** - AMM design inspiration and mechanics
- **OpenZeppelin** - Secure contract libraries and standards
- **Hardhat** - Development framework and testing tools
- **Next.js** - React framework for modern web applications
- **Tailwind CSS** - Utility-first CSS framework
- **Polygon** - Scalable blockchain infrastructure

---

## 📞 **Support & Community**

- **Documentation**: [GitHub Wiki](https://github.com/ayushsaklani-min/web3_copilot/wiki)
- **Issues**: [GitHub Issues](https://github.com/ayushsaklani-min/web3_copilot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ayushsaklani-min/web3_copilot/discussions)

---

## 🌟 **Star History**

[![Star History Chart](https://api.star-history.com/svg?repos=ayushsaklani-min/web3_copilot&type=Date)](https://star-history.com/#ayushsaklani-min/web3_copilot&Date)

---

**Built with ❤️ for the DeFi community**

*TikTakDex - Your gateway to reputation-driven decentralized trading on Polygon Amoy*

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

[![GitHub stars](https://img.shields.io/github/stars/ayushsaklani-min/web3_copilot?style=social)](https://github.com/ayushsaklani-min/web3_copilot/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ayushsaklani-min/web3_copilot?style=social)](https://github.com/ayushsaklani-min/web3_copilot/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/ayushsaklani-min/web3_copilot?style=social)](https://github.com/ayushsaklani-min/web3_copilot/watchers)

</div>