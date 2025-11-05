'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { useReferral, getReferralCodeFromURL, calculatePotentialEarnings } from '../../hooks/useReferral';
import { useReputation } from '../../hooks/useReputation';
import contracts from '../../config/contracts.json';

interface ReferralDashboardProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  standalone?: boolean;
}

interface TierInfo {
  name: string;
  minXP: number;
  color: string;
  perks: string[];
}

const TIER_INFO: TierInfo[] = [
  {
    name: 'Bronze',
    minXP: 0,
    color: 'text-yellow-600',
    perks: ['Basic referral rewards', '10 XP per referral', '5 XP for referee']
  },
  {
    name: 'Silver',
    minXP: 50,
    color: 'text-gray-400',
    perks: ['Enhanced referral rewards', 'Priority support', 'Early access to features']
  },
  {
    name: 'Gold',
    minXP: 150,
    color: 'text-yellow-500',
    perks: ['Maximum referral rewards', 'VIP support', 'Exclusive features', 'Governance voting']
  },
  {
    name: 'Diamond',
    minXP: 300,
    color: 'text-blue-400',
    perks: ['Premium rewards', 'Direct team access', 'Custom features', 'Revenue sharing']
  },
  {
    name: 'Crystal',
    minXP: 500,
    color: 'text-purple-400',
    perks: ['Ultimate rewards', 'Co-founder benefits', 'Platform equity', 'Advisory role']
  }
];

