/**
 * Hook for interacting with LiquidityController
 */
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { contractAddresses } from '@/config/contracts-v2';
import LiquidityControllerABI from '@/config/abis/LiquidityController.json';

export function useLockLiquidity() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const lockLiquidity = (
    tokenAddress: string,
    lpTokenAddress: string,
    amount: string,
    durationDays: number
  ) => {
    const durationSeconds = durationDays * 24 * 60 * 60;
    const percentage = 100; // Lock 100% of the specified amount

    writeContract({
      address: contractAddresses.liquidityController as `0x${string}`,
      abi: LiquidityControllerABI,
      functionName: 'lockLiquidity',
      args: [
        tokenAddress,
        lpTokenAddress,
        parseEther(amount),
        durationSeconds,
        percentage
      ],
    });
  };

  return {
    lockLiquidity,
    isLoading: isPending,
    isSuccess,
    txHash: data,
  };
}

export function useGetLockInfo(lockId: number) {
  const { data: lockInfo, isLoading } = useReadContract({
    address: contractAddresses.liquidityController as `0x${string}`,
    abi: LiquidityControllerABI,
    functionName: 'locks',
    args: [lockId],
    query: {
      enabled: lockId > 0,
    },
  });

  return {
    lockInfo,
    isLoading,
  };
}

export function useGetUserLocks(userAddress: string) {
  const { data: lockIds, isLoading } = useReadContract({
    address: contractAddresses.liquidityController as `0x${string}`,
    abi: LiquidityControllerABI,
    functionName: 'getUserLocks',
    args: [userAddress],
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    lockIds: lockIds as number[] | undefined,
    isLoading,
  };
}

export function useUnlockLiquidity() {
  const { writeContract, isPending, isSuccess, data } = useWriteContract();

  const unlockLiquidity = (lockId: number) => {
    writeContract({
      address: contractAddresses.liquidityController as `0x${string}`,
      abi: LiquidityControllerABI,
      functionName: 'unlockLiquidity',
      args: [lockId],
    });
  };

  return {
    unlockLiquidity,
    isLoading: isPending,
    isSuccess,
    txHash: data,
  };
}

export default {
  useLockLiquidity,
  useGetLockInfo,
  useGetUserLocks,
  useUnlockLiquidity,
};
