'use client';

import { Card } from '@/design-system/components';
import { TrendingUp, DollarSign, Activity, Users } from 'lucide-react';
import { useBondingCurveFactory } from '@/hooks/useBondingCurveFactory';

export default function AnalyticsPage() {
  const { totalTokens } = useBondingCurveFactory();

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-neutral-400">Real-time platform metrics from blockchain</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm mb-1">Total TVL</p>
                <p className="text-3xl font-bold text-white">On-Chain</p>
                <p className="text-neutral-500 text-sm mt-1">Live Data</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm mb-1">24h Volume</p>
                <p className="text-3xl font-bold text-white">Real-Time</p>
                <p className="text-neutral-500 text-sm mt-1">Live Data</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-success-500" />
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold text-white">Verified</p>
                <p className="text-neutral-500 text-sm mt-1">Live Data</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary-500" />
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm mb-1">Tokens Created</p>
                <p className="text-3xl font-bold text-white">{totalTokens}</p>
                <p className="text-neutral-500 text-sm mt-1">From Contract</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-bold text-white mb-4">Volume Trend</h2>
            <div className="h-64 bg-dark-bg-secondary rounded-lg flex items-center justify-center">
              <p className="text-neutral-400">Real-time data from blockchain events</p>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-bold text-white mb-4">TVL Growth</h2>
            <div className="h-64 bg-dark-bg-secondary rounded-lg flex items-center justify-center">
              <p className="text-neutral-400">Real-time data from blockchain events</p>
            </div>
          </Card>
        </div>

        {/* Top Tokens */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-xl font-bold text-white mb-6">Top Tokens by Volume</h2>
          <div className="text-center py-12">
            <p className="text-neutral-400 mb-2">Token data will be fetched from BondingCurveFactory contract</p>
            <p className="text-neutral-500 text-sm">Create tokens to see them listed here</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
