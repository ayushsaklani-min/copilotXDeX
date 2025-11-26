/**
 * Hook for interacting with BondingCurveFactoryV2
 */
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { contractAddresses, CurveType } from '@/config/contracts-v2';
import BondingCurveFactoryV2ABI from '@/config/abis/BondingCurveFactoryV2.json';

export function useBondingCurveFactory() {
  // Read total tokens
  const { data: totalTokens } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV2ABI,
    functionName: 'getTotalTokens',
  });

  // Read creation fee
  const { data: creationFee } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV2ABI,
    functionName: 'creationFee',
  });

  return {
    totalTokens: totalTokens ? Number(totalTokens) : 0,
    creationFee: creationFee ? creationFee.toString() : '0',
  };
}

export function useGetTokenInfo(tokenAddress: string) {
  const { data: tokenInfo, isLoading } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV2ABI,
    functionName: 'getTokenInfo',
    args: [tokenAddress],
    query: {
      enabled: !!tokenAddress,
    },
  });

  return {
    tokenInfo,
    isLoading,
  };
}

export function useGetCreatorTokens(creatorAddress: string) {
  const { data: tokens, isLoading, refetch } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV2ABI,
    functionName: 'getCreatorTokens',
    args: [creatorAddress],
    query: {
      enabled: !!creatorAddress,
    },
  });

  return {
    tokens: tokens as string[] | undefined,
    isLoading,
    refetch,
  };
}

export function useRegisterToken() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const registerToken = (
    tokenAddress: string,
    name: string,
    symbol: string,
    curveType: CurveType,
    initialPrice: string,
    creationFee: string
  ) => {
    writeContract({
      address: contractAddresses.bondingCurveFactory as `0x${string}`,
      abi: BondingCurveFactoryV2ABI,
      functionName: 'registerToken',
      args: [tokenAddress, name, symbol, curveType, parseEther(initialPrice)],
      value: parseEther(creationFee),
    });
  };

  return {
    registerToken,
    isLoading: isPending,
    isSuccess,
    data,
  };
}

export default {
  useBondingCurveFactory,
  useGetTokenInfo,
  useGetCreatorTokens,
  useRegisterToken,
};
