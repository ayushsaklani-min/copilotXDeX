import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  TIK_TAK_TOE_CONTRACTS, 
  TIK_TAK_TOE_TOKENS, 
  ERC20_ABI, 
  SWAP_CONTRACT_ABI,
  POLYGON_AMOY_CONFIG 
} from '../constants/tikTakToeContracts';

interface SwapParams {
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: string;
}

interface SwapResult {
  txHash: string;
  amountOut: string;
}

interface UseSwapReturn {
  isApproving: boolean;
  isSwapping: boolean;
  estimatedOutput: string | null;
  error: string | null;
  approveToken: (tokenSymbol: string, amount: string) => Promise<boolean>;
  swapTokens: (params: SwapParams) => Promise<SwapResult | null>;
  estimateOutput: (params: SwapParams) => Promise<string | null>;
  checkAllowance: (tokenSymbol: string, amount: string) => Promise<boolean>;
  syncReserves: () => Promise<boolean>;
}

export const useTikTakToeSwap = (
  signer: ethers.JsonRpcSigner | null,
  address: string | null
): UseSwapReturn => {
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has sufficient allowance for the swap
  const checkAllowance = useCallback(async (tokenSymbol: string, amount: string): Promise<boolean> => {
    if (!signer || !address) return false;

    try {
      const token = TIK_TAK_TOE_TOKENS[tokenSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      if (!token) throw new Error(`Token ${tokenSymbol} not found`);

      const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
      const allowance = await contract.allowance(address, TIK_TAK_TOE_CONTRACTS.SWAP_CONTRACT);
      const amountWei = ethers.parseUnits(amount, token.decimals);

      return allowance >= amountWei;
    } catch (err) {
      console.error('Error checking allowance:', err);
      return false;
    }
  }, [signer, address]);

  // Approve token spending
  const approveToken = useCallback(async (tokenSymbol: string, amount: string): Promise<boolean> => {
    if (!signer || !address) {
      setError('Wallet not connected');
      return false;
    }

    setIsApproving(true);
    setError(null);

    try {
      const token = TIK_TAK_TOE_TOKENS[tokenSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      if (!token) throw new Error(`Token ${tokenSymbol} not found`);

      const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
      const amountWei = ethers.parseUnits(amount, token.decimals);

      const tx = await contract.approve(TIK_TAK_TOE_CONTRACTS.SWAP_CONTRACT, amountWei);
      await tx.wait();

      return true;
    } catch (err) {
      console.error('Error approving token:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve token');
      return false;
    } finally {
      setIsApproving(false);
    }
  }, [signer, address]);

  // Estimate output amount using the formula provided
  const estimateOutput = useCallback(async (params: SwapParams): Promise<string | null> => {
    if (!signer) return null;

    try {
      const tokenIn = TIK_TAK_TOE_TOKENS[params.tokenInSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      const tokenOut = TIK_TAK_TOE_TOKENS[params.tokenOutSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      
      if (!tokenIn || !tokenOut) return null;

      const swapContract = new ethers.Contract(TIK_TAK_TOE_CONTRACTS.SWAP_CONTRACT, SWAP_CONTRACT_ABI, signer);
      
      // Get reserves for both tokens
      const [reserveIn, reserveOut] = await Promise.all([
        swapContract.reserve(tokenIn.address),
        swapContract.reserve(tokenOut.address)
      ]);

      if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        return '0';
      }

      const amountInWei = ethers.parseUnits(params.amountIn, tokenIn.decimals);
      
      // Apply the formula: amountInWithFee = amountIn * 997
      const amountInWithFee = amountInWei * BigInt(997);
      
      // numerator = amountInWithFee * reserveOut
      const numerator = amountInWithFee * reserveOut;
      
      // denominator = (reserveIn * 1000) + amountInWithFee
      const denominator = (reserveIn * BigInt(1000)) + amountInWithFee;
      
      // amountOut = numerator / denominator
      const amountOutWei = numerator / denominator;
      
      // Convert back to human readable format
      const formattedOutput = ethers.formatUnits(amountOutWei, tokenOut.decimals);
      
      return parseFloat(formattedOutput).toFixed(6);
    } catch (err) {
      console.error('Error estimating output:', err);
      return null;
    }
  }, [signer]);

  // Execute the swap
  const swapTokens = useCallback(async (params: SwapParams): Promise<SwapResult | null> => {
    if (!signer || !address) {
      setError('Wallet not connected');
      return null;
    }

    setIsSwapping(true);
    setError(null);

    try {
      const tokenIn = TIK_TAK_TOE_TOKENS[params.tokenInSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      const tokenOut = TIK_TAK_TOE_TOKENS[params.tokenOutSymbol.toUpperCase() as keyof typeof TIK_TAK_TOE_TOKENS];
      
      if (!tokenIn || !tokenOut) {
        throw new Error('Invalid token symbols');
      }

      const swapContract = new ethers.Contract(TIK_TAK_TOE_CONTRACTS.SWAP_CONTRACT, SWAP_CONTRACT_ABI, signer);
      const amountInWei = ethers.parseUnits(params.amountIn, tokenIn.decimals);

      // First, let's check if the contract has sufficient reserves
      const [reserveIn, reserveOut] = await Promise.all([
        swapContract.reserve(tokenIn.address),
        swapContract.reserve(tokenOut.address)
      ]);

      console.log('Reserves:', {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
        amountIn: amountInWei.toString()
      });

      if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        throw new Error(`Insufficient reserves: ${tokenIn.symbol} reserve: ${reserveIn.toString()}, ${tokenOut.symbol} reserve: ${reserveOut.toString()}`);
      }

      // Try to estimate the swap first
      try {
        const estimatedAmountOut = await swapContract.swap.staticCall(tokenIn.address, tokenOut.address, amountInWei);
        console.log('Estimated amount out:', estimatedAmountOut.toString());
      } catch (estimateError) {
        console.error('Estimate failed:', estimateError);
        throw new Error('Swap estimation failed - contract may not have sufficient liquidity');
      }

      // Execute the swap
      const tx = await swapContract.swap(tokenIn.address, tokenOut.address, amountInWei);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Get the actual amount out from the transaction logs or call the contract
      const actualAmountOut = await swapContract.swap.staticCall(tokenIn.address, tokenOut.address, amountInWei);
      const formattedAmountOut = ethers.formatUnits(actualAmountOut, tokenOut.decimals);

      return {
        txHash: receipt.hash,
        amountOut: parseFloat(formattedAmountOut).toFixed(6),
      };
    } catch (err) {
      console.error('Error executing swap:', err);
      setError(err instanceof Error ? err.message : 'Swap failed');
      return null;
    } finally {
      setIsSwapping(false);
    }
  }, [signer, address]);

  // Sync reserves function
  const syncReserves = useCallback(async (): Promise<boolean> => {
    if (!signer) return false;

    try {
      const swapContract = new ethers.Contract(TIK_TAK_TOE_CONTRACTS.SWAP_CONTRACT, SWAP_CONTRACT_ABI, signer);
      const tokenAddresses = Object.values(TIK_TAK_TOE_TOKENS).map(token => token.address);
      
      const tx = await swapContract.syncReserves(tokenAddresses);
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error syncing reserves:', err);
      return false;
    }
  }, [signer]);

  return {
    isApproving,
    isSwapping,
    estimatedOutput,
    error,
    approveToken,
    swapTokens,
    estimateOutput,
    checkAllowance,
    syncReserves,
  };
};
