'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@/design-system/components';
import { Lock, TrendingUp, Award, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useLockLiquidity, useGetUserLocks } from '@/hooks/useLiquidityController';

export default function LiquidityManagement() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'lock' | 'rewards'>('overview');
  
  // Lock form state
  const [tokenAddress, setTokenAddress] = useState('');
  const [lpTokenAddress, setLpTokenAddress] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('30');
  const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });
  
  // Hooks
  const { lockLiquidity, isLoading: isLocking, isSuccess: isLockSuccess } = useLockLiquidity();
  const { lockIds, isLoading: isLoadingLocks } = useGetUserLocks(address || '');
  
  const handleLockLiquidity = async () => {
    if (!address) {
      setStatus({ message: 'Please connect your wallet', type: 'error' });
      return;
    }
    
    if (!tokenAddress || !lpTokenAddress || !lockAmount) {
      setStatus({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    
    try {
      setStatus({ message: 'Locking LP tokens...', type: 'info' });
      lockLiquidity(tokenAddress, lpTokenAddress, lockAmount, Number(lockDuration));
      setStatus({ message: 'LP tokens locked successfully!', type: 'success' });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
    }
  };
  
  // IL Calculator state
  const [initialTokenAPrice, setInitialTokenAPrice] = useState('');
  const [initialTokenBPrice, setInitialTokenBPrice] = useState('');
  const [initialLPValue, setInitialLPValue] = useState('');
  const [currentTokenAPrice, setCurrentTokenAPrice] = useState('');
  const [currentTokenBPrice, setCurrentTokenBPrice] = useState('');
  const [ilResult, setIlResult] = useState<{ percentage: number; usdValue: number } | null>(null);
  
  // Calculate Impermanent Loss
  const calculateIL = () => {
    const initA = parseFloat(initialTokenAPrice);
    const initB = parseFloat(initialTokenBPrice);
    const currA = parseFloat(currentTokenAPrice);
    const currB = parseFloat(currentTokenBPrice);
    const initValue = parseFloat(initialLPValue);
    
    if (!initA || !initB || !currA || !currB || !initValue) {
      alert('Please fill in all fields');
      return;
    }
    
    // Calculate price ratio change
    const priceRatio = (currA / currB) / (initA / initB);
    
    // IL formula: 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
    const ilMultiplier = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
    const ilPercentage = ilMultiplier * 100;
    
    // Calculate USD value of IL
    const currentValue = initValue * (1 + ilMultiplier);
    const ilUsdValue = currentValue - initValue;
    
    setIlResult({
      percentage: ilPercentage,
      usdValue: ilUsdValue
    });
  };
  
  // Lock LP Tokens
  const handleLockLP = async () => {
    if (!address) {
      setStatus({ message: 'Please connect your wallet', type: 'error' });
      return;
    }
    
    if (!tokenAddress || !lpTokenAddress || !lockAmount) {
      setStatus({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    
    try {
      setStatus({ message: 'Locking LP tokens...', type: 'info' });
      lockLiquidity(tokenAddress, lpTokenAddress, lockAmount, Number(lockDuration));
      setStatus({ message: 'LP tokens locked successfully! 🎉', type: 'success' });
    } catch (error: any) {
      console.error('Lock error:', error);
      setStatus({ message: `Error: ${error.message || 'Failed to lock liquidity'}`, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Liquidity Management</h1>
          <p className="text-neutral-400">Professional LP tools for serious projects</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'lock', label: 'Lock LP', icon: Lock },
            { id: 'rewards', label: 'Rewards', icon: Award },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-bg-secondary text-neutral-400 hover:bg-dark-bg-hover'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Total LP Value</span>
                  <DollarSign className="w-5 h-5 text-primary-500" />
                </div>
                <p className="text-3xl font-bold text-white">$0</p>
                <p className="text-success-500 text-sm mt-1">+0% (24h)</p>
              </Card>

              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Locked LP</span>
                  <Lock className="w-5 h-5 text-warning-500" />
                </div>
                <p className="text-3xl font-bold text-white">0%</p>
                <p className="text-neutral-500 text-sm mt-1">0 positions</p>
              </Card>

              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Rewards Earned</span>
                  <Award className="w-5 h-5 text-success-500" />
                </div>
                <p className="text-3xl font-bold text-white">0 MATIC</p>
                <p className="text-neutral-500 text-sm mt-1">Claimable</p>
              </Card>

              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">IL Protection</span>
                  <AlertCircle className="w-5 h-5 text-secondary-500" />
                </div>
                <p className="text-3xl font-bold text-white">Active</p>
                <p className="text-neutral-500 text-sm mt-1">Up to 100%</p>
              </Card>
            </div>

            {/* Active Positions */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-white mb-6">Your LP Positions</h2>
              {address ? (
                <div className="text-center py-12">
                  <Lock className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
                  <p className="text-neutral-400 mb-2">No LP positions yet</p>
                  <p className="text-neutral-500 text-sm mb-6">
                    Provide liquidity and lock LP tokens to earn rewards
                  </p>
                  <Button variant="primary" onClick={() => setActiveTab('lock')}>
                    Lock LP Tokens
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-neutral-400">Connect wallet to view your positions</p>
                </div>
              )}
            </Card>

            {/* Impermanent Loss Calculator */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-white mb-6">Impermanent Loss Calculator</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input 
                    label="Initial Token A Price" 
                    placeholder="0.00" 
                    type="number"
                    value={initialTokenAPrice}
                    onChange={(e) => setInitialTokenAPrice(e.target.value)}
                  />
                  <Input 
                    label="Initial Token B Price" 
                    placeholder="0.00" 
                    type="number"
                    value={initialTokenBPrice}
                    onChange={(e) => setInitialTokenBPrice(e.target.value)}
                  />
                  <Input 
                    label="Initial LP Value ($)" 
                    placeholder="0.00" 
                    type="number"
                    value={initialLPValue}
                    onChange={(e) => setInitialLPValue(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Input 
                    label="Current Token A Price" 
                    placeholder="0.00" 
                    type="number"
                    value={currentTokenAPrice}
                    onChange={(e) => setCurrentTokenAPrice(e.target.value)}
                  />
                  <Input 
                    label="Current Token B Price" 
                    placeholder="0.00" 
                    type="number"
                    value={currentTokenBPrice}
                    onChange={(e) => setCurrentTokenBPrice(e.target.value)}
                  />
                  <div className="p-4 bg-dark-bg-secondary rounded-lg">
                    <p className="text-neutral-400 text-sm mb-1">Impermanent Loss</p>
                    <p className={`text-2xl font-bold ${ilResult && ilResult.percentage < 0 ? 'text-error-500' : 'text-success-500'}`}>
                      {ilResult ? `${ilResult.percentage.toFixed(2)}%` : '-0.00%'}
                    </p>
                    <p className="text-neutral-500 text-xs mt-1">
                      ${ilResult ? Math.abs(ilResult.usdValue).toFixed(2) : '0.00'} USD
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="primary" fullWidth className="mt-6" onClick={calculateIL}>
                Calculate IL
              </Button>
            </Card>
          </div>
        )}

        {/* Lock LP Tab */}
        {activeTab === 'lock' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-white mb-6">Lock LP Tokens</h2>
              <div className="space-y-4">
                <Input 
                  label="Token Address" 
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
                <Input 
                  label="LP Token Address" 
                  placeholder="0x..."
                  value={lpTokenAddress}
                  onChange={(e) => setLpTokenAddress(e.target.value)}
                />
                <Input 
                  label="Amount to Lock" 
                  placeholder="0.0" 
                  type="number"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                />
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Lock Duration</label>
                  <select 
                    className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
                    value={lockDuration}
                    onChange={(e) => setLockDuration(e.target.value)}
                  >
                    <option value="30">30 days (Standard)</option>
                    <option value="90">90 days (+5% bonus)</option>
                    <option value="180">180 days (+10% bonus)</option>
                    <option value="365">1 year (+20% bonus)</option>
                    <option value="730">2 years (+40% bonus)</option>
                    <option value="1095">3 years (+60% bonus)</option>
                  </select>
                </div>

                <div className="p-4 bg-primary-500/10 border border-primary-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-primary-500 font-medium text-sm mb-1">Lock Benefits</p>
                      <ul className="text-primary-400 text-xs space-y-1">
                        <li>• Build trust with your community</li>
                        <li>• Earn bonus rewards for longer locks</li>
                        <li>• Get NFT certificate of lock</li>
                        <li>• Reduce rug pull risk score</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!address && (
                  <div className="p-4 bg-warning-500/10 border border-warning-500 rounded-lg">
                    <p className="text-warning-500 text-sm text-center">Please connect your wallet to lock liquidity</p>
                  </div>
                )}

                {status.message && (
                  <div className={`p-4 rounded-lg border ${
                    status.type === 'error' ? 'bg-error-500/10 border-error-500' :
                    status.type === 'success' ? 'bg-success-500/10 border-success-500' :
                    'bg-primary-500/10 border-primary-500'
                  }`}>
                    <p className={`text-sm text-center ${
                      status.type === 'error' ? 'text-error-500' :
                      status.type === 'success' ? 'text-success-500' :
                      'text-primary-500'
                    }`}>{status.message}</p>
                  </div>
                )}

                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth
                  onClick={handleLockLP}
                  disabled={!address || isLocking}
                >
                  {isLocking ? 'Locking...' : 'Lock LP Tokens'}
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card variant="elevated" padding="lg">
                <h3 className="text-xl font-bold text-white mb-4">Lock Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Lock Amount</span>
                    <span className="text-white font-bold">{lockAmount || '0'} LP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Lock Duration</span>
                    <span className="text-white font-bold">{lockDuration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Unlock Date</span>
                    <span className="text-white font-bold">
                      {lockDuration ? new Date(Date.now() + parseInt(lockDuration) * 24 * 60 * 60 * 1000).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Bonus Rewards</span>
                    <span className="text-success-500 font-bold">
                      +{parseInt(lockDuration) >= 1095 ? '60' : parseInt(lockDuration) >= 730 ? '40' : parseInt(lockDuration) >= 365 ? '20' : parseInt(lockDuration) >= 180 ? '10' : parseInt(lockDuration) >= 90 ? '5' : '0'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">NFT Certificate</span>
                    <span className="text-primary-500 font-bold">Yes</span>
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <h3 className="text-lg font-bold text-white mb-2">💡 Pro Tips</h3>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li>• Longer locks earn higher bonus rewards</li>
                  <li>• Locked LP reduces your token's risk score</li>
                  <li>• You can extend lock duration anytime</li>
                  <li>• NFT certificate is tradeable</li>
                  <li>• Emergency unlock available (with penalty)</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-white mb-6">LP Rewards Program</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-xl border border-primary-500/30">
                  <Award className="w-8 h-8 text-primary-500 mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Bronze Tier</h3>
                  <p className="text-neutral-400 text-sm mb-4">Lock 30-89 days</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white">• +5% bonus rewards</p>
                    <p className="text-white">• Standard NFT</p>
                    <p className="text-white">• Basic analytics</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-warning-500/20 to-primary-500/20 rounded-xl border border-warning-500/30">
                  <Award className="w-8 h-8 text-warning-500 mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Silver Tier</h3>
                  <p className="text-neutral-400 text-sm mb-4">Lock 90-364 days</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white">• +20% bonus rewards</p>
                    <p className="text-white">• Premium NFT</p>
                    <p className="text-white">• Advanced analytics</p>
                    <p className="text-white">• Priority support</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-success-500/20 to-warning-500/20 rounded-xl border border-success-500/30">
                  <Award className="w-8 h-8 text-success-500 mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Gold Tier</h3>
                  <p className="text-neutral-400 text-sm mb-4">Lock 365+ days</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white">• +60% bonus rewards</p>
                    <p className="text-white">• Legendary NFT</p>
                    <p className="text-white">• Full analytics suite</p>
                    <p className="text-white">• VIP support</p>
                    <p className="text-white">• Governance rights</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-dark-bg-secondary rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">Claimable Rewards</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white mb-1">0 MATIC</p>
                    <p className="text-neutral-400 text-sm">≈ $0.00 USD</p>
                  </div>
                  <Button variant="success" size="lg">
                    Claim Rewards
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
