# CopilotXDEX 2.0

**AI-Powered • GameFi-Enhanced • Bonding-Curve DEX on Polygon Amoy**

[![Polygon](https://img.shields.io/badge/Polygon-Amoy-8247E5?style=flat-square)](https://polygon.technology/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

---

## Overview

CopilotXDEX 2.0 is a next-generation decentralized exchange combining:

- **Bonding-curve token launches** with no initial liquidity requirement
- **AI-powered security analysis** with 15-factor risk scoring
- **GameFi mechanics** (Coinflip, Mines, tournaments)
- **Full social graph** for creator-community engagement
- **Premium dark-neon UX** with motion-enhanced design

Designed for fair launches, safe trading, and community-driven growth on Polygon.

---

## Why It Matters

DeFi faces four critical issues:

1. **High barriers** for new token creators (liquidity requirements)
2. **Constant rug pulls** causing billions in losses
3. **Boring user experience** with no engagement layer
4. **No social or community features** for creators

**CopilotXDEX solves all four** with smart contracts + AI + GameFi in one platform.

---

## Core Features

### 1. Bonding Curve Token Factory

Launch tokens with **zero initial liquidity**:

- Choose **Linear**, **Exponential**, or **Sigmoid** curves
- Built-in creator royalties (1-5%)
- Automatic price discovery based on supply/demand
- Fair launch mechanism with anti-bot protection

```solidity
function getCurrentPrice() public view returns (uint256) {
    if (curveType == CurveType.LINEAR) {
        return initialPrice + (totalSupply() * LINEAR_SLOPE);
    }
    if (curveType == CurveType.EXPONENTIAL) {
        return initialPrice * (EXP_BASE ** totalSupply());
    }
    // Sigmoid implementation...
}
```

**Benefits**: Democratizes token creation, prevents front-running, enables fair launches.

---

### 2. AI-Powered Security Suite

Real-time **15-factor risk scoring**:

- Liquidity lock verification
- Owner renounce check
- Honeypot detection
- Holder distribution analysis
- Contract verification status
- On-chain volume anomalies
- Trading pattern analysis
- Wallet clustering
- Time-based risk factors

```typescript
const riskScore = await RiskScorer.analyzeToken(tokenAddress);
// Returns: 0-100 score with detailed breakdown
```

**Risk Scale**:
- 0-20: Safe (verified and secure)
- 21-40: Low risk (minor concerns)
- 41-60: Medium risk (proceed with caution)
- 61-80: High risk (significant red flags)
- 81-100: Extreme risk (likely scam)

---

### 3. GameFi Hub

Engaging trading experience with **XP rewards system**:

#### Coinflip
- 50/50 odds with 2% house edge
- Bet 0.01-10 MATIC
- Instant payouts
- Earn 5 XP per game + 10 XP bonus for wins

#### Mines
- 5x5 grid with configurable mines (3-20)
- Progressive multipliers
- Cash out anytime
- Strategic risk/reward gameplay

#### Coming Soon
- **Meme Royale**: Tournament-style token voting
- **Price Prediction**: Leveraged prediction markets

**XP System**: Level progression, streak bonuses, multipliers up to 3x, daily missions.

---

### 4. Social Graph

Complete creator-community infrastructure:

- Creator profiles with verification badges
- Token announcements and updates
- Follower/following system
- Reputation scoring
- Community engagement metrics

```solidity
mapping(address => mapping(address => bool)) public following;
mapping(address => Announcement[]) public announcements;
```

---

### 5. Full DEX Suite

**Swap**: Multi-token support, slippage protection, reputation-based fee tiers

**Liquidity**: Add/remove liquidity, LP token tracking, impermanent loss calculator

**Farming**: Stake LP tokens, earn rewards, boosted APY for long-term stakers

**Governance**: DAO voting, proposal creation, badge-weighted voting power

---

## Architecture

### Smart Contracts

```
contracts/
├── bonding/
│   ├── BondingCurveFactory.sol      # Token factory
│   ├── BondingCurveToken.sol        # ERC20 with curves
│   └── IBondingCurveFactory.sol     # Interface
├── security/
│   ├── RugScanner.sol                # Security analysis
│   └── LiquidityController.sol       # LP lock management
├── games/
│   ├── Coinflip.sol                  # Coin flip game
│   ├── Mines.sol                     # Mines game
│   ├── XPRewards.sol                 # XP & rewards
│   └── MemeRoyale.sol                # Tournament game
└── social/
    └── SocialGraph.sol               # Social features
```

### Frontend (Next.js 15 + Wagmi v2)

```
src/
├── app/                    # Next.js app router
├── components/             # UI + game components
├── hooks/                  # Web3 hooks
└── ai/                     # Risk scoring engines
```

**Tech Stack**: Polygon Amoy • Hardhat • Ethers.js v6 • TypeScript • Tailwind • Framer Motion • Viem

---

## Quick Start

### Requirements

- Node.js 18+
- MetaMask wallet
- Polygon Amoy testnet MATIC

### Setup

```bash
git clone https://github.com/yourusername/copilotxdex.git
cd copilotxdex
npm install
cp .env.example .env
# Add your RPC URL and private key to .env
```

### Compile & Deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy-all.js --network amoy
```

### Start Frontend

```bash
npm run dev
# Open http://localhost:3000
```

---

## Contract Addresses (Polygon Amoy)

```json
{
  "bondingCurveFactory": "0x07e76C0667879a069D56cFC9019B63fC6F2DBfa5",
  "rugScanner": "0xBF54a9f576C8971BBAEe036e75B259949b754131",
  "liquidityController": "0xFc76109Fbe3a78c97808A20c9b62177756a05930",
  "socialGraph": "0xe1705bEF589bdcAb37fA47786af81b97275aE4F3",
  "xpRewards": "0x1B869035546A16cBE7825EDb262ec2652A8dF11a",
  "coinflip": "0x835C0aD02c1a81bEF7eAc7340267ba182F1Db1D7"
}
```

All contracts verified on [PolygonScan](https://amoy.polygonscan.com).

---

## Security

**Smart Contract Security**:
- ReentrancyGuard on all state-changing functions
- Ownable access control
- Input validation and sanitization
- Emergency pause mechanisms
- SafeMath operations (Solidity 0.8.20)

**Frontend Security**:
- No private key exposure
- User-approved transactions only
- XSS and CSRF protection
- Input sanitization

**Audit Status**:
- Internal security review: Complete
- External audit: Planned
- Bug bounty program: Coming soon

---

## Roadmap

### Phase 1 — Foundation (Complete)
- Core DEX functionality
- Bonding curve implementation
- Basic games (Coinflip, Mines)
- Security scanner

### Phase 2 — Expansion (Complete)
- Social graph features
- XP & rewards system
- Advanced analytics
- Mobile optimization

### Phase 3 — Advanced (In Progress)
- Meme Royale tournament
- Price prediction markets
- Cross-chain support
- NFT integration layer

### Phase 4 — Scaling (Q2 2025)
- Mainnet deployment
- Liquidity mining programs
- Full DAO governance
- Strategic partnerships

---

## Competitive Analysis

| Feature | CopilotXDEX | Uniswap | PancakeSwap | Pump.fun |
|---------|-------------|---------|-------------|----------|
| Bonding Curves | 3 types | No | No | 1 type |
| AI Risk Scanner | 15 factors | No | No | No |
| GameFi Integration | 4 games | No | Limited | No |
| Social Features | Full | No | No | Basic |
| No Initial Liquidity | Yes | No | No | Yes |
| Premium UX | Yes | Standard | Standard | Basic |

---

## Why CopilotXDEX Wins

**For Users**:
- Protected from scams with AI analysis
- Earn rewards while trading
- Engaging GameFi experience
- Connect with token communities

**For Creators**:
- Launch tokens with minimal capital
- Built-in community tools
- Fair launch mechanism
- Analytics and insights

**For the Ecosystem**:
- Democratizes token creation
- Reduces rug pulls and scams
- Increases DeFi adoption
- Attracts users through gaming

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Contact

- **GitHub**: [github.com/copilotxdex](https://github.com/copilotxdex • 

Built with Polygon

