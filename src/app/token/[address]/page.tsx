'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, Button } from '@/design-system/components';
import { Shield, Users, MessageSquare } from 'lucide-react';
import { useBondingCurveFactory, useGetTokenInfo } from '@/hooks/useBondingCurveFactory';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { BaseError, parseEther, formatEther } from 'viem';
import { contractAddresses } from '@/config/contracts-v2';
import BondingCurveTokenABI from '@/config/abis/BondingCurveToken.json';
import BondingCurveFactoryV2ABI from '@/config/abis/BondingCurveFactoryV2.json';

// Note: loosen props typing to satisfy Next.js PageProps constraint in Next 15
// while keeping this as a client component using hooks.
export default function TokenPage({ params }: any) {
  const tokenAddress = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();
  const { tokenInfo } = useGetTokenInfo(tokenAddress);
  const { creationFee } = useBondingCurveFactory();
  const publicClient = usePublicClient();
  // Loosely type on-chain token stats to avoid TS complaining about dynamic contract return shape
  const tokenStats = tokenInfo as any;
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  
  const creationFeeValue = useMemo(
    () => (creationFee ? BigInt(creationFee) : 0n),
    [creationFee]
  );
  
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

  // Extra on-chain metadata we need to (re)register token if factory entry is missing
  const { data: creator } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'creator',
  });

  const { data: curveType } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'curveType',
  });

  const { data: initialPrice } = useReadContract({
    address: tokenAddress,
    abi: BondingCurveTokenABI,
    functionName: 'initialPrice',
  });

  // Read token registration info from factory
  const { data: factoryTokenInfo, refetch: refetchFactoryTokenInfo } = useReadContract({
    address: contractAddresses.bondingCurveFactory as `0x${string}`,
    abi: BondingCurveFactoryV2ABI,
    functionName: 'getTokenInfo',
    args: [tokenAddress],
    query: {
      enabled: !!tokenAddress,
    },
  });

  const isRegistered = useMemo(() => {
    if (!factoryTokenInfo) return false;
    // TokenInfo is a struct; depending on ABI decoding it may be an array or object.
    const info = factoryTokenInfo as any;
    const registeredAddress: string =
      info.tokenAddress || (Array.isArray(info) ? info[0] : '');
    if (!registeredAddress) return false;
    return registeredAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000';
  }, [factoryTokenInfo]);

  const isCreator = useMemo(() => {
    if (!creator || !userAddress) return false;
    return (creator as string).toLowerCase() === userAddress.toLowerCase();
  }, [creator, userAddress]);

  const { data: onChainNameSafe } = { data: onChainName };
  const { data: onChainSymbolSafe } = { data: onChainSymbol };

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
  
  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof BaseError) {
      return error.shortMessage || error.details || 'Transaction failed. Please try again.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }, []);

  const showStatus = useCallback((message: string | null, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    if (message) {
      setStatusType(type);
    }
  }, []);

  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) return;
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient]
  );

  const { writeContractAsync: buyTokens, isPending: isBuying } = useWriteContract();
  const { writeContractAsync: sellTokens, isPending: isSelling } = useWriteContract();
  const { writeContractAsync: registerToken, isPending: isRegistering } = useWriteContract();
  
  const handleBuy = useCallback(async () => {
    if (!buyAmount || !userAddress) return;
    try {
      showStatus(`Submitting buy for ${buyAmount} MATIC...`, 'info');
      const hash = await buyTokens({
        address: tokenAddress,
        abi: BondingCurveTokenABI,
        functionName: 'buy',
        value: parseEther(buyAmount),
      });
      showStatus('Waiting for confirmation...', 'info');
      await waitForReceipt(hash);
      showStatus('Buy confirmed! Your balance will update shortly.', 'success');
      setBuyAmount('');
    } catch (error) {
      showStatus(getErrorMessage(error), 'error');
    }
  }, [buyAmount, userAddress, tokenAddress, buyTokens, waitForReceipt, showStatus, getErrorMessage]);
  
  const handleSell = useCallback(async () => {
    if (!sellAmount || !userAddress) return;
    try {
      showStatus(`Submitting sell for ${sellAmount} tokens...`, 'info');
      const hash = await sellTokens({
        address: tokenAddress,
        abi: BondingCurveTokenABI,
        functionName: 'sell',
        args: [parseEther(sellAmount)],
      });
      showStatus('Waiting for confirmation...', 'info');
      await waitForReceipt(hash);
      showStatus('Sell confirmed! Your balance will update shortly.', 'success');
      setSellAmount('');
    } catch (error) {
      showStatus(getErrorMessage(error), 'error');
    }
  }, [sellAmount, userAddress, tokenAddress, sellTokens, waitForReceipt, showStatus, getErrorMessage]);

  const handleRegisterToken = useCallback(async () => {
    if (!isCreator) {
      showStatus('Only the token creator can register this token with the factory.', 'error');
      return;
    }
    if (!onChainName || !onChainSymbol || curveType === undefined || initialPrice === undefined) {
      showStatus('Unable to read token metadata from chain. Please refresh and try again.', 'error');
      return;
    }
    if (!creationFeeValue || creationFeeValue === 0n) {
      showStatus('Creation fee is unavailable. Refresh and ensure the factory is deployed.', 'error');
      return;
    }
  
    try {
      showStatus('Submitting registration transaction to BondingCurveFactoryV2...', 'info');
      const hash = await registerToken({
        address: contractAddresses.bondingCurveFactory as `0x${string}`,
        abi: BondingCurveFactoryV2ABI,
        functionName: 'registerToken',
        args: [
          tokenAddress,
          (onChainName as string),
          (onChainSymbol as string),
          Number(curveType as bigint),
          initialPrice as bigint,
        ],
        value: creationFeeValue,
      });
      showStatus('Waiting for confirmation...', 'info');
      await waitForReceipt(hash);
      await refetchFactoryTokenInfo();
      showStatus('Registration confirmed! Token stats will refresh shortly.', 'success');
    } catch (error) {
      showStatus(getErrorMessage(error), 'error');
    }
  }, [
    creationFeeValue,
    curveType,
    getErrorMessage,
    initialPrice,
    isCreator,
    onChainName,
    onChainSymbol,
    refetchFactoryTokenInfo,
    registerToken,
    showStatus,
    tokenAddress,
    waitForReceipt,
  ]);
  
  const displayName = (tokenInfo as any)?.name || (onChainName as string) || 'Token';
  const displaySymbol = (tokenInfo as any)?.symbol || (onChainSymbol as string) || 'TOKEN';

  const statusStyles: Record<'info' | 'success' | 'error', string> = {
    info: 'bg-dark-bg-secondary border-dark-border-primary text-neutral-300',
    success: 'bg-success-500/10 border-success-500 text-success-200',
    error: 'bg-red-500/10 border-red-500 text-red-200',
  };

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
              {!isRegistered && (
                <div className="mb-4 p-4 rounded-lg border border-warning-500 bg-warning-500/10 text-sm text-warning-300">
                  <p className="font-semibold mb-1">This token is not registered with the BondingCurveFactoryV2.</p>
                  <p className="mb-2">
                    Trading is still available, but TVL/market cap analytics will be stale until registration completes.
                    This can happen when the original factory transaction failed.
                  </p>
                  {isCreator ? (
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRegisterToken}
                        disabled={isRegistering}
                      >
                        {isRegistering ? 'Registering...' : 'Finish Registration (Creator Only)'}
                      </Button>
                      <p className="text-xs text-warning-200">
                        Creation fee: {creationFeeValue ? `${Number(formatEther(creationFeeValue)).toFixed(3)} MATIC` : '...'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-warning-200">
                      Ask the token creator to connect their wallet and finish registration from this page.
                    </p>
                  )}
                </div>
              )}
              {statusMessage && (
                <div className={`mb-4 p-3 rounded-lg border text-xs ${statusStyles[statusType]}`}>
                  {statusMessage}
                </div>
              )}
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
                    {tokenStats?.marketCap ? `${Number(formatEther(tokenStats.marketCap)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">TVL</span>
                  <span className="text-white font-mono">
                    {tokenStats?.tvl ? `${Number(formatEther(tokenStats.tvl)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Volume</span>
                  <span className="text-white font-mono">
                    {tokenStats?.totalVolume ? `${Number(formatEther(tokenStats.totalVolume)).toFixed(2)} MATIC` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Curve Type</span>
                  <span className="text-white font-mono">
                    {tokenStats?.curveType === 0 ? 'Linear' : tokenStats?.curveType === 1 ? 'Exponential' : 'Sigmoid'}
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
