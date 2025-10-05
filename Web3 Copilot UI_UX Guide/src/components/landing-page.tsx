// Professional landing page for Web3 Copilot
'use client';

import { Button } from './ui/button';
import { useWallet } from '../lib/wallet-context';
import { Wallet, TrendingUp, Bot, Repeat, Shield, Zap, BarChart3, Loader2 } from 'lucide-react';
import { Card } from './ui/card';

export function LandingPage() {
  const { connect, isConnecting } = useWallet();

  const features = [
    {
      icon: TrendingUp,
      title: 'Portfolio Tracking',
      description: 'Real-time monitoring of your digital assets on Polygon Amoy',
      color: 'text-secondary',
      glow: 'shadow-[0_0_30px_rgba(130,71,229,0.4)]',
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Get intelligent insights and suggestions powered by AI',
      color: 'text-secondary',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    },
    {
      icon: Repeat,
      title: 'Token Swapping',
      description: 'Seamless token swaps with low fees on Polygon network',
      color: 'text-accent',
      glow: 'shadow-[0_0_30px_rgba(0,212,255,0.3)]',
    },
    {
      icon: BarChart3,
      title: 'Liquidity Pools',
      description: 'Provide liquidity and earn rewards on Polygon Amoy testnet',
      color: 'text-primary',
      glow: 'shadow-[0_0_30px_rgba(255,0,110,0.3)]',
    },
    {
      icon: Shield,
      title: 'Secure & Safe',
      description: 'Non-custodial wallet integration with Polygon security',
      color: 'text-secondary',
      glow: 'shadow-[0_0_30px_rgba(147,51,234,0.4)]',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Experience Polygon\'s high-speed transactions and low gas fees',
      color: 'text-accent',
      glow: 'shadow-[0_0_30px_rgba(0,240,255,0.3)]',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8 mb-16">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-6 pulse-glow backdrop-blur-sm border border-accent/30">
            <Wallet className="h-16 w-16 text-accent" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl neon-text">
            Web3 Copilot
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent DeFi companion on Polygon Amoy testnet
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
            <p className="text-sm text-secondary font-semibold tracking-wider">
              BUILT WITH POLYGON
            </p>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
          </div>
        </div>

        {/* Connect Button */}
        <div className="pt-8">
          <Button
            onClick={connect}
            disabled={isConnecting}
            size="lg"
            className="h-14 px-12 text-lg shadow-[0_0_40px_rgba(255,0,110,0.6)] hover:shadow-[0_0_60px_rgba(255,0,110,0.9)] transition-all duration-300 hover:scale-105"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-3 h-5 w-5" />
                Connect Wallet to Begin
              </>
            )}
          </Button>
        </div>

        {/* Network Info */}
        <div className="pt-4 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-secondary/30">
            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
            <p className="text-sm text-secondary font-medium">Polygon Amoy Testnet</p>
          </div>
          <p className="text-xs text-muted-foreground">Fast, scalable, and eco-friendly blockchain</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`p-6 bg-card/60 backdrop-blur-md border-border/50 hover:border-accent/50 transition-all duration-300 hover:scale-105 ${feature.glow} hover:shadow-[0_0_40px_rgba(0,240,255,0.4)]`}
            >
              <div className="space-y-4">
                <div className={`rounded-lg bg-gradient-to-br from-background to-card p-3 w-fit ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className={feature.color}>{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 text-center space-y-4 max-w-2xl">
        <div className="flex items-center justify-center gap-3">
          <div className="text-sm text-muted-foreground">Powered by</div>
          <div className="text-lg font-bold text-secondary drop-shadow-[0_0_15px_rgba(130,71,229,0.8)]">
            Polygon Amoy
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          This is a testnet demonstration. Always verify transactions and never share your private keys.
        </p>
      </div>
    </div>
  );
}
