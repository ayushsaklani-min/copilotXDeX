// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Coinflip
 * @notice Provably fair coinflip game with XP rewards
 * @dev Uses block hash for randomness (Chainlink VRF in production)
 */
contract Coinflip is Ownable, ReentrancyGuard {
    enum Side { HEADS, TAILS }
    enum GameStatus { PENDING, WON, LOST }
    
    struct Game {
        address player;
        uint256 betAmount;
        Side chosenSide;
        Side result;
        GameStatus status;
        uint256 timestamp;
        uint256 payout;
        uint256 xpEarned;
    }
    
    mapping(address => Game[]) public playerGames;
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerLosses;
    mapping(address => uint256) public totalWagered;
    mapping(address => uint256) public totalWon;
    
    uint256 public constant MIN_BET = 0.01 ether;
    uint256 public constant MAX_BET = 10 ether;
    uint256 public constant HOUSE_EDGE = 200; // 2%
    uint256 public constant EDGE_DENOMINATOR = 10000;
    uint256 public constant XP_PER_GAME = 5;
    uint256 public constant XP_WIN_BONUS = 10;
    
    address public xpRewardsContract;
    address public gameVault;
    
    uint256 public totalGamesPlayed;
    uint256 public totalVolume;
    
    event GamePlayed(
        address indexed player,
        uint256 indexed gameId,
        Side chosenSide,
        Side result,
        uint256 betAmount,
        uint256 payout,
        GameStatus status
    );
    
    event XPAwarded(address indexed player, uint256 amount);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @notice Play coinflip game
     * @param chosenSide HEADS or TAILS
     */
    function play(Side chosenSide) external payable nonReentrant {
        require(msg.value >= MIN_BET, "Bet too small");
        require(msg.value <= MAX_BET, "Bet too large");
        require(address(this).balance >= msg.value * 2, "Insufficient vault balance");
        
        // Generate random result (use Chainlink VRF in production)
        Side result = _generateResult();
        
        GameStatus status;
        uint256 payout = 0;
        uint256 xpEarned = XP_PER_GAME;
        
        if (result == chosenSide) {
            // Player wins
            status = GameStatus.WON;
            uint256 houseEdgeAmount = (msg.value * HOUSE_EDGE) / EDGE_DENOMINATOR;
            payout = (msg.value * 2) - houseEdgeAmount;
            
            payable(msg.sender).transfer(payout);
            
            playerWins[msg.sender]++;
            totalWon[msg.sender] += payout;
            xpEarned += XP_WIN_BONUS;
        } else {
            // Player loses
            status = GameStatus.LOST;
            playerLosses[msg.sender]++;
        }
        
        // Record game
        Game memory game = Game({
            player: msg.sender,
            betAmount: msg.value,
            chosenSide: chosenSide,
            result: result,
            status: status,
            timestamp: block.timestamp,
            payout: payout,
            xpEarned: xpEarned
        });
        
        playerGames[msg.sender].push(game);
        totalWagered[msg.sender] += msg.value;
        totalGamesPlayed++;
        totalVolume += msg.value;
        
        // Award XP
        if (xpRewardsContract != address(0)) {
            (bool success,) = xpRewardsContract.call(
                abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, xpEarned)
            );
            if (success) {
                emit XPAwarded(msg.sender, xpEarned);
            }
        }
        
        emit GamePlayed(
            msg.sender,
            playerGames[msg.sender].length - 1,
            chosenSide,
            result,
            msg.value,
            payout,
            status
        );
    }
    
    /**
     * @notice Generate random result
     * @dev Uses block hash - replace with Chainlink VRF for production
     */
    function _generateResult() internal view returns (Side) {
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            totalGamesPlayed
        )));
        
        return random % 2 == 0 ? Side.HEADS : Side.TAILS;
    }
    
    /**
     * @notice Get player game history
     */
    function getPlayerGames(address player) external view returns (Game[] memory) {
        return playerGames[player];
    }
    
    /**
     * @notice Get player statistics
     */
    function getPlayerStats(address player) external view returns (
        uint256 wins,
        uint256 losses,
        uint256 wagered,
        uint256 won,
        uint256 gamesPlayed
    ) {
        return (
            playerWins[player],
            playerLosses[player],
            totalWagered[player],
            totalWon[player],
            playerGames[player].length
        );
    }
    
    /**
     * @notice Set XP rewards contract
     */
    function setXPRewardsContract(address _xpRewardsContract) external onlyOwner {
        xpRewardsContract = _xpRewardsContract;
    }
    
    /**
     * @notice Set game vault
     */
    function setGameVault(address _gameVault) external onlyOwner {
        gameVault = _gameVault;
    }
    
    /**
     * @notice Fund game vault
     */
    function fundVault() external payable onlyOwner {
        require(msg.value > 0, "Must send funds");
    }
    
    /**
     * @notice Withdraw from vault
     */
    function withdrawVault(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    receive() external payable {}
}
