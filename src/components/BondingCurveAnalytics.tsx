'use client';

import { useState } from 'react';
import { Card } from '@/design-system/components';
import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';

interface BondingCurveAnalyticsProps {
  tokenAddress: string;
  curveType: 'LINEAR' | 'EXPONENTIAL' | 'SIGMOID';
  currentPrice: number;
  currentSupply: number;
  initialPrice: number;
}

export function BondingCurveAnalytics({
  tokenAddress,
  curveType,
  currentPrice,
  currentSupply,
  initialPrice,
}: BondingCurveAnalyticsProps) {
  const [buyAmount, setBuyAmount] = useState('1');
  const [sellAmount, setSellAmount] = useState('100');

  // Calculate price impact
  const calculatePriceImpact = (amount: number, isBuy: boolean) => {
    // Simplified calculation - real implementation would use bonding curve math
    const impact = (amount / currentSupply) * 100;
    return Math.min(impact, 100);
  };

  const buyImpact = calculatePriceImpact(parseFloat(buyAmount) || 0, true);
  const sellImpact = calculatePriceImpact(parseFloat(sellAmount) || 0, false);

  // Calculate projected prices at different supply levels
  const projections = [
    { supply: currentSupply * 1.1, label: '+10% Supply' },
    { supply: currentSupply * 1.25, label: '+25% Supply' },
    { supply: currentSupply * 1.5, label: '+50% Supply' },
    { supply: currentSupply * 2, label: '+100% Supply' },
  ].map(proj => ({
    ...proj,
    price: calculateProjectedPrice(proj.supply, curveType, initialPrice),
    change: ((calculateProjectedPrice(proj.supply, curveType, initialPrice) - currentPrice) / currentPrice) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Price Impact Calculator */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-500" />
          Price Impact Calculator
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buy Impact */}
          <div className="space-y-3">
            <label className="block text-sm text-neutral-400">Buy Amount (MATIC)</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
              placeholder="1.0"
              step="0.1"
            />
            <div className="p-4 bg-success-500/10 border border-success-500 rounded-lg">
              <p className="text-neutral-400 text-sm mb-1">Price Impact</p>
              <p className={`text-2xl font-bold ${buyImpact > 5 ? 'text-warning-500' : 'text-success-500'}`}>
                +{buyImpact.toFixed(2)}%
              </p>
              <p className="text-neutral-500 text-xs mt-1">
                {buyImpact > 5 ? '⚠️ High impact' : '✓ Low impact'}
              </p>
            </div>
          </div>

          {/* Sell Impact */}
          <div className="space-y-3">
            <label className="block text-sm text-neutral-400">Sell Amount (Tokens)</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
              placeholder="100"
              step="10"
            />
            <div className="p-4 bg-error-500/10 border border-error-500 rounded-lg">
              <p className="text-neutral-400 text-sm mb-1">Price Impact</p>
              <p className={`text-2xl font-bold ${sellImpact > 5 ? 'text-error-500' : 'text-warning-500'}`}>
                -{sellImpact.toFixed(2)}%
              </p>
              <p className="text-neutral-500 text-xs mt-1">
                {sellImpact > 5 ? '⚠️ High impact' : '✓ Low impact'}
              </p>
            </div>
          </div>
        </div>

        {buyImpact > 10 && (
          <div className="mt-4 p-3 bg-warning-500/10 border border-warning-500 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning-500 font-medium text-sm">High Price Impact Warning</p>
              <p className="text-warning-400 text-xs mt-1">
                Consider splitting your trade into smaller amounts to reduce slippage
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Price Projections */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Price Projections
        </h3>
        
        <div className="space-y-3">
          {projections.map((proj, i) => (
            <div key={i} className="p-4 bg-dark-bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-sm">{proj.label}</span>
                <span className={`text-sm font-medium ${proj.change > 0 ? 'text-success-500' : 'text-error-500'}`}>
                  {proj.change > 0 ? '+' : ''}{proj.change.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">{proj.price.toFixed(6)} MATIC</span>
                <span className="text-neutral-500 text-xs">{proj.supply.toLocaleString()} supply</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ROI Calculator */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-500" />
          ROI Calculator
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-bg-secondary rounded-lg">
            <p className="text-neutral-400 text-sm mb-1">Entry Price</p>
            <p className="text-xl font-bold text-white">{initialPrice.toFixed(6)}</p>
            <p className="text-neutral-500 text-xs mt-1">Initial</p>
          </div>
          
          <div className="p-4 bg-dark-bg-secondary rounded-lg">
            <p className="text-neutral-400 text-sm mb-1">Current Price</p>
            <p className="text-xl font-bold text-white">{currentPrice.toFixed(6)}</p>
            <p className="text-success-500 text-xs mt-1">
              +{(((currentPrice - initialPrice) / initialPrice) * 100).toFixed(2)}%
            </p>
          </div>
          
          <div className="p-4 bg-dark-bg-secondary rounded-lg">
            <p className="text-neutral-400 text-sm mb-1">If 2x Supply</p>
            <p className="text-xl font-bold text-white">
              {calculateProjectedPrice(currentSupply * 2, curveType, initialPrice).toFixed(6)}
            </p>
            <p className="text-primary-500 text-xs mt-1">Projected</p>
          </div>
        </div>
      </Card>

      {/* Curve Comparison */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-bold text-white mb-4">Curve Type Comparison</h3>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${curveType === 'LINEAR' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-border-primary bg-dark-bg-secondary'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-bold">Linear Curve</h4>
              {curveType === 'LINEAR' && <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">Active</span>}
            </div>
            <p className="text-neutral-400 text-sm mb-2">Steady, predictable price growth</p>
            <p className="text-neutral-500 text-xs">Best for: Stable projects, long-term holds</p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${curveType === 'EXPONENTIAL' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-border-primary bg-dark-bg-secondary'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-bold">Exponential Curve</h4>
              {curveType === 'EXPONENTIAL' && <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">Active</span>}
            </div>
            <p className="text-neutral-400 text-sm mb-2">Rapid price appreciation with supply</p>
            <p className="text-neutral-500 text-xs">Best for: High-growth projects, early adopters</p>
          </div>

          <div className={`p-4 rounded-lg border-2 ${curveType === 'SIGMOID' ? 'border-primary-500 bg-primary-500/10' : 'border-dark-border-primary bg-dark-bg-secondary'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-bold">Sigmoid Curve</h4>
              {curveType === 'SIGMOID' && <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">Active</span>}
            </div>
            <p className="text-neutral-400 text-sm mb-2">S-curve with controlled ceiling</p>
            <p className="text-neutral-500 text-xs">Best for: Balanced growth, price stability</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper function to calculate projected price
function calculateProjectedPrice(supply: number, curveType: string, initialPrice: number): number {
  switch (curveType) {
    case 'LINEAR':
      return initialPrice + (supply * 0.000001);
    case 'EXPONENTIAL':
      return initialPrice * Math.pow(1.001, supply);
    case 'SIGMOID':
      const midpoint = 1000000;
      return (initialPrice * 2) / (1 + Math.exp(-0.000001 * (supply - midpoint)));
    default:
      return initialPrice;
  }
}

export default BondingCurveAnalytics;
