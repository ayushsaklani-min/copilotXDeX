// Portfolio overview component
'use client';

import { useWallet } from '../lib/wallet-context';
import { MOCK_TOKENS } from '../lib/mock-data';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { TrendingUp, Wallet } from 'lucide-react';

export function PortfolioOverview() {
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <Card className="p-8 border-2 cyber-border backdrop-blur-sm bg-card/50">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="rounded-full bg-muted p-4 pulse-glow">
            <Wallet className="h-8 w-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h3 className="text-accent">Connect Your Wallet</h3>
            <p className="text-muted-foreground">
              Connect your wallet to view your portfolio and start trading
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const totalValue = MOCK_TOKENS.reduce((sum, token) => sum + (token.usdValue || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 border-2 cyber-border backdrop-blur-sm bg-card/50">
        <div className="space-y-2">
          <p className="text-muted-foreground">Total Portfolio Value</p>
          <h2 className="text-accent drop-shadow-[0_0_10px_var(--neon-cyan)]">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <div className="flex items-center text-accent">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span className="text-sm">+12.5% (24h)</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-2 cyber-border backdrop-blur-sm bg-card/50">
        <h3 className="mb-4 text-accent">Your Assets</h3>
        <div className="space-y-3">
          {MOCK_TOKENS.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-transparent hover:border-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.5)]">
                  <span className="text-white">{token.symbol.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-foreground">{token.symbol}</p>
                  <p className="text-sm text-muted-foreground">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-foreground">{token.balance} {token.symbol}</p>
                <p className="text-sm text-accent">
                  ${token.usdValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
