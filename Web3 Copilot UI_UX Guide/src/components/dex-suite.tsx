// DEX Suite component with tabs for Swap, Liquidity, and Analytics
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { TokenSwap } from './token-swap';
import { LiquidityForm } from './liquidity-form';
import { PoolAnalytics } from './pool-analytics';

export function DEXSuite() {
  return (
    <Card className="p-6 border-2 cyber-border backdrop-blur-sm bg-card/50">
      <Tabs defaultValue="swap" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-sm border border-accent/30">
          <TabsTrigger value="swap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(255,0,110,0.5)]">Swap</TabsTrigger>
          <TabsTrigger value="liquidity" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-[0_0_20px_rgba(0,240,255,0.5)]">Liquidity</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-[0_0_20px_rgba(139,0,255,0.5)]">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="swap" className="mt-6">
          <TokenSwap />
        </TabsContent>
        
        <TabsContent value="liquidity" className="mt-6">
          <LiquidityForm />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <PoolAnalytics />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
