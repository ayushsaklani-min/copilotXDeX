'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/design-system/components';
import { Menu, X, Zap, TrendingUp, BarChart3, Rocket, Wallet, LogOut, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: '/creator', label: 'Launch Token', icon: Rocket },
    { href: '/trade', label: 'Trade', icon: TrendingUp },
    { href: '/liquidity', label: 'Liquidity', icon: Lock },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-dark-bg-primary/80 backdrop-blur-xl border-b border-dark-border-primary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CopilotXDEX</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary-500/20 text-primary-500 rounded-full">V3</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-primary-500/10 text-primary-500'
                      : 'text-neutral-400 hover:text-white hover:bg-dark-bg-hover'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              </Link>
            ))}
          </div>

          {/* Connect Wallet Button */}
          <div className="hidden md:flex items-center gap-2">
            {mounted && isConnected ? (
              <>
                <div className="px-4 py-2 bg-dark-bg-elevated rounded-lg border border-dark-border-primary">
                  <span className="text-sm text-white font-mono">{formatAddress(address!)}</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="md"
                  leftIcon={<LogOut className="w-4 h-4" />}
                  onClick={() => disconnect()}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button 
                variant="primary" 
                leftIcon={<Wallet className="w-4 h-4" />}
                onClick={handleConnect}
                isDisabled={!mounted}
              >
                Connect Wallet
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-dark-bg-hover transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-dark-border-primary"
          >
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      isActive(item.href)
                        ? 'bg-primary-500/10 text-primary-500'
                        : 'text-neutral-400 hover:text-white hover:bg-dark-bg-hover'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </Link>
              ))}
              {mounted && isConnected ? (
                <>
                  <div className="px-4 py-3 bg-dark-bg-elevated rounded-lg border border-dark-border-primary">
                    <span className="text-sm text-white font-mono">{formatAddress(address!)}</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    fullWidth 
                    leftIcon={<LogOut className="w-4 h-4" />}
                    onClick={() => disconnect()}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="primary" 
                  fullWidth 
                  leftIcon={<Wallet className="w-4 h-4" />}
                  onClick={handleConnect}
                  isDisabled={!mounted}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
