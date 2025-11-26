// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Mines
 * @notice Grid-based mines game with progressive multipliers
 */
contract Mines is Ownable, ReentrancyGuard {
    struct Game {
        address player;
        uint256 betAmount;
        uint256 minesCount;
        uint256 tilesRevealed;
        uint256 currentMultiplier;
        bool isActive;
        bool[] revealedTiles;
        bool[] minePositions;
        uint256 startTime;
    }
    
    mapping(address => Game) public activeGames;
    mapping(address => uint256) public totalWins;
    mapping(address => uint256) public totalLosses;
    
    uint256 public constant GRID_SIZE = 25; // 5x5 grid
    uint256 public constant MIN_BET = 0.01 ether;
    uint256 public constant MAX_BET = 5 ether;
    uint256 public constant MIN_MINES = 3;
    uint256 public constant MAX_MINES = 20;
    uint256 public constant XP_PER_GAME = 3;
    uint256 public constant XP_WIN_BONUS = 15;
    
    address public xpRewardsContract;
    
    event GameStarted(address indexed player, uint256 betAmount, uint256 minesCount);
    event TileRevealed(address indexed player, uint256 tileIndex, bool isMine, uint256 multiplier);
    event GameCashedOut(address indexed player, uint256 payout, uint256 multiplier);
    event GameLost(address indexed player, uint256 betAmount);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    function startGame(uint256 minesCount) external payable nonReentrant {
        require(msg.value >= MIN_BET && msg.value <= MAX_BET, "Invalid bet");
        require(minesCount >= MIN_MINES && minesCount <= MAX_MINES, "Invalid mines count");
        require(!activeGames[msg.sender].isActive, "Game already active");
        require(address(this).balance >= msg.value * 10, "Insufficient vault");
        
        Game storage game = activeGames[msg.sender];
        game.player = msg.sender;
        game.betAmount = msg.value;
        game.minesCount = minesCount;
        game.tilesRevealed = 0;
        game.currentMultiplier = 100; // 1.0x
        game.isActive = true;
        game.startTime = block.timestamp;
        
        // Initialize arrays
        game.revealedTiles = new bool[](GRID_SIZE);
        game.minePositions = new bool[](GRID_SIZE);
        
        // Generate mine positions
        _generateMines(game);
        
        emit GameStarted(msg.sender, msg.value, minesCount);
    }
    
    function revealTile(uint256 tileIndex) external nonReentrant {
        Game storage game = activeGames[msg.sender];
        require(game.isActive, "No active game");
        require(tileIndex < GRID_SIZE, "Invalid tile");
        require(!game.revealedTiles[tileIndex], "Tile already revealed");
        
        game.revealedTiles[tileIndex] = true;
        
        if (game.minePositions[tileIndex]) {
            // Hit a mine - game over
            game.isActive = false;
            totalLosses[msg.sender]++;
            
            // Award participation XP
            if (xpRewardsContract != address(0)) {
                (bool success,) = xpRewardsContract.call(
                    abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, XP_PER_GAME)
                );
                require(success);
            }
            
            emit TileRevealed(msg.sender, tileIndex, true, 0);
            emit GameLost(msg.sender, game.betAmount);
        } else {
            // Safe tile - increase multiplier
            game.tilesRevealed++;
            game.currentMultiplier = _calculateMultiplier(game.tilesRevealed, game.minesCount);
            
            emit TileRevealed(msg.sender, tileIndex, false, game.currentMultiplier);
        }
    }
    
    function cashOut() external nonReentrant {
        Game storage game = activeGames[msg.sender];
        require(game.isActive, "No active game");
        require(game.tilesRevealed > 0, "Must reveal at least one tile");
        
        uint256 payout = (game.betAmount * game.currentMultiplier) / 100;
        game.isActive = false;
        totalWins[msg.sender]++;
        
        payable(msg.sender).transfer(payout);
        
        // Award XP
        if (xpRewardsContract != address(0)) {
            uint256 xpAmount = XP_PER_GAME + XP_WIN_BONUS;
            (bool success,) = xpRewardsContract.call(
                abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, xpAmount)
            );
            require(success);
        }
        
        emit GameCashedOut(msg.sender, payout, game.currentMultiplier);
    }
    
    function _generateMines(Game storage game) internal {
        uint256 minesPlaced = 0;
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            game.betAmount
        )));
        
        while (minesPlaced < game.minesCount) {
            uint256 position = uint256(keccak256(abi.encodePacked(seed, minesPlaced))) % GRID_SIZE;
            if (!game.minePositions[position]) {
                game.minePositions[position] = true;
                minesPlaced++;
            }
        }
    }
    
    function _calculateMultiplier(uint256 tilesRevealed, uint256 minesCount) internal pure returns (uint256) {
        // Progressive multiplier based on tiles revealed and mine density
        uint256 safeTiles = GRID_SIZE - minesCount;
        uint256 baseMultiplier = 100 + (tilesRevealed * 20); // +0.2x per tile
        uint256 riskBonus = (minesCount * 5); // +0.05x per mine
        return baseMultiplier + (tilesRevealed * riskBonus);
    }
    
    function getGameState(address player) external view returns (
        bool isActive,
        uint256 betAmount,
        uint256 minesCount,
        uint256 tilesRevealed,
        uint256 currentMultiplier,
        bool[] memory revealedTiles
    ) {
        Game storage game = activeGames[player];
        return (
            game.isActive,
            game.betAmount,
            game.minesCount,
            game.tilesRevealed,
            game.currentMultiplier,
            game.revealedTiles
        );
    }
    
    function setXPRewardsContract(address _xpRewardsContract) external onlyOwner {
        xpRewardsContract = _xpRewardsContract;
    }
    
    function fundVault() external payable onlyOwner {}
    
    function withdrawVault(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }
    
    receive() external payable {}
}
