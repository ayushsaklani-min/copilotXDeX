'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { useGovernance, Proposal, BadgeInfo } from '../../hooks/useGovernance';
import { useReputation } from '../../hooks/useReputation';

interface GovernanceDashboardProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  standalone?: boolean;
}

const PROPOSAL_TYPES = ['Fee Change', 'Add Pool', 'Update Rewards', 'Parameter Change'];
const PROPOSAL_STATUS = ['Pending', 'Active', 'Succeeded', 'Defeated', 'Executed', 'Cancelled'];

export default function GovernanceDashboard({ signer, address, standalone = true }: GovernanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'proposals' | 'create' | 'my-proposals'>('proposals');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({ message: '', type: 'info' });

  // Form state for creating proposals
  const [proposalForm, setProposalForm] = useState({
    type: 0,
    title: '',
    description: '',
    target: '',
    calldata: ''
  });

  const { 
    proposals, 
    badgeInfo, 
    isLoading, 
    error, 
    createProposal, 
    vote, 
    executeProposal, 
    checkAndMintBadge,
    refreshData,
    userHasVoted,
    getUserVote
  } = useGovernance(signer, address);

  const { score: reputationScore } = useReputation(signer, address ?? undefined);

  const handleCheckBadge = async () => {
    setStatus({ message: 'Checking and minting badge...', type: 'info' });
    try {
      const txHash = await checkAndMintBadge();
      if (txHash) {
        setStatus({ 
          message: `Badge check complete! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
      } else {
        setStatus({ message: 'No badge available yet. Reach Diamond (500 XP) or Crystal (1000 XP) tier.', type: 'info' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to check badge', type: 'error' });
    }
  };

  const handleCreateProposal = async () => {
    if (!proposalForm.title || !proposalForm.description || !proposalForm.target) {
      setStatus({ message: 'Please fill all required fields', type: 'error' });
      return;
    }

    setIsCreating(true);
    setStatus({ message: 'Creating proposal...', type: 'info' });

    try {
      const txHash = await createProposal(
        proposalForm.type,
        proposalForm.title,
        proposalForm.description,
        proposalForm.target,
        proposalForm.calldata || '0x'
      );

      if (txHash) {
        setStatus({ 
          message: `Proposal created! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        setProposalForm({ type: 0, title: '', description: '', target: '', calldata: '' });
        setActiveTab('proposals');
      } else {
        setStatus({ message: 'Failed to create proposal', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to create proposal', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    setIsVoting(true);
    setStatus({ message: support ? 'Voting for proposal...' : 'Voting against proposal...', type: 'info' });

    try {
      const txHash = await vote(proposalId, support);
      if (txHash) {
        setStatus({ 
          message: `Vote cast! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
        setSelectedProposal(null);
      } else {
        setStatus({ message: 'Failed to vote', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to vote', type: 'error' });
    } finally {
      setIsVoting(false);
    }
  };

  const handleExecute = async (proposalId: number) => {
    setIsExecuting(true);
    setStatus({ message: 'Executing proposal...', type: 'info' });

    try {
      const txHash = await executeProposal(proposalId);
      if (txHash) {
        setStatus({ 
          message: `Proposal executed! TX: ${txHash.slice(0, 10)}...`, 
          type: 'success' 
        });
      } else {
        setStatus({ message: 'Failed to execute proposal', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to execute proposal', type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    if (remaining <= 0) return 'Ended';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const getStatusColor = (status: number) => {
    const colors = {
      0: 'bg-gray-500',
      1: 'bg-blue-500',
      2: 'bg-green-500',
      3: 'bg-red-500',
      4: 'bg-purple-500',
      5: 'bg-yellow-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const activeProposals = proposals.filter(p => p.status === 1);
  const myProposals = proposals.filter(p => p.proposer.toLowerCase() === address?.toLowerCase());

  if (standalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <GovernanceContent
            signer={signer}
            address={address}
            proposals={proposals}
            activeProposals={activeProposals}
            myProposals={myProposals}
            badgeInfo={badgeInfo}
            reputationScore={reputationScore}
            isLoading={isLoading}
            error={error}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            proposalForm={proposalForm}
            setProposalForm={setProposalForm}
            isCreating={isCreating}
            isVoting={isVoting}
            isExecuting={isExecuting}
            status={status}
            handleCheckBadge={handleCheckBadge}
            handleCreateProposal={handleCreateProposal}
            handleVote={handleVote}
            handleExecute={handleExecute}
            formatTime={formatTime}
            getTimeRemaining={getTimeRemaining}
            getStatusColor={getStatusColor}
            userHasVoted={userHasVoted}
          />
        </div>
      </div>
    );
  }

  return (
    <GovernanceContent
      signer={signer}
      address={address}
      proposals={proposals}
      activeProposals={activeProposals}
      myProposals={myProposals}
      badgeInfo={badgeInfo}
      reputationScore={reputationScore}
      isLoading={isLoading}
      error={error}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedProposal={selectedProposal}
      setSelectedProposal={setSelectedProposal}
      proposalForm={proposalForm}
      setProposalForm={setProposalForm}
      isCreating={isCreating}
      isVoting={isVoting}
      isExecuting={isExecuting}
      status={status}
      handleCheckBadge={handleCheckBadge}
      handleCreateProposal={handleCreateProposal}
      handleVote={handleVote}
      handleExecute={handleExecute}
      formatTime={formatTime}
      getTimeRemaining={getTimeRemaining}
      getStatusColor={getStatusColor}
      userHasVoted={userHasVoted}
    />
  );
}

interface GovernanceContentProps {
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  proposals: Proposal[];
  activeProposals: Proposal[];
  myProposals: Proposal[];
  badgeInfo: BadgeInfo | null;
  reputationScore: number;
  isLoading: boolean;
  error: string | null;
  activeTab: 'proposals' | 'create' | 'my-proposals';
  setActiveTab: (tab: 'proposals' | 'create' | 'my-proposals') => void;
  selectedProposal: Proposal | null;
  setSelectedProposal: (proposal: Proposal | null) => void;
  proposalForm: any;
  setProposalForm: (form: any) => void;
  isCreating: boolean;
  isVoting: boolean;
  isExecuting: boolean;
  status: { message: string; type: 'success' | 'error' | 'info' };
  handleCheckBadge: () => Promise<void>;
  handleCreateProposal: () => Promise<void>;
  handleVote: (proposalId: number, support: boolean) => Promise<void>;
  handleExecute: (proposalId: number) => Promise<void>;
  formatTime: (timestamp: number) => string;
  getTimeRemaining: (endTime: number) => string;
  getStatusColor: (status: number) => string;
  userHasVoted: (proposalId: number) => Promise<boolean>;
}

function GovernanceContent({
  signer,
  address,
  proposals,
  activeProposals,
  myProposals,
  badgeInfo,
  reputationScore,
  isLoading,
  error,
  activeTab,
  setActiveTab,
  selectedProposal,
  setSelectedProposal,
  proposalForm,
  setProposalForm,
  isCreating,
  isVoting,
  isExecuting,
  status,
  handleCheckBadge,
  handleCreateProposal,
  handleVote,
  handleExecute,
  formatTime,
  getTimeRemaining,
  getStatusColor,
  userHasVoted
}: GovernanceContentProps) {
  const [userVotes, setUserVotes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const checkVotes = async () => {
      const votes: Record<number, boolean> = {};
      for (const proposal of activeProposals) {
        const hasVoted = await userHasVoted(proposal.id);
        votes[proposal.id] = hasVoted;
      }
      setUserVotes(votes);
    };
    if (activeProposals.length > 0) checkVotes();
  }, [activeProposals, userHasVoted]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
        <h1 className="text-3xl font-bold text-white mb-4">🏛️ Governance Dashboard</h1>
        <p className="text-gray-300 mb-4">Participate in protocol decisions with your governance badge</p>
        
        {/* Badge Status */}
        <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Your Badge Status</div>
            {badgeInfo?.hasBadge ? (
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  badgeInfo.tier === 2 ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  {badgeInfo.tierName === 'Crystal' ? '💎' : '🔷'} {badgeInfo.tierName}
                </div>
                <div className="text-sm text-gray-300">
                  Voting Power: {badgeInfo.votingPower}x
                </div>
              </div>
            ) : (
              <div className="text-gray-300">
                {reputationScore >= 1000 ? 'Crystal' : reputationScore >= 500 ? 'Diamond' : 'No Badge'} 
                ({reputationScore} XP)
                {reputationScore >= 500 && (
                  <button
                    onClick={handleCheckBadge}
                    className="ml-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-semibold"
                  >
                    Check & Mint Badge
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Reputation Score</div>
            <div className="text-2xl font-bold text-white">{reputationScore} XP</div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status.message && (
        <div className={`rounded-lg p-4 border ${
          status.type === 'success' ? 'bg-green-500/20 border-green-500/40 text-green-200' :
          status.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-200' :
          'bg-blue-500/20 border-blue-500/40 text-blue-200'
        }`}>
          {status.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
        {[
          { id: 'proposals', label: '📋 Active Proposals', count: activeProposals.length },
          { id: 'create', label: '➕ Create Proposal' },
          { id: 'my-proposals', label: '📝 My Proposals', count: myProposals.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            {tab.label} {tab.count !== undefined && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-400">Loading governance data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-200">
          {error}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'proposals' && (
            <motion.div
              key="proposals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {activeProposals.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-lg">
                  <p className="text-gray-400">No active proposals</p>
                </div>
              ) : (
                activeProposals.map(proposal => (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                            {PROPOSAL_STATUS[proposal.status]}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{proposal.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>Type: {PROPOSAL_TYPES[proposal.proposalType]}</span>
                          <span>•</span>
                          <span>Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
                          <span>•</span>
                          <span>⏰ {getTimeRemaining(proposal.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                        <div className="text-sm text-gray-400 mb-1">For Votes</div>
                        <div className="text-2xl font-bold text-green-400">
                          {Number(proposal.forVotes)}
                        </div>
                      </div>
                      <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                        <div className="text-sm text-gray-400 mb-1">Against Votes</div>
                        <div className="text-2xl font-bold text-red-400">
                          {Number(proposal.againstVotes)}
                        </div>
                      </div>
                    </div>

                    {badgeInfo?.hasBadge && (
                      <div className="flex gap-3">
                        {!userVotes[proposal.id] ? (
                          <>
                            <button
                              onClick={() => handleVote(proposal.id, true)}
                              disabled={isVoting}
                              className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold disabled:opacity-50"
                            >
                              {isVoting ? 'Voting...' : `Vote For (${badgeInfo.votingPower}x)`}
                            </button>
                            <button
                              onClick={() => handleVote(proposal.id, false)}
                              disabled={isVoting}
                              className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold disabled:opacity-50"
                            >
                              {isVoting ? 'Voting...' : `Vote Against (${badgeInfo.votingPower}x)`}
                            </button>
                          </>
                        ) : (
                          <div className="w-full py-3 bg-blue-500/20 border border-blue-500/40 rounded-lg text-center text-blue-200">
                            ✓ You have voted on this proposal
                          </div>
                        )}
                      </div>
                    )}

                    {!badgeInfo?.hasBadge && (
                      <div className="py-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-center text-yellow-200">
                        You need a governance badge to vote. Reach Diamond (500 XP) or Crystal (1000 XP) tier.
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 rounded-lg p-6 border border-white/10"
            >
              {!badgeInfo?.hasBadge ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">You need a governance badge to create proposals</p>
                  <button
                    onClick={handleCheckBadge}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold"
                  >
                    Check & Mint Badge
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Proposal Type</label>
                    <select
                      value={proposalForm.type}
                      onChange={(e) => setProposalForm({ ...proposalForm, type: Number(e.target.value) })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
                    >
                      {PROPOSAL_TYPES.map((type, idx) => (
                        <option key={idx} value={idx}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={proposalForm.title}
                      onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                      placeholder="e.g., Reduce trading fees to 0.25%"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                    <textarea
                      value={proposalForm.description}
                      onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                      placeholder="Describe your proposal in detail..."
                      rows={4}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Target Contract Address</label>
                    <input
                      type="text"
                      value={proposalForm.target}
                      onChange={(e) => setProposalForm({ ...proposalForm, target: e.target.value })}
                      placeholder="0x..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Calldata (hex, optional)</label>
                    <input
                      type="text"
                      value={proposalForm.calldata}
                      onChange={(e) => setProposalForm({ ...proposalForm, calldata: e.target.value })}
                      placeholder="0x..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                    />
                  </div>

                  <button
                    onClick={handleCreateProposal}
                    disabled={isCreating}
                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Proposal'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'my-proposals' && (
            <motion.div
              key="my-proposals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {myProposals.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-lg">
                  <p className="text-gray-400">You haven't created any proposals yet</p>
                </div>
              ) : (
                myProposals.map(proposal => (
                  <div
                    key={proposal.id}
                    className="bg-white/5 rounded-lg p-6 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                            {PROPOSAL_STATUS[proposal.status]}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{proposal.description}</p>
                        <div className="text-sm text-gray-400">
                          Created: {formatTime(proposal.startTime)} • Ends: {formatTime(proposal.endTime)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                        <div className="text-sm text-gray-400 mb-1">For</div>
                        <div className="text-2xl font-bold text-green-400">{Number(proposal.forVotes)}</div>
                      </div>
                      <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                        <div className="text-sm text-gray-400 mb-1">Against</div>
                        <div className="text-2xl font-bold text-red-400">{Number(proposal.againstVotes)}</div>
                      </div>
                    </div>

                    {proposal.status === 2 && (
                      <button
                        onClick={() => handleExecute(proposal.id)}
                        disabled={isExecuting}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {isExecuting ? 'Executing...' : 'Execute Proposal'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}


