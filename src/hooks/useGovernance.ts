import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contracts from '../config/contracts.json';

const GOVERNANCE_ABI = [
  "function badgeContract() view returns (address)",
  "function dexContract() view returns (address)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (uint256 id, address proposer, uint8 proposalType, string title, string description, address target, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, uint8 status)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function userHasVoted(uint256, address) view returns (bool)",
  "function getUserVote(uint256, address) view returns (bool support, uint256 votePower)",
  "function vote(uint256 proposalId, bool support)",
  "function createProposal(uint8 _type, string _title, string _description, address _target, bytes _calldata) returns (uint256)",
  "function executeProposal(uint256 proposalId)",
  "function updateProposalStatus(uint256 proposalId)",
  "function getUserProposals(address) view returns (uint256[])",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint8 proposalType, string title)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes)",
  "event ProposalExecuted(uint256 indexed proposalId)"
];

const BADGE_ABI = [
  "function checkAndMintBadge(address user) returns (uint256)",
  "function getBadgeInfo(address user) view returns (bool hasBadge, uint256 tokenId, uint256 tier, string memory tierName)",
  "function getVotingPower(uint256 tokenId) view returns (uint256)",
  "function hasValidBadge(address user) view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event BadgeMinted(address indexed user, uint256 indexed tokenId, uint256 tier)"
];

export interface Proposal {
  id: number;
  proposer: string;
  proposalType: number;
  title: string;
  description: string;
  target: string;
  startTime: number;
  endTime: number;
  forVotes: bigint;
  againstVotes: bigint;
  status: number;
}

export interface BadgeInfo {
  hasBadge: boolean;
  tokenId: number;
  tier: number;
  tierName: string;
  votingPower: number;
}

export interface UseGovernanceReturn {
  proposals: Proposal[];
  badgeInfo: BadgeInfo | null;
  isLoading: boolean;
  error: string | null;
  createProposal: (type: number, title: string, description: string, target: string, calldata: string) => Promise<string | null>;
  vote: (proposalId: number, support: boolean) => Promise<string | null>;
  executeProposal: (proposalId: number) => Promise<string | null>;
  checkAndMintBadge: () => Promise<string | null>;
  refreshData: () => Promise<void>;
  userHasVoted: (proposalId: number) => Promise<boolean>;
  getUserVote: (proposalId: number) => Promise<{ support: boolean; votes: number } | null>;
}

export function useGovernance(
  signer: ethers.JsonRpcSigner | null,
  address: string | null
): UseGovernanceReturn {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const governanceAddress = (contracts as any).governanceAddress as string;
  const badgeAddress = (contracts as any).badgeAddress as string;

  const refreshData = useCallback(async () => {
    if (!signer || !address) return;
    if (!governanceAddress || !badgeAddress || governanceAddress === '' || badgeAddress === '') {
      setError('Governance contracts not deployed. Please deploy contracts first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      const badge = new ethers.Contract(badgeAddress, BADGE_ABI, signer);

      // Get badge info
      try {
        const [hasBadge, tokenId, tier, tierName] = await badge.getBadgeInfo(address);
        let votingPower = 0;
        if (hasBadge && tokenId > 0) {
          votingPower = Number(await badge.getVotingPower(tokenId));
        }
        setBadgeInfo({
          hasBadge,
          tokenId: Number(tokenId),
          tier: Number(tier),
          tierName,
          votingPower
        });
      } catch (err) {
        console.error('Error fetching badge info:', err);
      }

      // Get all proposals
      try {
        const proposalCount = Number(await governance.proposalCount());
        const proposalPromises: Promise<Proposal>[] = [];

        for (let i = 1; i <= proposalCount; i++) {
          proposalPromises.push(
            governance.proposals(i).then((p: any) => ({
              id: Number(p.id),
              proposer: p.proposer,
              proposalType: Number(p.proposalType),
              title: p.title,
              description: p.description,
              target: p.target,
              startTime: Number(p.startTime),
              endTime: Number(p.endTime),
              forVotes: p.forVotes,
              againstVotes: p.againstVotes,
              status: Number(p.status)
            }))
          );
        }

        const allProposals = await Promise.all(proposalPromises);
        setProposals(allProposals.reverse()); // Newest first
      } catch (err) {
        console.error('Error fetching proposals:', err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch governance data');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address, governanceAddress, badgeAddress]);

  const checkAndMintBadge = useCallback(async (): Promise<string | null> => {
    if (!signer || !address || !badgeAddress) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const badge = new ethers.Contract(badgeAddress, BADGE_ABI, signer);
      const tx = await badge.checkAndMintBadge(address, { gasLimit: 300000 });
      const receipt = await tx.wait();
      await refreshData();
      return receipt.hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint badge');
      return null;
    }
  }, [signer, address, badgeAddress, refreshData]);

  const createProposal = useCallback(async (
    type: number,
    title: string,
    description: string,
    target: string,
    calldata: string
  ): Promise<string | null> => {
    if (!signer || !address || !governanceAddress) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      const tx = await governance.createProposal(
        type,
        title,
        description,
        target,
        calldata,
        { gasLimit: 500000 }
      );
      const receipt = await tx.wait();
      await refreshData();
      return receipt.hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
      return null;
    }
  }, [signer, address, governanceAddress, refreshData]);

  const vote = useCallback(async (
    proposalId: number,
    support: boolean
  ): Promise<string | null> => {
    if (!signer || !address || !governanceAddress) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      const tx = await governance.vote(proposalId, support, { gasLimit: 300000 });
      const receipt = await tx.wait();
      await refreshData();
      return receipt.hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
      return null;
    }
  }, [signer, address, governanceAddress, refreshData]);

  const executeProposal = useCallback(async (
    proposalId: number
  ): Promise<string | null> => {
    if (!signer || !address || !governanceAddress) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      const tx = await governance.executeProposal(proposalId, { gasLimit: 500000 });
      const receipt = await tx.wait();
      await refreshData();
      return receipt.hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute proposal');
      return null;
    }
  }, [signer, address, governanceAddress, refreshData]);

  const userHasVoted = useCallback(async (proposalId: number): Promise<boolean> => {
    if (!signer || !address || !governanceAddress) return false;
    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      return await governance.userHasVoted(proposalId, address);
    } catch {
      return false;
    }
  }, [signer, address, governanceAddress]);

  const getUserVote = useCallback(async (
    proposalId: number
  ): Promise<{ support: boolean; votes: number } | null> => {
    if (!signer || !address || !governanceAddress) return null;
    try {
      const governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, signer);
      const [support, votes] = await governance.getUserVote(proposalId, address);
      return { support, votes: Number(votes) };
    } catch {
      return null;
    }
  }, [signer, address, governanceAddress]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
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
  };
}

