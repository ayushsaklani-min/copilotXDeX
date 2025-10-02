import { useState, useCallback } from 'react';

interface AssetChange {
  type: 'SEND' | 'RECEIVE';
  symbol: string;
  amount: string;
  usdValue: number;
}

interface SimulationData {
  assetChanges: AssetChange[];
  gasFeeUSD: number;
  warnings: string[];
}

interface UnsignedTransaction {
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export function useTransactionSimulator() {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateTransaction = useCallback(async (unsignedTx: UnsignedTransaction, chainId: number) => {
    setIsLoading(true);
    setError(null);
    setSimulationData(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unsignedTx,
          chainId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simulation API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Simulation failed');
        } catch {
          throw new Error(`Simulation failed: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      setSimulationData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Simulation failed';
      setError(errorMessage);
      console.error('Transaction simulation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSimulation = useCallback(() => {
    setSimulationData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    simulateTransaction,
    clearSimulation,
    simulationData,
    isLoading,
    error,
  };
}

