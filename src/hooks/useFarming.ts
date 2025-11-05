import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface FarmPool {
  pid: number;
  name: string;
  lpToken: string;
  allocPoint: number;
  totalStaked: string;
  apr: number;
  active: boolean;
}

interface UserFarmInfo {
  stakedAmount: string;
  pendingRewards: string;
  totalEarned: string;
  reputationMultiplier: number;
}

interface UseFarmingReturn {
  pools: FarmPool[];
  userInfo: Record<number, UserFarmInfo>;
  isLoading: boolean;
  error: string | null;
  deposit: (pid: number, amount: string) => Promise<string | null>;
  withdraw: (pid: number, amount: string) => Promise<string | null>;
  harvest: (pid: number) => Promise<string | null>;
  compound: (pid: number) => Promise<string | null>;
  refreshData: () => Promise<void>;
}

const FARM_ABI = [
  'function poolLength() view returns (uint256)',
  'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardTime, uint256 accRewardPerShare, uint256 totalStaked, bool active)',
  'function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards, uint256 lastStakeTime, uint256 totalEarned)',
  'function pendingReward(uint256, address) view returns (uint256)',
  'function getPoolAPR(uint256) view returns (uint256)',
  'function getReputationMultiplier(address) view returns (uint256)',
  'function deposit(uint256, uint256)',
  'function withdraw(uint256, uint256)',
  'function harvest(uint256)',
  'function compound(uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
];

export function useFarming(
  signer: ethers.JsonRpcSigner | null,
  address: string | null,
  farmAddress: string,
  poolNames: Record<string, string> = {}
): UseFarmingReturn {
  const [pools, setPools] = useState<FarmPool[]>([]);
  const [userInfo, setUserInfo] = useState<Record<number, UserFarmInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!signer || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const farm = new ethers.Contract(farmAddress, FARM_ABI, signer);

      // Get pool count
      const poolLength = await farm.poolLength();
      const poolsData: FarmPool[] = [];
      const userInfoData: Record<number, UserFarmInfo> = {};

      // Track seen LP tokens to avoid duplicates
      const seenLpTokens = new Set<string>();
      
      // Fetch each pool
      for (let pid = 0; pid < Number(poolLength); pid++) {
        try {
          const poolInfo = await farm.poolInfo(pid);
          const lpTokenLower = poolInfo.lpToken.toLowerCase();
          
          // Skip if we've already seen this LP token
          if (seenLpTokens.has(lpTokenLower)) {
            console.log(`Skipping duplicate pool ${pid} with LP token ${poolInfo.lpToken}`);
            continue;
          }
          
          seenLpTokens.add(lpTokenLower);
          
          const apr = await farm.getPoolAPR(pid);
          const pending = await farm.pendingReward(pid, address);
          const userInfoRaw = await farm.userInfo(pid, address);
          const multiplier = await farm.getReputationMultiplier(address);

          poolsData.push({
            pid,
            name: poolNames[poolInfo.lpToken.toLowerCase()] || `Pool ${pid}`,
            lpToken: poolInfo.lpToken,
            allocPoint: Number(poolInfo.allocPoint),
            totalStaked: ethers.formatEther(poolInfo.totalStaked),
            apr: Number(apr) / 100, // Convert from basis points
            active: poolInfo.active,
          });

          userInfoData[pid] = {
            stakedAmount: ethers.formatEther(userInfoRaw.amount),
            pendingRewards: ethers.formatEther(pending),
            totalEarned: ethers.formatEther(userInfoRaw.totalEarned),
            reputationMultiplier: Number(multiplier) / 10000, // Convert from basis points
          };
        } catch (err) {
          console.error(`Error loading pool ${pid}:`, err);
        }
      }

      setPools(poolsData);
      setUserInfo(userInfoData);
    } catch (err) {
      console.error('Error refreshing farm data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load farm data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address, farmAddress, poolNames]);

  const deposit = useCallback(
    async (pid: number, amount: string): Promise<string | null> => {
      if (!signer || !address) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const farm = new ethers.Contract(farmAddress, FARM_ABI, signer);
        const pool = pools.find((p) => p.pid === pid);
        if (!pool) throw new Error('Pool not found');

        const amountWei = ethers.parseEther(amount);

        // Approve LP token
        const lpToken = new ethers.Contract(pool.lpToken, ERC20_ABI, signer);
        const allowance = await lpToken.allowance(address, farmAddress);

        if (allowance < amountWei) {
          const approveTx = await lpToken.approve(farmAddress, amountWei);
          await approveTx.wait();
        }

        // Deposit
        const tx = await farm.deposit(pid, amountWei, { gasLimit: 300000 });
        const receipt = await tx.wait();

        await refreshData();
        return receipt.hash;
      } catch (err) {
        console.error('Error depositing:', err);
        setError(err instanceof Error ? err.message : 'Deposit failed');
        return null;
      }
    },
    [signer, address, farmAddress, pools, refreshData]
  );

  const withdraw = useCallback(
    async (pid: number, amount: string): Promise<string | null> => {
      if (!signer || !address) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const farm = new ethers.Contract(farmAddress, FARM_ABI, signer);
        const amountWei = ethers.parseEther(amount);

        const tx = await farm.withdraw(pid, amountWei, { gasLimit: 300000 });
        const receipt = await tx.wait();

        await refreshData();
        return receipt.hash;
      } catch (err) {
        console.error('Error withdrawing:', err);
        setError(err instanceof Error ? err.message : 'Withdraw failed');
        return null;
      }
    },
    [signer, address, farmAddress, refreshData]
  );

  const harvest = useCallback(
    async (pid: number): Promise<string | null> => {
      if (!signer || !address) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const farm = new ethers.Contract(farmAddress, FARM_ABI, signer);

        const tx = await farm.harvest(pid, { gasLimit: 300000 });
        const receipt = await tx.wait();

        await refreshData();
        return receipt.hash;
      } catch (err) {
        console.error('Error harvesting:', err);
        setError(err instanceof Error ? err.message : 'Harvest failed');
        return null;
      }
    },
    [signer, address, farmAddress, refreshData]
  );

  const compound = useCallback(
    async (pid: number): Promise<string | null> => {
      if (!signer || !address) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const farm = new ethers.Contract(farmAddress, FARM_ABI, signer);

        const tx = await farm.compound(pid, { gasLimit: 300000 });
        const receipt = await tx.wait();

        await refreshData();
        return receipt.hash;
      } catch (err) {
        console.error('Error compounding:', err);
        setError(err instanceof Error ? err.message : 'Compound failed');
        return null;
      }
    },
    [signer, address, farmAddress, refreshData]
  );

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    pools,
    userInfo,
    isLoading,
    error,
    deposit,
    withdraw,
    harvest,
    compound,
    refreshData,
  };
}
