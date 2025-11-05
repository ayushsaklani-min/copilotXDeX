'use client';

import { useState } from 'react';
import { useYieldProjection, calculatePotentialEarnings } from '../../hooks/useYieldProjection';
import { ethers } from 'ethers';

interface YieldProjectionsProps {
  signer: ethers.JsonRpcSigner | null;
  pools: any[];
  reputationScore: number;
  onSelectPool?: (poolName: string) => void;
}

export default function YieldProjections({
  signer,
  pools,
  reputationScore,
  onSelectPool,
}: YieldProjectionsProps) {
  const { projections, isCalculating, refresh } = useYieldProjection(
    signer,
    pools,
    reputationScore
  );
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getYieldForTimeframe = (projection: any) => {
    switch (timeframe) {
      case 'daily':
        return projection.dailyYield;
      case 'weekly':
        return projection.weeklyYield;
      case 'monthly':
        return projection.monthlyYield;
    }
  };

  if (!signer) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6 text-center">
        <p className="text-gray-400">Connect wallet to see yield projections</p>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">📈 Yield Projections</h3>
        <button
          onClick={refresh}
          disabled={isCalculating}
          className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
        >
          {isCalculating ? '🔄' : '↻'}
        </button>
      </div>

      {/* Investment Calculator */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-gray-400">Investment Amount ($)</label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            className="w-32 bg-white/10 border border-cyan-500/30 rounded px-3 py-1 text-white text-right"
            min="0"
          />
        </div>
        <div className="flex space-x-2">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                timeframe === period
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isCalculating ? (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">📊</div>
          <p className="text-gray-400">Calculating yields...</p>
        </div>
      ) : projections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No pools available for yield projection</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projections.map((projection, idx) => {
            const potentialEarnings = calculatePotentialEarnings(
              investmentAmount,
              projection.estimatedAPR,
              timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30
            );

            return (
              <div
                key={idx}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => onSelectPool?.(projection.poolName)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">
                      {projection.poolName}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getRiskColor(
                          projection.impermanentLossRisk
                        )}`}
                      >
                        {projection.impermanentLossRisk.toUpperCase()} IL RISK
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">
                      {projection.estimatedAPR.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-400">APR</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-xs text-gray-400">TVL</div>
                    <div className="text-sm text-white font-semibold">
                      ${projection.tvl.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-xs text-gray-400">24h Volume</div>
                    <div className="text-sm text-white font-semibold">
                      ${projection.volume24h.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-xs text-gray-400">24h Fees</div>
                    <div className="text-sm text-white font-semibold">
                      ${projection.feeRevenue24h.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-500/10 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      Your {timeframe} earnings on ${investmentAmount}:
                    </span>
                    <span className="text-lg font-bold text-cyan-400">
                      ${potentialEarnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getYieldForTimeframe(projection).toFixed(3)}% {timeframe} yield
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  {projection.recommendation}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reputationScore >= 50 && (
        <div className="mt-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg p-3 border border-cyan-500/30">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎁</span>
            <div className="text-sm">
              <div className="text-white font-semibold">Reputation Bonus Active!</div>
              <div className="text-gray-300">
                Your {reputationScore} XP gives you{' '}
                {reputationScore >= 500
                  ? '+50%'
                  : reputationScore >= 100
                  ? '+30%'
                  : '+15%'}{' '}
                bonus yield
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        Projections based on current pool data and 24h volume estimates
      </div>
    </div>
  );
}
