// Pool analytics component
'use client';

import { Card } from './ui/card';
import { MOCK_POOLS } from '../lib/mock-data';
import { TrendingUp, DollarSign, Activity, Percent } from 'lucide-react';

export function PoolAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-2 cyber-border backdrop-blur-sm bg-card/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-300">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4 text-accent" />
            <span className="text-sm">Total TVL</span>
          </div>
          <p className="text-2xl text-accent drop-shadow-[0_0_10px_var(--neon-cyan)]">${(MOCK_POOLS.reduce((sum, p) => sum + p.tvl, 0) / 1000000).toFixed(1)}M</p>
        </Card>

        <Card className="p-4 border-2 cyber-border backdrop-blur-sm bg-card/50 hover:shadow-[0_0_20px_rgba(139,0,255,0.3)] transition-all duration-300">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4 text-secondary" />
            <span className="text-sm">24h Volume</span>
          </div>
          <p className="text-2xl text-secondary drop-shadow-[0_0_10px_var(--neon-purple)]">${(MOCK_POOLS.reduce((sum, p) => sum + p.volume24h, 0) / 1000000).toFixed(1)}M</p>
        </Card>

        <Card className="p-4 border-2 cyber-border backdrop-blur-sm bg-card/50 hover:shadow-[0_0_20px_rgba(255,235,59,0.3)] transition-all duration-300">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4 text-[#ffeb3b]" />
            <span className="text-sm">24h Fees</span>
          </div>
          <p className="text-2xl text-[#ffeb3b] drop-shadow-[0_0_10px_var(--neon-yellow)]">${(MOCK_POOLS.reduce((sum, p) => sum + p.fees24h, 0) / 1000).toFixed(0)}K</p>
        </Card>

        <Card className="p-4 border-2 cyber-border backdrop-blur-sm bg-card/50 hover:shadow-[0_0_20px_rgba(255,0,110,0.3)] transition-all duration-300">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Percent className="h-4 w-4 text-primary" />
            <span className="text-sm">Avg APR</span>
          </div>
          <p className="text-2xl text-primary drop-shadow-[0_0_10px_var(--neon-pink)]">{(MOCK_POOLS.reduce((sum, p) => sum + p.apr, 0) / MOCK_POOLS.length).toFixed(1)}%</p>
        </Card>
      </div>

      <Card className="p-6 border-2 cyber-border backdrop-blur-sm bg-card/50">
        <h3 className="mb-4 text-accent">Top Pools</h3>
        <div className="space-y-3">
          {MOCK_POOLS.map((pool, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300 border border-transparent hover:border-accent/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center border-2 border-background shadow-[0_0_15px_rgba(255,0,110,0.5)]">
                    <span className="text-xs text-white">{pool.token0.symbol.charAt(0)}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-secondary/40 flex items-center justify-center border-2 border-background shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                    <span className="text-xs text-white">{pool.token1.symbol.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-foreground">{pool.token0.symbol}/{pool.token1.symbol}</p>
                  <p className="text-sm text-muted-foreground">0.3% Fee Tier</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-right">
                <div>
                  <p className="text-sm text-muted-foreground">TVL</p>
                  <p className="text-accent">${(pool.tvl / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volume 24h</p>
                  <p className="text-secondary">${(pool.volume24h / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">APR</p>
                  <p className="text-primary flex items-center justify-end gap-1 drop-shadow-[0_0_10px_var(--neon-pink)]">
                    <TrendingUp className="h-3 w-3" />
                    {pool.apr}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
