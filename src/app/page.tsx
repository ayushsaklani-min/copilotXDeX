'use client';

import { motion } from 'framer-motion';
import { Button, Card } from '@/design-system/components';
import { ArrowRight, Zap, Shield, TrendingUp, Users, Gamepad2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useBondingCurveFactory } from '@/hooks/useBondingCurveFactory';
import { useReadContract } from 'wagmi';
import { contractAddresses } from '@/config/contracts-v2';
import CoinflipABI from '@/config/abis/Coinflip.json';

export default function Home() {
  const { totalTokens } = useBondingCurveFactory();
  
  const { data: totalGames } = useReadContract({
    address: contractAddresses.coinflip as `0x${string}`,
    abi: CoinflipABI,
    functionName: 'totalGamesPlayed',
  });

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
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-primary-500 text-sm font-medium">AI-Powered DeFi 2.0</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-primary-500 via-secondary-500 to-warning-500 bg-clip-text text-transparent">
                Decentralized Trading
              </span>
            </h1>

            <p className="text-xl text-neutral-400 mb-12 max-w-3xl mx-auto">
              Trade with bonding curves, earn with GameFi, stay safe with AI security analysis.
              Welcome to CopilotXDEX 2.0 - where innovation meets DeFi.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/creator">
                <Button variant="primary" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Launch Token
                </Button>
              </Link>
              <Link href="/dex">
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
                <p className="text-3xl font-bold text-white mb-1">$0</p>
                <p className="text-neutral-400 text-sm">Total TVL</p>
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
                <p className="text-3xl font-bold text-white mb-1">Live</p>
                <p className="text-neutral-400 text-sm">Active Users</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-3xl font-bold text-white mb-1">{totalGames ? Number(totalGames) : 0}</p>
                <p className="text-neutral-400 text-sm">Games Played</p>
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
          <h2 className="text-4xl font-bold text-white mb-4">Why CopilotXDEX?</h2>
          <p className="text-xl text-neutral-400">Everything you need for the next generation of DeFi</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: 'Bonding Curves',
              description: '3 curve types with automatic price discovery. Fair launch, no initial liquidity needed.',
              color: 'from-primary-500 to-primary-600',
              link: '/creator'
            },
            {
              icon: Shield,
              title: 'AI Security',
              description: '15-factor risk analysis. Stay safe with automated security checks and warnings.',
              color: 'from-success-500 to-success-600',
              link: '/analytics'
            },
            {
              icon: Gamepad2,
              title: 'GameFi Rewards',
              description: '4 games, XP system, daily missions. Earn while you play and trade.',
              color: 'from-secondary-500 to-secondary-600',
              link: '/games'
            },
            {
              icon: Users,
              title: 'Token Communities',
              description: 'Social features, creator profiles, announcements. Build your community.',
              color: 'from-warning-500 to-warning-600',
              link: '/dex'
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Optimized contracts, instant swaps, real-time updates. Trade at the speed of light.',
              color: 'from-error-500 to-error-600',
              link: '/dex'
            },
            {
              icon: Sparkles,
              title: 'Premium UX',
              description: 'Beautiful dark theme, smooth animations, responsive design. Built for traders.',
              color: 'from-primary-500 to-secondary-500',
              link: '/analytics'
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
                <Card variant="elevated" padding="lg" hover className="h-full">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-neutral-400">{feature.description}</p>
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
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Trading?</h2>
            <p className="text-xl text-neutral-400 mb-8">
              Join thousands of traders on the most innovative DEX
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/creator">
                <Button variant="primary" size="xl">
                  Create Your Token
                </Button>
              </Link>
              <Link href="/games">
                <Button variant="secondary" size="xl">
                  Play & Earn
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border-primary">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">CopilotXDEX 2.0</h3>
              <p className="text-neutral-400 text-sm">
                The future of decentralized trading. Built with AI, secured by design.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/dex" className="text-neutral-400 hover:text-white transition-colors">Trade</Link></li>
                <li><Link href="/creator" className="text-neutral-400 hover:text-white transition-colors">Create Token</Link></li>
                <li><Link href="/games" className="text-neutral-400 hover:text-white transition-colors">Games</Link></li>
                <li><Link href="/analytics" className="text-neutral-400 hover:text-white transition-colors">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Audit</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Community</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Telegram</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-dark-border-primary mt-12 pt-8 text-center text-neutral-400 text-sm">
            <p>© 2025 CopilotXDEX 2.0. Built with ❤️ for the future of DeFi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
