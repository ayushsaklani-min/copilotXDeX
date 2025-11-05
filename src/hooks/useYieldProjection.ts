import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface YieldProjection {
  poolName: string;
  token0: string;
  token1: string;
  estimatedAPR: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  tvl: number;
  volume24h: number;
  feeRevenue24h: number;
  impermanentLossRisk: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface Pool {
  name: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  tvl: number;
}

export function useYieldProjection(
  signer: ethers.JsonRpcSigner | null,
  pools: Pool[],
  reputationScore: number = 0
) {
  const [projections, setProjections] = useState<YieldProjection[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateYield = useCallback(async () => {
    if (!signer || pools.length === 0) return;

    setIsCalculating(true);
    try {
      const newProjections: YieldProjection[] = [];

      for (const pool of pools) {
        // Estimate 24h volume (simplified - in production, track actual swaps)
        const estimatedVolume24h = pool.tvl * 0.5; // Assume 50% daily turnover

        // Calculate fee revenue (0.3% base fee)
        const baseFeeRate = 0.003;
        const feeRevenue24h = estimatedVolume24h * baseFeeRate;

        // Calculate APR
        const annualFeeRevenue = feeRevenue24h * 365;
        const baseAPR = pool.tvl > 0 ? (annualFeeRevenue / pool.tvl) * 100 : 0;

        // Apply reputation multiplier
        const reputationMultiplier = getReputationMultiplier(reputationScore);
        const adjustedAPR = baseAPR * reputationMultiplier;

        // Calculate yields
        const dailyYield = (adjustedAPR / 365) / 100;
        const weeklyYield = dailyYield * 7;
        const monthlyYield = dailyYield * 30;

        // Assess impermanent loss risk
        const reserve0 = parseFloat(pool.reserve0);
        const reserve1 = parseFloat(pool.reserve1);
        const ratio = reserve0 / reserve1;
        const ilRisk = assessILRisk(ratio);

        // Generate recommendation
        const recommendation = generateRecommendation(
          adjustedAPR,
          ilRisk,
          pool.tvl,
          reputationScore
        );

        newProjections.push({
          poolName: pool.name,
          token0: pool.token0,
          token1: pool.token1,
          estimatedAPR: adjustedAPR,
          dailyYield: dailyYield * 100,
          weeklyYield: weeklyYield * 100,
          monthlyYield: monthlyYield * 100,
          tvl: pool.tvl,
          volume24h: estimatedVolume24h,
          feeRevenue24h: feeRevenue24h,
          impermanentLossRisk: ilRisk,
          recommendation: recommendation,
        });
      }

      // Sort by APR (highest first)
      newProjections.sort((a, b) => b.estimatedAPR - a.estimatedAPR);
      setProjections(newProjections);
    } catch (error) {
      console.error('Error calculating yield:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [signer, pools, reputationScore]);

  useEffect(() => {
    calculateYield();
    const interval = setInterval(calculateYield, 120000); // Every 2 minutes
    return () => clearInterval(interval);
  }, [calculateYield]);

  return {
    projections,
    isCalculating,
    refresh: calculateYield,
  };
}

function getReputationMultiplier(score: number): number {
  // Higher reputation = better yields
  if (score >= 500) return 1.5; // 50% bonus
  if (score >= 100) return 1.3; // 30% bonus
  if (score >= 50) return 1.15; // 15% bonus
  return 1.0; // No bonus
}

function assessILRisk(reserveRatio: number): 'low' | 'medium' | 'high' {
  // Balanced pools have lower IL risk
  if (reserveRatio > 0.8 && reserveRatio < 1.25) return 'low';
  if (reserveRatio > 0.5 && reserveRatio < 2.0) return 'medium';
  return 'high';
}

function generateRecommendation(
  apr: number,
  ilRisk: 'low' | 'medium' | 'high',
  tvl: number,
  reputationScore: number
): string {
  const recommendations: string[] = [];

  // APR-based recommendations
  if (apr > 50) {
    recommendations.push('🔥 Excellent APR');
  } else if (apr > 20) {
    recommendations.push('✅ Good APR');
  } else if (apr > 10) {
    recommendations.push('⚠️ Moderate APR');
  } else {
    recommendations.push('❌ Low APR');
  }

  // IL risk
  if (ilRisk === 'low') {
    recommendations.push('Low IL risk');
  } else if (ilRisk === 'medium') {
    recommendations.push('Medium IL risk');
  } else {
    recommendations.push('⚠️ High IL risk');
  }

  // TVL-based
  if (tvl > 10000) {
    recommendations.push('High liquidity');
  } else if (tvl > 1000) {
    recommendations.push('Moderate liquidity');
  } else {
    recommendations.push('Low liquidity');
  }

  // Reputation bonus
  if (reputationScore >= 100) {
    recommendations.push(`+${getReputationMultiplier(reputationScore) * 100 - 100}% reputation bonus`);
  }

  return recommendations.join(' • ');
}

// Helper function to calculate potential earnings
export function calculatePotentialEarnings(
  investmentAmount: number,
  apr: number,
  days: number
): number {
  const dailyRate = apr / 365 / 100;
  return investmentAmount * dailyRate * days;
}

// Helper function to calculate impermanent loss
export function calculateImpermanentLoss(
  priceRatio: number
): number {
  // IL formula: 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
  return Math.abs(il) * 100;
}
