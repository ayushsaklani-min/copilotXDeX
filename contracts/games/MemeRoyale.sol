// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MemeRoyale
 * @notice Battle royale style token competition
 */
contract MemeRoyale is Ownable, ReentrancyGuard {
    struct Tournament {
        uint256 id;
        address[] tokens;
        mapping(address => uint256) votes;
        mapping(address => mapping(address => bool)) hasVoted;
        uint256 prizePool;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        address winner;
    }
    
    mapping(uint256 => Tournament) public tournaments;
    uint256 public tournamentCounter;
    uint256 public constant VOTE_COST = 0.01 ether;
    uint256 public constant TOURNAMENT_DURATION = 1 days;
    uint256 public constant MIN_TOKENS = 4;
    uint256 public constant MAX_TOKENS = 16;
    
    address public xpRewardsContract;
    
    event TournamentCreated(uint256 indexed tournamentId, address[] tokens, uint256 startTime);
    event VoteCast(uint256 indexed tournamentId, address indexed voter, address indexed token);
    event TournamentFinalized(uint256 indexed tournamentId, address winner, uint256 prizePool);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    function createTournament(address[] memory tokens) external onlyOwner returns (uint256) {
        require(tokens.length >= MIN_TOKENS && tokens.length <= MAX_TOKENS, "Invalid token count");
        
        tournamentCounter++;
        Tournament storage tournament = tournaments[tournamentCounter];
        tournament.id = tournamentCounter;
        tournament.tokens = tokens;
        tournament.startTime = block.timestamp;
        tournament.endTime = block.timestamp + TOURNAMENT_DURATION;
        tournament.isActive = true;
        
        emit TournamentCreated(tournamentCounter, tokens, block.timestamp);
        return tournamentCounter;
    }
    
    function vote(uint256 tournamentId, address token) external payable nonReentrant {
        require(msg.value >= VOTE_COST, "Insufficient vote cost");
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.isActive, "Tournament not active");
        require(block.timestamp < tournament.endTime, "Tournament ended");
        require(!tournament.hasVoted[msg.sender][token], "Already voted for this token");
        require(_isTokenInTournament(tournament, token), "Token not in tournament");
        
        tournament.votes[token]++;
        tournament.hasVoted[msg.sender][token] = true;
        tournament.prizePool += msg.value;
        
        // Award XP
        if (xpRewardsContract != address(0)) {
            (bool success,) = xpRewardsContract.call(
                abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, 2)
            );
            require(success);
        }
        
        emit VoteCast(tournamentId, msg.sender, token);
    }
    
    function finalizeTournament(uint256 tournamentId) external nonReentrant {
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.isActive, "Tournament not active");
        require(block.timestamp >= tournament.endTime, "Tournament not ended");
        require(!tournament.isFinalized, "Already finalized");
        
        // Find winner
        address winner;
        uint256 maxVotes = 0;
        for (uint256 i = 0; i < tournament.tokens.length; i++) {
            address token = tournament.tokens[i];
            if (tournament.votes[token] > maxVotes) {
                maxVotes = tournament.votes[token];
                winner = token;
            }
        }
        
        tournament.winner = winner;
        tournament.isActive = false;
        tournament.isFinalized = true;
        
        emit TournamentFinalized(tournamentId, winner, tournament.prizePool);
    }
    
    function _isTokenInTournament(Tournament storage tournament, address token) internal view returns (bool) {
        for (uint256 i = 0; i < tournament.tokens.length; i++) {
            if (tournament.tokens[i] == token) return true;
        }
        return false;
    }
    
    function getTournamentTokens(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].tokens;
    }
    
    function getTokenVotes(uint256 tournamentId, address token) external view returns (uint256) {
        return tournaments[tournamentId].votes[token];
    }
    
    function setXPRewardsContract(address _xpRewardsContract) external onlyOwner {
        xpRewardsContract = _xpRewardsContract;
    }
    
    receive() external payable {}
}
