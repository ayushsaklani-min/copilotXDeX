'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Card } from '@/design-system/components';
import { ArrowRight, Sparkles, Rocket, Lock, Shield, Wallet, Zap, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import { useBondingCurveFactory } from '@/hooks/useBondingCurveFactory';

export default function Home() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { totalTokens } = useBondingCurveFactory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Show beautiful connect wallet landing page if not connected
  if (!mounted || !isConnected) {
    return (
      <div className="min-h-screen bg-dark-bg-primary relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-warning-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Brand */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 1 }}
              className="mb-8 flex items-center justify-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-2xl shadow-primary-500/50">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white">CopilotXDEX</h1>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
                Launch Your Token
                <br />
                <span className="bg-gradient-to-r from-primary-500 via-secondary-500 to-warning-500 bg-clip-text text-transparent">
                  With Zero Liquidity
                </span>
              </h2>
            </motion.div>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl md:text-3xl text-neutral-400 mb-12 max-w-3xl mx-auto font-light"
            >
              Create bonding curve tokens in seconds. No upfront liquidity needed.
              <br />
              <span className="text-primary-500 font-semibold">Fair launch for everyone. Just 0.01 MATIC.</span>
            </motion.p>

            {/* Connect Wallet Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="mb-16"
            >
              <button
                onClick={handleConnect}
                disabled={!mounted}
                className="group relative inline-flex items-center gap-4 px-16 py-8 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-3xl text-white text-2xl font-bold hover:shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-105 animate-gradient bg-[length:200%_auto] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="w-8 h-8" />
                Connect Wallet to Start
                <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-400 to-secondary-400 blur-2xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
              </button>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            >
              <Card variant="glass" padding="lg" className="backdrop-blur-xl border-primary-500/20 hover:border-primary-500/40 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-primary-500/50">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Instant Launch</h3>
                <p className="text-neutral-400">
                  Create tokens in seconds with just 0.01 MATIC
                </p>
              </Card>

              <Card variant="glass" padding="lg" className="backdrop-blur-xl border-success-500/20 hover:border-success-500/40 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-success-500/50">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fair Pricing</h3>
                <p className="text-neutral-400">
                  Bonding curve ensures transparent pricing
                </p>
              </Card>

              <Card variant="glass" padding="lg" className="backdrop-blur-xl border-secondary-500/20 hover:border-secondary-500/40 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-secondary-500/50">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Auto LP Lock</h3>
                <p className="text-neutral-400">
                  Liquidity locked automatically at graduation
                </p>
              </Card>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap items-center justify-center gap-8 text-neutral-400"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success-500" />
                <span>Audited Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span>5 Tokens Launched</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-warning-500" />
                <span>$365 Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-secondary-500" />
                <span>100% LP Locked</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <span className="text-sm">Connect to explore</span>
            <div className="w-6 h-10 border-2 border-neutral-500 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-neutral-500 rounded-full animate-bounce" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show main homepage if connected
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg-primary via-dark-bg-secondary to-dark-bg-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-primary-500/20 to-secondary-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-secondary-500/20 to-primary-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-success-500/10 border border-success-500/30 rounded-full mb-8"
            >
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              <span className="text-success-500 text-sm font-medium">Wallet Connected</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
              Welcome to
              <br />
              <span className="bg-gradient-to-r from-primary-500 via-secondary-500 to-warning-500 bg-clip-text text-transparent">
                CopilotXDEX
              </span>
            </h1>

            <p className="text-xl text-neutral-400 mb-12 max-w-3xl mx-auto">
              Launch tokens with zero liquidity. Trade with AI-powered security. Lock LP with confidence.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/creator">
                <Button variant="primary" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Launch Token
                </Button>
              </Link>
              <Link href="/trade">
                <Button variant="secondary" size="xl">
                  Start Trading
                </Button>
              </Link>
            </div>

            {/* Stats - Real blockchain data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-3xl font-bold text-white mb-1">$365</p>
                <p className="text-neutral-400 text-sm">Total Volume</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-3xl font-bold text-white mb-1">{totalTokens}</p>
                <p className="text-neutral-400 text-sm">Tokens Created</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-3xl font-bold text-white mb-1">100%</p>
                <p className="text-neutral-400 text-sm">LP Locked</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-3xl font-bold text-white mb-1">0.01</p>
                <p className="text-neutral-400 text-sm">MATIC to Launch</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">Three Core Pillars</h2>
          <p className="text-xl text-neutral-400">Everything you need to launch and trade bonding curve tokens safely</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: Rocket,
              title: 'Zero-Liquidity Launches',
              description: 'Create tokens with no upfront capital. Bonding curves provide automatic liquidity and fair price discovery.',
              color: 'from-primary-500 to-primary-600',
              link: '/creator',
              stats: '0.01 MATIC to launch'
            },
            {
              icon: Shield,
              title: 'AI Security Analysis',
              description: '15-factor risk scoring with ML-based scam detection. Community reporting and historical tracking.',
              color: 'from-success-500 to-success-600',
              link: '/analytics',
              stats: '95% accuracy rate'
            },
            {
              icon: Lock,
              title: 'Professional LP Tools',
              description: 'Flexible lock options, impermanent loss calculator, tiered rewards. Build trust with your community.',
              color: 'from-warning-500 to-warning-600',
              link: '/liquidity',
              stats: 'Up to 60% bonus'
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={feature.link}>
                <Card variant="elevated" padding="xl" hover className="h-full text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 mx-auto`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-neutral-400 mb-4">{feature.description}</p>
                  <div className="pt-4 border-t border-dark-border-primary">
                    <p className="text-primary-500 font-bold">{feature.stats}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <Card variant="glass" padding="xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Launch Your Token?</h2>
            <p className="text-xl text-neutral-400 mb-8">
              Join the safest bonding curve DEX on Polygon
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/creator">
                <Button variant="primary" size="xl">
                  Launch Token (0.01 MATIC)
                </Button>
              </Link>
              <Link href="/liquidity">
                <Button variant="secondary" size="xl">
                  Manage Liquidity
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
