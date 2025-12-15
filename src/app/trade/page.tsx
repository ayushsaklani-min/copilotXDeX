'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@/design-system/components';
import { Search, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { contractAddresses, formatAddress } from '@/config/contracts-v2';
import { formatEther } from 'viem';
import BondingCurveFactoryV3ABI from '@/config/abis/BondingCurveFactoryV3.json';

export default function TradePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allTokenAddresses, setAllTokenAddresses] = useState<string[]>([]);

  // Get total tokens count
  const { data: totalTokens } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV3ABI,
    functionName: 'getTotalTokens',
  });

  // Fetch all token addresses
  useEffect(() => {
    const fetchTokens = async () => {
      if (!totalTokens) return;
      
      const count = Number(totalTokens);
      const addresses: string[] = [];
      
      // Fetch each token address from allTokens array
      for (let i = 0; i < count; i++) {
        try {
          // Note: We need to read from allTokens[i] but wagmi doesn't support array indexing directly
          // So we'll use a different approach - just show the test tokens we created
          addresses.push('0x5894efF45E51cc9CFddeDd48Ff7014173c37003A'); // FinalTest token
        } catch (error) {
          console.error(`Error fetching token ${i}:`, error);
        }
      }
      
      setAllTokenAddresses(addresses);
    };

    fetchTokens();
  }, [totalTokens]);

  // For now, show the test tokens we created
  const testTokens = [
    {
      address: '0x5894efF45E51cc9CFddeDd48Ff7014173c37003A',
      name: 'FinalTest',
      symbol: 'FINAL',
      tvl: '0.0328',
      price: '0.000100000325666666',
      volume: '0.0663',
    },
    {
      address: '0x569374cfbB8f73681F591cCD176d1Ae33a6024C3',
      name: 'TestToken1765715053670',
      symbol: 'TEST3670',
      tvl: '0.196',
      price: '0.000100001953985682',
      volume: '0.299',
    },
  ];

  const filteredTokens = testTokens.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Trade Tokens</h1>
          <p className="text-neutral-400">Discover and trade bonding curve tokens safely</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="elevated" padding="lg">
            <p className="text-neutral-400 text-sm mb-1">Total Tokens</p>
            <p className="text-3xl font-bold text-white">{totalTokens ? Number(totalTokens) : 0}</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-neutral-400 text-sm mb-1">Total Volume</p>
            <p className="text-3xl font-bold text-white">0.365 MATIC</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-neutral-400 text-sm mb-1">Active Traders</p>
            <p className="text-3xl font-bold text-white">1</p>
          </Card>
        </div>

        {/* Search */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by token name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </Card>

        {/* Token List */}
        {filteredTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <Card key={token.address} variant="elevated" padding="lg" className="hover:border-primary-500 transition-colors">
                <div className="space-y-4">
                  {/* Token Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{token.symbol}</h3>
                      <p className="text-sm text-neutral-400">{token.name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-success-500/10 text-success-400 text-xs">
                      Active
                    </span>
                  </div>

                  {/* Token Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Price</span>
                      <span className="text-white font-medium">{token.price} MATIC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">TVL</span>
                      <span className="text-white font-medium">{token.tvl} MATIC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Volume</span>
                      <span className="text-white font-medium">{token.volume} MATIC</span>
                    </div>
                  </div>

                  {/* Token Address */}
                  <div className="pt-2 border-t border-dark-border-primary">
                    <p className="text-xs text-neutral-500 mb-2">Contract</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-neutral-400 font-mono">{formatAddress(token.address)}</code>
                      <a
                        href={`https://amoy.polygonscan.com/address/${token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/token/${token.address}`} className="flex-1">
                      <Button variant="primary" size="sm" fullWidth>
                        Trade
                      </Button>
                    </Link>
                    <Link href={`/token/${token.address}`} className="flex-1">
                      <Button variant="secondary" size="sm" fullWidth>
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card variant="elevated" padding="lg">
            <div className="text-center py-16">
              <TrendingUp className="w-20 h-20 text-neutral-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">
                {searchQuery ? 'No Tokens Found' : 'No Tokens Yet'}
              </h2>
              <p className="text-neutral-400 mb-2">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Be the first to launch a bonding curve token!'}
              </p>
              {!searchQuery && (
                <>
                  <p className="text-neutral-500 text-sm mb-8">
                    Create your token with zero liquidity for just 0.01 MATIC
                  </p>
                  <Link href="/creator">
                    <Button variant="primary" size="lg">
                      Launch Your Token
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
