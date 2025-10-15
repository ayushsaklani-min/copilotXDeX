import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contracts from '../config/contracts.json';

interface UsePricesReturn {
  prices: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refreshPrices: () => Promise<void>;
}

export const usePrices = (signer: ethers.JsonRpcSigner | null): UsePricesReturn => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPrices = useCallback(async () => {
    if (!signer) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const dexContract = new ethers.Contract(
        contracts.dexAddress,
        contracts.abis.TikTakDex,
        signer
      );

      const calculatedPrices: Record<string, number> = {};

      // Calculate prices from reserves for each pair
      for (const pair of contracts.pairs) {
        try {
          const [reserve0, reserve1] = await dexContract.getReserves(pair.token0, pair.token1);
          
          // Calculate price ratio (token1 per token0)
          const price = parseFloat(ethers.formatEther(reserve1)) / parseFloat(ethers.formatEther(reserve0));
          calculatedPrices[pair.name] = price;
          
          // Also calculate individual token prices relative to a base (using TOE as base)
          if (pair.token1 === contracts.tokens.TOE) {
            const tokenName = pair.token0 === contracts.tokens.TIK ? 'TIK' : 
                            pair.token0 === contracts.tokens.TAK ? 'TAK' : 'TOE';
            calculatedPrices[tokenName] = price;
          }
        } catch (err) {
          console.warn(`Failed to get reserves for ${pair.name}:`, err);
        }
      }

      // Set TOE as base (1.0)
      calculatedPrices['TOE'] = 1.0;
      
      setPrices(calculatedPrices);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  // Auto-refresh prices
  useEffect(() => {
    if (signer) {
      refreshPrices();
      
      // Refresh every 30 seconds
      const interval = setInterval(refreshPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [refreshPrices, signer]);

  return {
    prices,
    isLoading,
    error,
    refreshPrices,
  };
};
