import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contracts from '../config/contracts.json';

interface AnalyticsData {
  volumeData: Array<{ time: string; volume: number; trades: number }>;
  tvlData: Array<{ time: string; tvl: number }>;
  totalVolume: number;
  totalTrades: number;
  currentTVL: number;
}

interface UseAnalyticsReturn {
  data: AnalyticsData;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useAnalytics = (
  signer: ethers.JsonRpcSigner | null,
  timeframe: '24h' | '7d' | '30d' = '24h'
): UseAnalyticsReturn => {
  const [data, setData] = useState<AnalyticsData>({
    volumeData: [],
    tvlData: [],
    totalVolume: 0,
    totalTrades: 0,
    currentTVL: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    if (!signer) return;

    setIsLoading(true);
    setError(null);

    try {
      const dexContract = new ethers.Contract(
        contracts.dexAddress,
        contracts.abis.TikTakDex,
        signer
      );

      // Get current block and calculate time range
      const currentBlock = await signer.provider.getBlockNumber();
      const latestBlock = await signer.provider.getBlock(currentBlock);
      // Ethers Provider.getBlock can return null in some edge cases; fall back to system time
      const now = (latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
      
      let hoursBack: number;
      let intervalHours: number;
      
      switch (timeframe) {
        case '24h':
          hoursBack = 24;
          intervalHours = 1;
          break;
        case '7d':
          hoursBack = 168; // 7 days
          intervalHours = 24;
          break;
        case '30d':
          hoursBack = 720; // 30 days
          intervalHours = 24;
          break;
      }

      const intervals = Math.ceil(hoursBack / intervalHours);
      const volumeData: Array<{ time: string; volume: number; trades: number }> = [];
      const tvlData: Array<{ time: string; tvl: number }> = [];

      // Calculate current TVL from all pairs
      let currentTVL = 0;
      for (const pair of contracts.pairs) {
        try {
          const [reserve0, reserve1] = await dexContract.getReserves(pair.token0, pair.token1);
          // Simple TVL calculation (in real implementation, use price oracles)
          currentTVL += parseFloat(ethers.formatEther(reserve0)) + parseFloat(ethers.formatEther(reserve1));
        } catch (err) {
          console.warn(`Failed to get reserves for ${pair.name}:`, err);
        }
      }

      // For historical data, we'll simulate based on current reserves
      // In a real implementation, you'd query events or use a subgraph
      for (let i = 0; i < intervals; i++) {
        const timestamp = new Date((now - (intervals - i - 1) * intervalHours * 3600) * 1000);
        const timeStr = timeframe === '24h' 
          ? timestamp.getHours().toString().padStart(2, '0') + ':00'
          : timestamp.toLocaleDateString();

        // Simulate volume based on current TVL with some variation
        const baseVolume = currentTVL * 0.05 * (0.5 + Math.random()); // 2.5-5% of TVL
        const trades = Math.floor(Math.random() * 20) + 5;
        
        volumeData.push({
          time: timeStr,
          volume: baseVolume,
          trades,
        });

        // TVL with slight variation
        const tvlVariation = 0.8 + Math.random() * 0.4; // ±20% variation
        tvlData.push({
          time: timeStr,
          tvl: currentTVL * tvlVariation,
        });
      }

      const totalVolume = volumeData.reduce((sum, d) => sum + d.volume, 0);
      const totalTrades = volumeData.reduce((sum, d) => sum + d.trades, 0);

      setData({
        volumeData,
        tvlData,
        totalVolume,
        totalTrades,
        currentTVL,
      });

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, timeframe]);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalyticsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnalyticsData]);

  return {
    data,
    isLoading,
    error,
    refreshData: fetchAnalyticsData,
  };
};

