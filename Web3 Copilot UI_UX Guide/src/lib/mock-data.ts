// Mock data for Web3 Copilot
import { Token, PoolInfo } from './types';

export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
];

export const MOCK_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    balance: '2.5',
    usdValue: 6250.00,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    balance: '5000',
    usdValue: 5000.00,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    balance: '3000',
    usdValue: 3000.00,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    balance: '1500',
    usdValue: 1500.00,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    balance: '0.05',
    usdValue: 3500.00,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    decimals: 18,
    balance: '250',
    usdValue: 1750.00,
  },
];

export const MOCK_POOLS: PoolInfo[] = [
  {
    token0: MOCK_TOKENS[0],
    token1: MOCK_TOKENS[1],
    tvl: 125000000,
    volume24h: 45000000,
    fees24h: 135000,
    apr: 12.5,
  },
  {
    token0: MOCK_TOKENS[0],
    token1: MOCK_TOKENS[4],
    tvl: 85000000,
    volume24h: 28000000,
    fees24h: 84000,
    apr: 15.3,
  },
  {
    token0: MOCK_TOKENS[1],
    token1: MOCK_TOKENS[2],
    tvl: 95000000,
    volume24h: 65000000,
    fees24h: 195000,
    apr: 8.7,
  },
];

export const AI_RESPONSES: Record<string, string> = {
  portfolio: "Based on your current portfolio, you hold approximately $21,000 across 6 different tokens. Your largest positions are ETH (29.8%) and USDC (23.8%). Your portfolio is relatively well-diversified across blue-chip assets and stablecoins, providing a balance between growth potential and stability.",
  risk: "Your portfolio shows moderate risk exposure with about 52% in volatile assets (ETH, WBTC, UNI) and 48% in stablecoins (USDC, USDT, DAI). Consider your risk tolerance and market conditions when rebalancing.",
  swap: "Token swaps allow you to exchange one cryptocurrency for another. On this platform, you can swap tokens with low slippage and competitive fees. Always preview your transaction and check the price impact before confirming.",
  liquidity: "Adding liquidity means depositing token pairs into a liquidity pool. You'll earn trading fees proportional to your share of the pool. Be aware of impermanent loss when providing liquidity to volatile pairs.",
  gas: "Gas fees vary based on network congestion. Consider batching transactions or using Layer 2 solutions like Arbitrum or Polygon for lower fees.",
  default: "I'm here to help you understand your portfolio and navigate Web3. Ask me about your holdings, risks, swapping tokens, or providing liquidity. What would you like to know?",
};
