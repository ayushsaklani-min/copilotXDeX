// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GovernanceBadge.sol";

/**
 * @title Governance
 * @dev On-chain governance system for TikTakDex protocol decisions
 */
contract Governance is Ownable, ReentrancyGuard {
    GovernanceBadge public badgeContract;
    address public dexContract;
    
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_THRESHOLD = 100; // Minimum votes needed
    uint256 public constant EXECUTION_DELAY = 1 days; // Delay after voting ends before execution
    
    enum ProposalType {
        FEE_CHANGE,      // Change trading fees
        ADD_POOL,        // Add new trading pair
        UPDATE_REWARDS,  // Update farming reward rates
        PARAMETER_CHANGE // Other parameter changes
    }
    
    enum ProposalStatus {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Cancelled
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        string title;
        string description;
        bytes callData; // Encoded function call data
        address target; // Contract to execute on
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        ProposalStatus status;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votes; // Track individual votes
    mapping(uint256 => mapping(address => bool)) public voteSupport; // Track if vote was for/against
    mapping(address => uint256[]) public userProposals;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string title
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votes
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    constructor(
        address _badgeContract,
        address _dexContract,
        address initialOwner
    ) Ownable(initialOwner) {
        badgeContract = GovernanceBadge(_badgeContract);
        dexContract = _dexContract;
    }
    
    /**
     * @dev Create a new governance proposal
     */
    function createProposal(
        ProposalType _type,
        string memory _title,
        string memory _description,
        address _target,
        bytes memory _calldata
    ) external nonReentrant returns (uint256) {
        require(badgeContract.hasValidBadge(msg.sender), "Must have governance badge");
        require(_target != address(0), "Invalid target");
        require(bytes(_title).length > 0, "Title required");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.proposalType = _type;
        proposal.title = _title;
        proposal.description = _description;
        proposal.target = _target;
        proposal.callData = _calldata;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.status = ProposalStatus.Active;
        
        userProposals[msg.sender].push(proposalId);
        
        emit ProposalCreated(proposalId, msg.sender, _type, _title);
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal
     */
    function vote(uint256 proposalId, bool support) external nonReentrant {
        require(badgeContract.hasValidBadge(msg.sender), "Must have governance badge");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        // Get user's badge token ID and voting power
        (bool hasBadge, uint256 tokenId,,) = badgeContract.getBadgeInfo(msg.sender);
        require(hasBadge && tokenId > 0, "No valid badge");
        
        uint256 votingPower = badgeContract.getVotingPower(tokenId);
        require(votingPower > 0, "Invalid voting power");
        
        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = votingPower;
        voteSupport[proposalId][msg.sender] = support;
        
        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votingPower);
        
        // Check if proposal can be finalized
        _checkProposalStatus(proposalId);
    }
    
    /**
     * @dev Execute a successful proposal
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Succeeded, "Proposal not succeeded");
        require(block.timestamp >= proposal.endTime + EXECUTION_DELAY, "Execution delay not met");
        
        proposal.status = ProposalStatus.Executed;
        
        // Execute the proposal
        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (only owner or proposer before voting ends)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == owner() || msg.sender == proposal.proposer,
            "Not authorized"
        );
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp < proposal.endTime, "Voting ended");
        
        proposal.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        ProposalType proposalType,
        string memory title,
        string memory description,
        address target,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        ProposalStatus status
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.proposalType,
            proposal.title,
            proposal.description,
            proposal.target,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.status
        );
    }
    
    /**
     * @dev Check if user has voted on a proposal
     */
    function userHasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }
    
    /**
     * @dev Get user's vote on a proposal
     */
    function getUserVote(uint256 proposalId, address voter) external view returns (bool support, uint256 votePower) {
        require(hasVoted[proposalId][voter], "User has not voted");
        votePower = votes[proposalId][voter];
        support = voteSupport[proposalId][voter];
    }
    
    /**
     * @dev Internal function to check and update proposal status
     */
    function _checkProposalStatus(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (block.timestamp > proposal.endTime) {
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
            
            if (totalVotes >= QUORUM_THRESHOLD && proposal.forVotes > proposal.againstVotes) {
                proposal.status = ProposalStatus.Succeeded;
            } else {
                proposal.status = ProposalStatus.Defeated;
            }
        }
    }
    
    /**
     * @dev Update proposal status (can be called by anyone after voting ends)
     */
    function updateProposalStatus(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        
        _checkProposalStatus(proposalId);
    }
    
    /**
     * @dev Get all proposal IDs for a user
     */
    function getUserProposals(address user) external view returns (uint256[] memory) {
        return userProposals[user];
    }
}

