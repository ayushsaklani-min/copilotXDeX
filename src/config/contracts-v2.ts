/**
 * CopilotXDEX 2.0 Contract Configuration
 * Central configuration for all smart contract addresses and ABIs
 */

// Contract addresses (update after deployment)
export const contractAddresses = {
  // Existing contracts
  tikTakDex: '0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3',
  reputation: '0xf77AA837587dc07FE822C5CB0B3D5BF5294CaB42',
  tokenFactory: '0x52fCB8364F5D084F892898289a20ea4478b70814',
  liquidityFarm: '0xdaf321167e32E46b5C256d07Bd1a37eeb951597F',
  referral: '0x100bB5d61A85CA9fA905ea053c54ac3f59e05d3a',
  governanceBadge: '0x60b7bbBb35A04eE9627f6E862131E9C7C246Bc39',
  governance: '0xEC1e21ba8D831b3eAC77663f1e5b4c52906D3eFc',
  
  // New V2 contracts (DEPLOYED ✅ Dec 14, 2025) - FIXED bonding curve math!
  bondingCurveFactory: '0xAac9334B6EF29A915b7Bf69c667911DeC0440c50', // V3 Full with DEX + LP Lock
  
  // DEX Contracts (DEPLOYED ✅ Dec 14, 2025)
  weth: '0xbe2E93d14856da185d7eAb011629e4eeAE689a4E',
  dexFactory: '0xea492c4c23FB7a90C51b065b1A67C9591a2D2e15',
  dexRouter: '0x330D6Fa8082099053cCE8d805532087F4E99DB1c',
  socialGraph: '0xe1705bEF589bdcAb37fA47786af81b97275aE4F3',
  xpRewards: '0x1B869035546A16cBE7825EDb262ec2652A8dF11a',
  coinflip: '0x835C0aD02c1a81bEF7eAc7340267ba182F1Db1D7',
  // TODO: update with actual deployed Mines game contract address when available
  mines: '0x0000000000000000000000000000000000000000',
  
  // V3 Upgraded Contracts (DEPLOYED ✅ Dec 14, 2025)
  rugScannerV3: '0x36A936556AE0c375B6d8B3272dea20B01C1aC52f',
  liquidityControllerV3: '0x82d107d355380FC2f030F1DE172335d9C0C08944',
  
  // Legacy V2 contracts (for backward compatibility)
  rugScanner: '0xBF54a9f576C8971BBAEe036e75B259949b754131', // Old version
  liquidityController: '0xFc76109Fbe3a78c97808A20c9b62177756a05930', // Old version
} as const;

// Network configuration
export const networkConfig = {
  chainId: 80002,
  name: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  blockExplorer: 'https://amoy.polygonscan.com/',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
};

// Bonding curve types
export enum CurveType {
  LINEAR = 0,
  EXPONENTIAL = 1,
  SIGMOID = 2,
}

// Curve type descriptions
export const curveTypeInfo = {
  [CurveType.LINEAR]: {
    name: 'Linear',
    description: 'Price increases linearly with supply',
    formula: 'price = initialPrice + (supply × slope)',
    bestFor: 'Stable, predictable growth',
  },
  [CurveType.EXPONENTIAL]: {
    name: 'Exponential',
    description: 'Price grows exponentially with supply',
    formula: 'price = initialPrice × (1.001 ^ supply)',
    bestFor: 'Rapid price appreciation',
  },
  [CurveType.SIGMOID]: {
    name: 'Sigmoid',
    description: 'S-curve with saturation',
    formula: 'price = initialPrice / (1 + e^(-k × (supply - midpoint)))',
    bestFor: 'Controlled growth with ceiling',
  },
};

// Contract configuration
export const contractConfig = {
  bondingCurve: {
    minCreationFee: '0.01', // MATIC
    maxCreatorRoyalty: 5,   // 5%
    minBuy: '0.01',         // MATIC
    maxBuy: '10',           // MATIC
    cooldownPeriod: 30,     // seconds
    graduationThreshold: '100', // MATIC TVL
  },
  
  liquidityLock: {
    minDuration: 30,        // days
    maxDuration: 1095,      // days (3 years)
  },
  
  games: {
    coinflip: {
      minBet: '0.01',       // MATIC
      maxBet: '10',         // MATIC
      houseEdge: 2,         // 2%
      xpPerGame: 5,
      xpWinBonus: 10,
    },
  },
  
  xp: {
    xpPerLevel: 100,
    maxStreak: 30,
    streakBonusXP: 5,
  },
};

// Risk score thresholds
export const riskThresholds = {
  safe: 20,
  low: 40,
  medium: 60,
  high: 80,
  extreme: 100,
};

// Risk level colors
export const riskColors = {
  SAFE: '#22c55e',      // green
  LOW: '#84cc16',       // lime
  MEDIUM: '#f59e0b',    // orange
  HIGH: '#ef4444',      // red
  EXTREME: '#dc2626',   // dark red
};

// Badge types
export const badgeTypes = [
  { id: 0, name: 'Early Adopter', requirement: 'First 100 users' },
  { id: 1, name: 'Token Creator', requirement: 'Created a token' },
  { id: 2, name: 'Whale', requirement: 'Holds > 1% of supply' },
  { id: 3, name: 'Diamond Hands', requirement: 'Held for > 30 days' },
  { id: 4, name: 'Community Leader', requirement: '100+ followers' },
  { id: 5, name: 'Trusted Creator', requirement: 'Verified by team' },
];

// Daily missions
export const dailyMissions = [
  { id: 0, description: 'Play 3 games', xpReward: 20, requirement: 3 },
  { id: 1, description: 'Make 5 trades', xpReward: 30, requirement: 5 },
  { id: 2, description: 'Add liquidity', xpReward: 25, requirement: 1 },
  { id: 3, description: 'Refer a friend', xpReward: 50, requirement: 1 },
  { id: 4, description: 'Win 3 games', xpReward: 40, requirement: 3 },
];

// Helper functions
export const getContractAddress = (contractName: keyof typeof contractAddresses): string => {
  const address = contractAddresses[contractName];
  if (!address) {
    console.warn(`Contract address not set for: ${contractName}`);
    return '';
  }
  return address;
};

export const isContractDeployed = (contractName: keyof typeof contractAddresses): boolean => {
  return !!contractAddresses[contractName];
};

export const getRiskLevel = (score: number): string => {
  if (score <= riskThresholds.safe) return 'SAFE';
  if (score <= riskThresholds.low) return 'LOW';
  if (score <= riskThresholds.medium) return 'MEDIUM';
  if (score <= riskThresholds.high) return 'HIGH';
  return 'EXTREME';
};

export const getRiskColor = (level: string): string => {
  return riskColors[level as keyof typeof riskColors] || riskColors.MEDIUM;
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatAmount = (amount: string | number, decimals: number = 4): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
};

export const getCurveTypeName = (curveType: CurveType): string => {
  return curveTypeInfo[curveType]?.name || 'Unknown';
};

export default {
  contractAddresses,
  networkConfig,
  contractConfig,
  riskThresholds,
  riskColors,
  badgeTypes,
  dailyMissions,
  CurveType,
  curveTypeInfo,
};
