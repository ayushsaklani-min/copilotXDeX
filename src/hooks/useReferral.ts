import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface ReferralInfo {
  referrer: string;
  referralCount: number;
  totalEarnedXP: number;
  registeredAt: number;
  isRegistered: boolean;
}

interface ReferralStats {
  level1Count: number;
  level2Count: number;
  totalXPEarned: number;
  currentReputation: number;
}

interface GlobalStats {
  totalReferrals: number;
  totalXPDistributed: number;
  averageReferralsPerUser: number;
}

interface UseReferralReturn {
  referralInfo: ReferralInfo | null;
  referralStats: ReferralStats | null;
  referrals: string[];
  globalStats: GlobalStats | null;
  canRefer: boolean;
  isLoading: boolean;
  error: string | null;
  registerReferral: (referrerAddress: string) => Promise<string | null>;
  refreshData: () => Promise<void>;
  generateReferralLink: () => string;
}

const REFERRAL_ABI = [
  'function referralInfo(address) view returns (address referrer, uint256 referralCount, uint256 totalEarnedXP, uint256 registeredAt, bool isRegistered)',
  'function getReferralStats(address) view returns (uint256 level1Count, uint256 level2Count, uint256 totalXPEarned, uint256 currentReputation)',
  'function getReferrals(address) view returns (address[])',
  'function getGlobalStats() view returns (uint256 totalReferrals, uint256 totalXPDistributed, uint256 averageReferralsPerUser)',
  'function canRefer(address) view returns (bool)',
  'function registerReferral(address)',
  'function REFERRER_BONUS() view returns (uint256)',
  'function REFEREE_BONUS() view returns (uint256)',
  'function LEVEL2_BONUS() view returns (uint256)',
];

export function useReferral(
  signer: ethers.JsonRpcSigner | null,
  address: string | null,
  referralAddress: string
): UseReferralReturn {
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [canRefer, setCanRefer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!signer || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const referral = new ethers.Contract(referralAddress, REFERRAL_ABI, signer);

      // Get referral info
      const info = await referral.referralInfo(address);
      setReferralInfo({
        referrer: info.referrer,
        referralCount: Number(info.referralCount),
        totalEarnedXP: Number(info.totalEarnedXP),
        registeredAt: Number(info.registeredAt),
        isRegistered: info.isRegistered,
      });

      // Get referral stats
      const stats = await referral.getReferralStats(address);
      setReferralStats({
        level1Count: Number(stats.level1Count),
        level2Count: Number(stats.level2Count),
        totalXPEarned: Number(stats.totalXPEarned),
        currentReputation: Number(stats.currentReputation),
      });

      // Get list of referrals
      const referralsList = await referral.getReferrals(address);
      setReferrals(referralsList);

      // Get global stats
      const global = await referral.getGlobalStats();
      setGlobalStats({
        totalReferrals: Number(global.totalReferrals),
        totalXPDistributed: Number(global.totalXPDistributed),
        averageReferralsPerUser: Number(global.averageReferralsPerUser),
      });

      // Check if user can refer
      const canReferResult = await referral.canRefer(address);
      setCanRefer(canReferResult);
    } catch (err) {
      console.error('Error refreshing referral data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address, referralAddress]);

  const registerReferral = useCallback(
    async (referrerAddress: string): Promise<string | null> => {
      if (!signer || !address) {
        setError('Wallet not connected');
        return null;
      }

      if (!ethers.isAddress(referrerAddress)) {
        setError('Invalid referrer address');
        return null;
      }

      try {
        const referral = new ethers.Contract(referralAddress, REFERRAL_ABI, signer);

        const tx = await referral.registerReferral(referrerAddress, { gasLimit: 300000 });
        const receipt = await tx.wait();

        await refreshData();
        return receipt.hash;
      } catch (err) {
        console.error('Error registering referral:', err);
        setError(err instanceof Error ? err.message : 'Registration failed');
        return null;
      }
    },
    [signer, address, referralAddress, refreshData]
  );

  const generateReferralLink = useCallback((): string => {
    if (!address) return '';
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/referrals?ref=${address}`;
  }, [address]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    referralInfo,
    referralStats,
    referrals,
    globalStats,
    canRefer,
    isLoading,
    error,
    registerReferral,
    refreshData,
    generateReferralLink,
  };
}

// Helper function to parse referral code from URL
export function getReferralCodeFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

// Helper function to calculate potential earnings
export function calculatePotentialEarnings(directReferrals: number, level2Referrals: number): number {
  const REFERRER_BONUS = 10;
  const LEVEL2_BONUS = 3;
  
  return (directReferrals * REFERRER_BONUS) + (level2Referrals * LEVEL2_BONUS);
}
