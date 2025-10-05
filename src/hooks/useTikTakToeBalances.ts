import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TIK_TAK_TOE_TOKENS, ERC20_ABI } from '../constants/tikTakToeContracts';

interface TokenBalance {
  symbol: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
}

interface UseBalancesReturn {
  balances: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTikTakToeBalances = (
  signer: ethers.JsonRpcSigner | null,
  address: string | null
): UseBalancesReturn => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!signer || !address) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = signer.provider;
      if (!provider) throw new Error('No provider available');

      const balancePromises = Object.values(TIK_TAK_TOE_TOKENS).map(async (token) => {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(address);
          const formattedBalance = ethers.formatUnits(balance, token.decimals);
          
          return {
            symbol: token.symbol,
            balance: balance.toString(),
            formattedBalance: parseFloat(formattedBalance).toFixed(6),
            decimals: token.decimals,
          };
        } catch (err) {
          console.error(`Error fetching balance for ${token.symbol}:`, err);
          return {
            symbol: token.symbol,
            balance: '0',
            formattedBalance: '0.000000',
            decimals: token.decimals,
          };
        }
      });

      const tokenBalances = await Promise.all(balancePromises);
      setBalances(tokenBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch: fetchBalances,
  };
};

