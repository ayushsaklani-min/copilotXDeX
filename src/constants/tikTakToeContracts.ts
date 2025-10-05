// Polygon Amoy TIK-TAK-TOE Contract Configuration
export const POLYGON_AMOY_CONFIG = {
  chainId: 80002,
  chainIdHex: '0x13882',
  name: 'Polygon Amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  explorerUrl: 'https://amoy.polygonscan.com/',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
} as const;

// Contract Addresses for TIK-TAK-TOE tokens and swap contract
export const TIK_TAK_TOE_CONTRACTS = {
  SWAP_CONTRACT: '0xB237567dB791dE3E56e2fe7E043F0c882cB39eE6',
  TIK_TOKEN: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK_TOKEN: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE_TOKEN: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
} as const;

// Token Information
export const TIK_TAK_TOE_TOKENS = {
  TIK: {
    address: TIK_TAK_TOE_CONTRACTS.TIK_TOKEN,
    symbol: 'TIK',
    name: 'TIK Token',
    decimals: 18,
  },
  TAK: {
    address: TIK_TAK_TOE_CONTRACTS.TAK_TOKEN,
    symbol: 'TAK',
    name: 'TAK Token',
    decimals: 18,
  },
  TOE: {
    address: TIK_TAK_TOE_CONTRACTS.TOE_TOKEN,
    symbol: 'TOE',
    name: 'TOE Token',
    decimals: 18,
  },
} as const;

// ERC20 ABI (simplified for our use case)
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "recipient", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "sender", "type": "address"}, {"name": "recipient", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "transferFrom",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
] as const;

// Swap Contract ABI
export const SWAP_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "tokenIn", "type": "address"}, {"internalType": "address", "name": "tokenOut", "type": "address"}, {"internalType": "uint256", "name": "amountIn", "type": "uint256"}],
    "name": "swap",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "reserve",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}],
    "name": "syncReserves",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Helper function to get token by symbol
export const getTokenBySymbol = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return TIK_TAK_TOE_TOKENS[upperSymbol as keyof typeof TIK_TAK_TOE_TOKENS];
};

// Helper function to get all token symbols
export const getAllTokenSymbols = () => {
  return Object.keys(TIK_TAK_TOE_TOKENS);
};

