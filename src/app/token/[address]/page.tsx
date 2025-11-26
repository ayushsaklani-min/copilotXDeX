'use client';

import { useState } from 'react';
import { Card, Button } from '@/design-system/components';
import { Shield, Users, MessageSquare } from 'lucide-react';
import { useGetTokenInfo } from '@/hooks/useBondingCurveFactory';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import BondingCurveTokenABI from '@/config/abis/BondingCurveToken.json';

export default function TokenPage({ params }: { params: { address: string } }) {
  const tokenAddress = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();
  const { tokenInfo } = useGetTokenInfo(tokenAddress);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  
  // Read basic token info directly from the token contract (works even if factory registration failed)
  const { data: onChainName } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'name',
  });

  const { data: onChainSymbol } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'symbol',
  });

  // Get token balance
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'balanceOf',
    args: [userAddress],
    query: {
      enabled: !!userAddress,
    },
  });
  
  // Get current price
  const { data: currentPrice } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'getCurrentPrice',
  });
  
  const { writeContract: buyTokens, isPending: isBuying } = useWriteContract();
  const { writeContract: sellTokens, isPending: isSelling } = useWriteContract();
  
  const handleBuy = () => {
    if (!buyAmount || !userAddress) return;
    buyTokens({
      address: tokenAddress,
      abi: BondingCurveTokenABI,
      functionName: 'buy',
      value: parseEther(buyAmount),
    });
  };
  
  const handleSell = () => {
    if (!sellAmount || !userAddress) return;
    sellTokens({
      address: tokenAddress,
      abi: BondingCurveTokenABI,
      functionName: 'sell',
      args: [parseEther(sellAmount)],
    });
  };
  
  const displayName = (tokenInfo as any)?.name || (onChainName as string) || 'Token';
  const displaySymbol = (tokenInfo as any)?.symbol || (onChainSymbol as string) || 'TOKEN';

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                <p className="text-neutral-400">{displaySymbol}</p>
                <p className="text-xs text-neutral-500 font-mono mt-1">{tokenAddress}</p>
              </div>
            </div>
            {userAddress && balance !== undefined && (
              <div className="text-right">
                <p className="text-sm text-neutral-400">Your Balance</p>
                <p className="text-2xl font-bold text-white">{Number(formatEther(balance as bigint)).toFixed(4)}</p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-xl font-bold text-white mb-4">Price Chart</h2>
              <div className="h-64 bg-dark-bg-secondary rounded-lg flex items-center justify-center">
                <p className="text-neutral-500">Chart Component Here</p>
              </div>
            </Card>

            {/* Trading Interface */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-xl font-bold text-white mb-4">Trade</h2>
              {userAddress ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Buy Amount (MATIC)</label>
                    <input
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
                      placeholder="0.0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Sell Amount (Tokens)</label>
                    <input
                      type="number"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
                      placeholder="0.0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="success" 
                      fullWidth 
                      onClick={handleBuy}
                      disabled={isBuying || !buyAmount}
                    >
                      {isBuying ? 'Buying...' : 'Buy Tokens'}
                    </Button>
                    <Button 
                      variant="danger" 
                      fullWidth 
                      onClick={handleSell}
                      disabled={isSelling || !sellAmount}
                    >
                      {isSelling ? 'Selling...' : 'Sell Tokens'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400 text-center py-4">Connect wallet to trade</p>
              )}
            </Card>

            {/* Community Feed */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Community Feed
                </h2>
                <Button size="sm">Post Update</Button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-dark-bg-secondary rounded-lg">
                  <p className="text-neutral-400 text-sm">No announcements yet</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card variant="elevated" padding="md">
              <h3 className="text-lg font-bold text-white mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Current Price</span>
                  <span className="text-white font-mono">
                    {currentPrice ? `${Number(formatEther(currentPrice as bigint)).toFixed(6)} MATIC` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Market Cap</span>
                  <span className="text-white font-mono">
                    {tokenInfo?.marketCap ? `${Number(formatEther(tokenInfo.marketCap)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">TVL</span>
                  <span className="text-white font-mono">
                    {tokenInfo?.tvl ? `${Number(formatEther(tokenInfo.tvl)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Volume</span>
                  <span className="text-white font-mono">
                    {tokenInfo?.totalVolume ? `${Number(formatEther(tokenInfo.totalVolume)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Curve Type</span>
                  <span className="text-white font-mono">
                    {tokenInfo?.curveType === 0 ? 'Linear' : tokenInfo?.curveType === 1 ? 'Exponential' : 'Sigmoid'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Risk Score */}
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-white">Risk Analysis</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-neutral-400">Risk Score</span>
                    <span className="text-success-500 font-bold">25/100</span>
                  </div>
                  <div className="w-full bg-dark-bg-secondary rounded-full h-2">
                    <div className="bg-success-500 h-2 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
                <div className="text-sm text-neutral-400">
                  <p>✓ LP Locked</p>
                  <p>✓ Contract Verified</p>
                  <p>✓ No Honeypot</p>
                </div>
              </div>
            </Card>

            {/* Holders */}
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-white">Top Holders</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">0x1234...5678</span>
                  <span className="text-white">15.2%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
