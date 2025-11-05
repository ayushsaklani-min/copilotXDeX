import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Contract configuration (will be loaded from contracts.json)
interface ContractConfig {
  network: string;
  chainId: number;
  dexAddress: string;
  tokens: Record<string, string>;
  pairs: Array<{
    name: string;
    token0: string;
    token1: string;
    pairKey: string;
    lpToken: string;
  }>;
  abis: {
    TikTakDex: string[];
    TikTakLP: string[];
  };
}

interface Pair {
  name: string;
  token0: string;
  token1: string;
  pairKey: string;
  lpToken: string;
  reserve0: number;
  reserve1: number;
  totalSupply: number;
}

interface UseDexReturn {
  pairs: Pair[];
  totalTVL: number;
  volume24h: number;
  isLoading: boolean;
  error: string | null;
  getAmountOut: (amountIn: number, tokenIn: string, tokenOut: string) => Promise<number>;
  getAmountIn: (amountOut: number, tokenIn: string, tokenOut: string) => Promise<number>;
  swapTokens: (tokenIn: string, tokenOut: string, amountIn: number, to: string) => Promise<string | null>;
  refreshData: () => Promise<void>;
}

export const useDex = (
  signer: ethers.JsonRpcSigner | null
): UseDexReturn => {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [totalTVL, setTotalTVL] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractConfig, setContractConfig] = useState<ContractConfig | null>(null);

  // Load contract configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/src/config/contracts.json');
        if (response.ok) {
          const config = await response.json();
          setContractConfig(config);
          console.log('✅ Contract config loaded:', config);
        } else {
          console.log('Contract config not found - contracts not deployed yet');
          setContractConfig(null);
        }
      } catch (err) {
        console.log('Contract config not available yet:', err);
        setContractConfig(null);
      }
    };

    loadConfig();
  }, []);

  // Refresh pair data
  const refreshData = useCallback(async () => {
    if (!signer || !contractConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      const dexContract = new ethers.Contract(
        contractConfig.dexAddress,
        contractConfig.abis.TikTakDex,
        signer
      );

      const pairsData: Pair[] = [];

      for (const pairConfig of contractConfig.pairs) {
        try {
          const [reserve0, reserve1] = await dexContract.getReserves(
            pairConfig.token0,
            pairConfig.token1
          );

          pairsData.push({
            name: pairConfig.name,
            token0: pairConfig.token0,
            token1: pairConfig.token1,
            pairKey: pairConfig.pairKey,
            lpToken: pairConfig.lpToken,
            reserve0: parseFloat(ethers.formatEther(reserve0)),
            reserve1: parseFloat(ethers.formatEther(reserve1)),
            totalSupply: parseFloat(ethers.formatEther(reserve0 + reserve1)),
          });
        } catch (err) {
          console.error(`Error fetching data for pair ${pairConfig.name}:`, err);
        }
      }

      setPairs(pairsData);

      // Calculate total TVL (simplified - assumes 1:1 price ratio)
      const tvl = pairsData.reduce((sum, pair) => sum + pair.reserve0 + pair.reserve1, 0);
      setTotalTVL(tvl);

      // Calculate real volume from recent events (simplified approach)
      // In a production system, you'd query Swap events from the last 24h
      let volume24h = 0;
      try {
        // Get current block and calculate 24h ago
        const currentBlock = await signer.provider.getBlockNumber();
        const latestBlock = await signer.provider.getBlock(currentBlock);
        const nowTs = (latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
        const oneDayAgo = nowTs - (24 * 60 * 60);
        
        // Query Swap events from the last 24h
        const swapFilter = dexContract.filters.Swap();
        const events = await dexContract.queryFilter(swapFilter, -1000); // Last 1000 blocks
        
        // Sum up volume from recent events
        for (const ev of events) {
          if (!('args' in ev) || ev.args === undefined) continue;
          const { amountIn } = ev.args as { amountIn: bigint };
          if (ev.blockNumber === undefined) continue;

          try {
            const block = await signer.provider.getBlock(ev.blockNumber);
            const ts = block?.timestamp ?? 0;
            if (ts >= oneDayAgo) {
              volume24h += parseFloat(ethers.formatEther(amountIn));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to calculate real volume, using estimate:', err);
        volume24h = tvl * 0.1; // Fallback to 10% of TVL
      }
      
      setVolume24h(volume24h);

    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, contractConfig]);

  // Auto-refresh data
  useEffect(() => {
    if (contractConfig) {
      refreshData();
      
      // Refresh every 10 seconds
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [refreshData, contractConfig]);

  // Get amount out for a swap
  const getAmountOut = useCallback(async (
    amountIn: number,
    tokenIn: string,
    tokenOut: string
  ): Promise<number> => {
    if (!signer || !contractConfig) return 0;

    try {
      const dexContract = new ethers.Contract(
        contractConfig.dexAddress,
        contractConfig.abis.TikTakDex,
        signer
      );

      const amountInWei = ethers.parseEther(amountIn.toString());
      const amountOutWei = await dexContract.getAmountOut(amountInWei, tokenIn, tokenOut);
      
      return parseFloat(ethers.formatEther(amountOutWei));
    } catch (err) {
      console.error('Error getting amount out:', err);
      return 0;
    }
  }, [signer, contractConfig]);

  // Get amount in for a swap
  const getAmountIn = useCallback(async (
    amountOut: number,
    tokenIn: string,
    tokenOut: string
  ): Promise<number> => {
    if (!signer || !contractConfig) return 0;

    try {
      const dexContract = new ethers.Contract(
        contractConfig.dexAddress,
        contractConfig.abis.TikTakDex,
        signer
      );

      const amountOutWei = ethers.parseEther(amountOut.toString());
      const amountInWei = await dexContract.getAmountIn(amountOutWei, tokenIn, tokenOut);
      
      return parseFloat(ethers.formatEther(amountInWei));
    } catch (err) {
      console.error('Error getting amount in:', err);
      return 0;
    }
  }, [signer, contractConfig]);

  // Execute swap
  const swapTokens = useCallback(async (
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    to: string
  ): Promise<string | null> => {
    if (!signer || !contractConfig) return null;

    try {
      const dexContract = new ethers.Contract(
        contractConfig.dexAddress,
        contractConfig.abis.TikTakDex,
        signer
      );

      const amountInWei = ethers.parseEther(amountIn.toString());
      const tx = await dexContract.swapExactTokensForTokens(
        tokenIn,
        tokenOut,
        amountInWei,
        to,
        {
          gasLimit: 250000
        }
      );

      await tx.wait();

      // Reputation handled on-chain by DEX
      return tx.hash;
    } catch (err) {
      console.error('Error executing swap:', err);
      return null;
    }
  }, [signer, contractConfig]);

  return {
    pairs,
    totalTVL,
    volume24h,
    isLoading,
    error,
    getAmountOut,
    getAmountIn,
    swapTokens,
    refreshData,
  };
};