export default function ReferralDashboard({ signer, address, standalone = true }: ReferralDashboardProps) {
  const [referrerAddress, setReferrerAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({ message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'earnings' | 'tiers'>('overview');

  const referralAddress = contracts.referralAddress as string;
  const { 
    referralInfo, 
    referralStats, 
    referrals, 
    globalStats, 
    canRefer, 
    isLoading, 
    error, 
    registerReferral, 
    refreshData, 
    generateReferralLink 
  } = useReferral(signer, address, referralAddress);

  const { score: reputationScore } = useReputation(signer, address ?? undefined);

  // Handle referral code from URL
  useEffect(() => {
    const refCode = getReferralCodeFromURL();
    if (refCode && ethers.isAddress(refCode)) {
      setReferrerAddress(refCode);
    }
  }, []);

  const handleRegisterReferral = async () => {
    if (!referrerAddress || !ethers.isAddress(referrerAddress)) {
      setStatus({ message: 'Please enter a valid referrer address', type: 'error' });
      return;
    }

    setIsRegistering(true);
    setStatus({ message: 'Registering referral...', type: 'info' });

    try {
      const txHash = await registerReferral(referrerAddress);
      if (txHash) {
        setStatus({ 
          message: `Referral registered successfully! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        setReferrerAddress('');
      } else {
        setStatus({ message: 'Failed to register referral', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Registration failed. Please try again.', type: 'error' });
    } finally {
      setIsRegistering(false);
    }
  };

  const copyReferralLink = async () => {
    const link = generateReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setStatus({ message: 'Referral link copied to clipboard!', type: 'success' });
    } catch {
      setStatus({ message: 'Failed to copy link', type: 'error' });
    }
  };

  const getCurrentTier = (): TierInfo => {
    const currentXP = referralStats?.currentReputation || 0;
    return TIER_INFO.reduce((prev, current) => 
      currentXP >= current.minXP ? current : prev, TIER_INFO[0]
    );
  };

  const getNextTier = (): TierInfo | null => {
    const currentXP = referralStats?.currentReputation || 0;
    const nextTier = TIER_INFO.find(tier => tier.minXP > currentXP);
    return nextTier || null;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString();

  if (standalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <ReferralDashboardContent 
            signer={signer}
            address={address}
            referralInfo={referralInfo}
            referralStats={referralStats}
            referrals={referrals}
            globalStats={globalStats}
            canRefer={canRefer}
            isLoading={isLoading}
            error={error}
            referrerAddress={referrerAddress}
            setReferrerAddress={setReferrerAddress}
            isRegistering={isRegistering}
            status={status}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleRegisterReferral={handleRegisterReferral}
            copyReferralLink={copyReferralLink}
            refreshData={refreshData}
            getCurrentTier={getCurrentTier}
            getNextTier={getNextTier}
            formatAddress={formatAddress}
            formatDate={formatDate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-6">
      <ReferralDashboardContent 
        signer={signer}
        address={address}
        referralInfo={referralInfo}
        referralStats={referralStats}
        referrals={referrals}
        globalStats={globalStats}
        canRefer={canRefer}
        isLoading={isLoading}
        error={error}
        referrerAddress={referrerAddress}
        setReferrerAddress={setReferrerAddress}
        isRegistering={isRegistering}
        status={status}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleRegisterReferral={handleRegisterReferral}
        copyReferralLink={copyReferralLink}
        refreshData={refreshData}
        getCurrentTier={getCurrentTier}
        getNextTier={getNextTier}
        formatAddress={formatAddress}
        formatDate={formatDate}
      />
    </div>
  );
}

interface ReferralDashboardContentProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  referralInfo: any;
  referralStats: any;
  referrals: string[];
  globalStats: any;
  canRefer: boolean;
  isLoading: boolean;
  error: string | null;
  referrerAddress: string;
  setReferrerAddress: (addr: string) => void;
  isRegistering: boolean;
  status: { message: string; type: 'success' | 'error' | 'info' };
  activeTab: 'overview' | 'referrals' | 'earnings' | 'tiers';
  setActiveTab: (tab: 'overview' | 'referrals' | 'earnings' | 'tiers') => void;
  handleRegisterReferral: () => Promise<void>;
  copyReferralLink: () => Promise<void>;
  refreshData: () => Promise<void>;
  getCurrentTier: () => TierInfo;
  getNextTier: () => TierInfo | null;
  formatAddress: (addr: string) => string;
  formatDate: (timestamp: number) => string;
}

function ReferralDashboardContent({
  signer,
  address,
  referralInfo,
  referralStats,
  referrals,
  globalStats,
  canRefer,
  isLoading,
  error,
  referrerAddress,
  setReferrerAddress,
  isRegistering,
  status,
  activeTab,
  setActiveTab,
  handleRegisterReferral,
  copyReferralLink,
  refreshData,
  getCurrentTier,
  getNextTier,
  formatAddress,
  formatDate
}: ReferralDashboardContentProps) {
  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Dashboard</h1>
        <p className="text-gray-300">
          Earn XP by referring friends and unlock exclusive tier benefits
        </p>
      </div>

      {/* Status Message */}
      {status.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          status.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
          status.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
          'bg-blue-500/20 border border-blue-500/50 text-blue-300'
        }`}>
          {status.message}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Connection Status */}
      {!signer || !address ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">Connect your wallet to view referral dashboard</div>
          <div className="text-sm text-gray-500">You need to connect MetaMask to access referral features</div>
        </div>
      ) : (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
              <div className="text-2xl font-bold text-cyan-300">{referralStats?.level1Count || 0}</div>
              <div className="text-sm text-gray-400">Direct Referrals</div>
            </div>
            <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
              <div className="text-2xl font-bold text-cyan-300">{referralStats?.level2Count || 0}</div>
              <div className="text-sm text-gray-400">Level 2 Referrals</div>
            </div>
            <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
              <div className="text-2xl font-bold text-cyan-300">{referralStats?.totalXPEarned || 0}</div>
              <div className="text-sm text-gray-400">XP Earned</div>
            </div>
            <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
              <div className="text-2xl font-bold text-cyan-300">{referralStats?.currentReputation || 0}</div>
              <div className="text-sm text-gray-400">Total XP</div>
            </div>
          </div>

          {/* Current Tier Display */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 mb-8 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Current Tier: <span className={currentTier.color}>{currentTier.name}</span></h2>
                <p className="text-gray-300 mb-4">{currentTier.perks.join(' • ')}</p>
                {nextTier && (
                  <div className="text-sm text-gray-400">
                    Next tier: {nextTier.name} ({nextTier.minXP - (referralStats?.currentReputation || 0)} XP needed)
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{referralStats?.currentReputation || 0}</div>
                <div className="text-sm text-gray-400">Total XP</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-white/5 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'referrals', label: 'Referrals', icon: '👥' },
              { id: 'earnings', label: 'Earnings', icon: '💰' },
              { id: 'tiers', label: 'Tiers', icon: '🏆' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'referrals' | 'earnings' | 'tiers')}
                className={`flex-1 py-2 px-4 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  referralInfo={referralInfo}
                  referralStats={referralStats}
                  globalStats={globalStats}
                  canRefer={canRefer}
                  referrerAddress={referrerAddress}
                  setReferrerAddress={setReferrerAddress}
                  isRegistering={isRegistering}
                  handleRegisterReferral={handleRegisterReferral}
                  copyReferralLink={copyReferralLink}
                  formatAddress={formatAddress}
                  formatDate={formatDate}
                />
              )}

              {activeTab === 'referrals' && (
                <ReferralsTab
                  referrals={referrals}
                  referralStats={referralStats}
                  isLoading={isLoading}
                  formatAddress={formatAddress}
                />
              )}

              {activeTab === 'earnings' && (
                <EarningsTab
                  referralStats={referralStats}
                  globalStats={globalStats}
                  calculatePotentialEarnings={calculatePotentialEarnings}
                />
              )}

              {activeTab === 'tiers' && (
                <TiersTab
                  currentTier={currentTier}
                  nextTier={nextTier}
                  referralStats={referralStats}
                  TIER_INFO={TIER_INFO}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </>
  );
}

// Tab Components
function OverviewTab({ 
  referralInfo, 
  referralStats, 
  globalStats, 
  canRefer, 
  referrerAddress, 
  setReferrerAddress, 
  isRegistering, 
  handleRegisterReferral, 
  copyReferralLink, 
  formatAddress, 
  formatDate 
}: any) {
  return (
    <div className="space-y-6">
      {/* Registration Section */}
      {!referralInfo?.isRegistered ? (
        <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Join Referral Program</h3>
          <p className="text-gray-300 mb-4">
            Enter a referrer address to join the program and start earning XP bonuses!
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              value={referrerAddress}
              onChange={(e) => setReferrerAddress(e.target.value)}
              placeholder="Enter referrer address (0x...)"
              className="flex-1 bg-white/5 border border-cyan-500/30 rounded-lg p-3 text-white placeholder-gray-400"
            />
            <button
              onClick={handleRegisterReferral}
              disabled={isRegistering || !referrerAddress}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
            >
              {isRegistering ? 'Registering...' : 'Register'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-6 border border-green-500/30">
          <h3 className="text-xl font-bold text-white mb-4">✅ Registered Successfully</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Referrer:</span>
              <span className="text-white ml-2">{formatAddress(referralInfo.referrer)}</span>
            </div>
            <div>
              <span className="text-gray-400">Registered:</span>
              <span className="text-white ml-2">{formatDate(referralInfo.registeredAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Referral Link Section */}
      {canRefer && (
        <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Your Referral Link</h3>
          <p className="text-gray-300 mb-4">
            Share this link to earn XP when others join using your referral!
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              value={typeof window !== 'undefined' ? `${window.location.origin}/referrals?ref=${referralInfo?.referrer || ''}` : ''}
              readOnly
              className="flex-1 bg-white/5 border border-cyan-500/30 rounded-lg p-3 text-white"
            />
            <button
              onClick={copyReferralLink}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Global Stats */}
      {globalStats && (
        <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Global Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-300">{globalStats.totalReferrals}</div>
              <div className="text-sm text-gray-400">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-300">{globalStats.totalXPDistributed}</div>
              <div className="text-sm text-gray-400">XP Distributed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-300">{globalStats.averageReferralsPerUser}</div>
              <div className="text-sm text-gray-400">Avg per User</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralsTab({ referrals, referralStats, isLoading, formatAddress }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Your Referrals</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading referrals...</div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No referrals yet</div>
            <div className="text-sm text-gray-500">Share your referral link to start earning!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral: string, index: number) => (
              <div key={referral} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-white font-mono">{formatAddress(referral)}</div>
                    <div className="text-xs text-gray-400">Direct Referral</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-cyan-300">+10 XP</div>
                  <div className="text-xs text-gray-400">Earned</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral Stats */}
      <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Referral Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-3xl font-bold text-cyan-300 mb-2">{referralStats?.level1Count || 0}</div>
            <div className="text-sm text-gray-400 mb-1">Direct Referrals</div>
            <div className="text-xs text-gray-500">Earn 10 XP each</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-300 mb-2">{referralStats?.level2Count || 0}</div>
            <div className="text-sm text-gray-400 mb-1">Level 2 Referrals</div>
            <div className="text-xs text-gray-500">Earn 3 XP each</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarningsTab({ referralStats, globalStats, calculatePotentialEarnings }: any) {
  const potentialEarnings = calculatePotentialEarnings(
    referralStats?.level1Count || 0,
    referralStats?.level2Count || 0
  );

  return (
    <div className="space-y-6">
      {/* Current Earnings */}
      <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Current Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{referralStats?.totalXPEarned || 0}</div>
            <div className="text-sm text-gray-400">Total XP Earned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{referralStats?.currentReputation || 0}</div>
            <div className="text-sm text-gray-400">Current Reputation</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{potentialEarnings}</div>
            <div className="text-sm text-gray-400">Potential Earnings</div>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Earnings Breakdown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white">Direct Referrals</div>
              <div className="text-sm text-gray-400">{referralStats?.level1Count || 0} referrals</div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold">+{referralStats?.level1Count * 10 || 0} XP</div>
              <div className="text-xs text-gray-400">10 XP each</div>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white">Level 2 Referrals</div>
              <div className="text-sm text-gray-400">{referralStats?.level2Count || 0} referrals</div>
            </div>
            <div className="text-right">
              <div className="text-purple-400 font-bold">+{referralStats?.level2Count * 3 || 0} XP</div>
              <div className="text-xs text-gray-400">3 XP each</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Earnings */}
      {globalStats && (
        <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Global Earnings</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-cyan-300 mb-2">{globalStats.totalXPDistributed}</div>
            <div className="text-sm text-gray-400">Total XP Distributed</div>
            <div className="text-xs text-gray-500 mt-2">Across {globalStats.totalReferrals} referrals</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TiersTab({ currentTier, nextTier, referralStats, TIER_INFO }: any) {
  return (
    <div className="space-y-6">
      {/* Current Tier */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Your Current Tier</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-3xl font-bold ${currentTier.color} mb-2`}>{currentTier.name}</div>
            <div className="text-gray-300">{currentTier.perks.join(' • ')}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{referralStats?.currentReputation || 0}</div>
            <div className="text-sm text-gray-400">Current XP</div>
          </div>
        </div>
      </div>

      {/* Next Tier */}
      {nextTier && (
        <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Next Tier</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${nextTier.color} mb-2`}>{nextTier.name}</div>
              <div className="text-gray-300">{nextTier.perks.join(' • ')}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-300">{nextTier.minXP - (referralStats?.currentReputation || 0)}</div>
              <div className="text-sm text-gray-400">XP Needed</div>
            </div>
          </div>
        </div>
      )}

      {/* All Tiers */}
      <div className="bg-white/5 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-xl font-bold text-white mb-4">All Tiers</h3>
        <div className="space-y-4">
          {TIER_INFO.map((tier: TierInfo, index: number) => (
            <div key={tier.name} className={`p-4 rounded-lg border ${
              tier.name === currentTier.name 
                ? 'border-purple-500/50 bg-purple-500/10' 
                : 'border-gray-500/30 bg-white/5'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-lg font-bold ${tier.color}`}>{tier.name}</div>
                  <div className="text-sm text-gray-400">{tier.perks.join(' • ')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">{tier.minXP}+ XP</div>
                  {tier.name === currentTier.name && (
                    <div className="text-xs text-purple-400">Current</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

