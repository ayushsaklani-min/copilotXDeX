'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from "../constants/reputation";

interface LiquidityPool {
  name: string;
  token0: string;
  token1: string;
  lpToken: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  userLpBalance: string;
  userShare: number;
  tvl: number;
}

interface LiquidityHook {
  pools: LiquidityPool[];
  isLoading: boolean;
  error: string | null;
  addLiquidity: (tokenA: string, tokenB: string, amountA: string, amountB: string) => Promise<string | null>;
  removeLiquidity: (tokenA: string, tokenB: string, lpAmount: string) => Promise<string | null>;
  getLpBalance: (tokenA: string, tokenB: string) => Promise<string>;
  refreshPools: () => Promise<void>;
}

const TOKENS = {
  TIK: '0xf0dc4aa8063810B4116091371a74D55856c9Fa87',
  TAK: '0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3',
  TOE: '0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc',
};

const DEX_ADDRESS = '0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba';

// Contract ABIs
const DEX_ABI = [
  "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
  "function removeLiquidity(address token0, address token1, uint256 lpAmount, address to) external returns (uint256, uint256)",
  "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
  "function getReserves(address tokenA, address tokenB) external view returns (uint256, uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

const LP_ABI = [
  "function balanceOf(address) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

export function useLiquidity(signer: ethers.JsonRpcSigner | null, address: string | null): LiquidityHook {
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pool configurations
  const poolConfigs = useMemo(() => [
    {
      name: 'TIK-TOE',
      token0: TOKENS.TIK,
      token1: TOKENS.TOE,
      lpToken: '0x9999e190b6Ab99B0AC123b880b0A51171e74BfFA',
    },
    {
      name: 'TAK-TOE',
      token0: TOKENS.TAK,
      token1: TOKENS.TOE,
      lpToken: '0x7287fe333C0432c1c48602A4838e5d96db65ED49',
    },
  ], []);

  // Get LP token balance for a specific pool
  const getLpBalance = useCallback(async (tokenA: string, tokenB: string): Promise<string> => {
    if (!signer || !address) return '0';

    try {
      const poolConfig = poolConfigs.find(p => 
        (p.token0 === tokenA && p.token1 === tokenB) || 
        (p.token0 === tokenB && p.token1 === tokenA)
      );

      if (!poolConfig) return '0';

      const lpContract = new ethers.Contract(poolConfig.lpToken, LP_ABI, signer);
      const balance = await lpContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting LP balance:', error);
      return '0';
    }
  }, [signer, address, poolConfigs]);

  // Refresh all pool data
  const refreshPools = useCallback(async () => {
    if (!signer || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      const poolsData: LiquidityPool[] = [];

      for (const poolConfig of poolConfigs) {
        try {
          // Get pool reserves
          const [reserve0, reserve1] = await dexContract.getReserves(poolConfig.token0, poolConfig.token1);
          
          // Get LP token total supply
          const lpContract = new ethers.Contract(poolConfig.lpToken, LP_ABI, signer);
          const totalSupply = await lpContract.totalSupply();
          
          // Get user's LP balance
          const userLpBalance = await lpContract.balanceOf(address);
          
          // Calculate user's share percentage
          const userShare = totalSupply > 0 ? 
            (Number(ethers.formatEther(userLpBalance)) / Number(ethers.formatEther(totalSupply))) * 100 : 0;

          // Calculate TVL (simplified - using reserve values as USD)
          const tvl = Number(ethers.formatEther(reserve0)) + Number(ethers.formatEther(reserve1));

          poolsData.push({
            name: poolConfig.name,
            token0: poolConfig.token0,
            token1: poolConfig.token1,
            lpToken: poolConfig.lpToken,
            reserve0: ethers.formatEther(reserve0),
            reserve1: ethers.formatEther(reserve1),
            totalSupply: ethers.formatEther(totalSupply),
            userLpBalance: ethers.formatEther(userLpBalance),
            userShare,
            tvl,
          });
        } catch (error) {
          console.error(`Error loading pool ${poolConfig.name}:`, error);
        }
      }

      setPools(poolsData);
    } catch (error) {
      console.error('Error refreshing pools:', error);
      setError('Failed to load pool data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address, poolConfigs]);

  // Add liquidity to a pool
  const addLiquidity = useCallback(async (
    tokenA: string, 
    tokenB: string, 
    amountA: string, 
    amountB: string
  ): Promise<string | null> => {
    if (!signer || !address) return null;

    try {
      const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      
      // Convert amounts to wei
      const amountAWei = ethers.parseEther(amountA);
      const amountBWei = ethers.parseEther(amountB);

      // Approve tokens
      const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, signer);

      const approveATx = await tokenAContract.approve(DEX_ADDRESS, amountAWei);
      await approveATx.wait();

      const approveBTx = await tokenBContract.approve(DEX_ADDRESS, amountBWei);
      await approveBTx.wait();

      // Add liquidity
      const tx = await dexContract.addLiquidity(tokenA, tokenB, amountAWei, amountBWei, address);
      const receipt = await tx.wait();

      // Reputation: +2 for successful add-liquidity
      try {
        const localAddr = (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('reputationAddress') : null) || REPUTATION_ADDRESS;
        if (localAddr) {
          const rep = new ethers.Contract(localAddr, REPUTATION_ABI, signer);
          await rep.updateScore(address, 2);
          console.log("Reputation +2 for liquidity add");
        }
      } catch (e) {
        console.warn("Reputation update liquidity failed", e);
      }

      // Refresh pool data
      await refreshPools();

      return receipt.hash;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error adding liquidity:', error);
      throw new Error(`Failed to add liquidity: ${err.message || 'Unknown error'}`);
    }
  }, [signer, address, refreshPools]);

  // Remove liquidity from a pool
  const removeLiquidity = useCallback(async (
    tokenA: string, 
    tokenB: string, 
    lpAmount: string
  ): Promise<string | null> => {
    if (!signer || !address) return null;

    try {
      const dexContract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
      
      // Convert LP amount to wei
      const lpAmountWei = ethers.parseEther(lpAmount);

      // Remove liquidity
      const tx = await dexContract.removeLiquidity(tokenA, tokenB, lpAmountWei, address);
      const receipt = await tx.wait();

      // Refresh pool data
      await refreshPools();

      return receipt.hash;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error removing liquidity:', error);
      throw new Error(`Failed to remove liquidity: ${err.message || 'Unknown error'}`);
    }
  }, [signer, address, refreshPools]);

  // Load pool data on mount and when dependencies change
  useEffect(() => {
    refreshPools();
  }, [refreshPools]);

  return {
    pools,
    isLoading,
    error,
    addLiquidity,
    removeLiquidity,
    getLpBalance,
    refreshPools,
  };
}