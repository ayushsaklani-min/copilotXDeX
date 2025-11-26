// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictThePrice
 * @notice AI-enhanced price prediction game
 */
contract PredictThePrice is Ownable, ReentrancyGuard {
    enum Direction { UP, DOWN }
    
    struct Round {
        uint256 id;
        address token;
        uint256 startPrice;
        uint256 endPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 upPool;
        uint256 downPool;
        bool isActive;
        bool isFinalized;
        Direction result;
    }
    
    struct Prediction {
        address player;
        uint256 amount;
        Direction direction;
        bool claimed;
    }
    
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    uint256 public roundCounter;
    
    uint256 public constant MIN_BET = 0.01 ether;
    uint256 public constant MAX_BET = 5 ether;
    uint256 public constant ROUND_DURATION = 5 minutes;
    uint256 public constant HOUSE_FEE = 200; // 2%
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant XP_PER_PREDICTION = 5;
    uint256 public constant XP_WIN_BONUS = 20;
    
    address public xpRewardsContract;
    address public priceOracle;
    
    event RoundCreated(uint256 indexed roundId, address indexed token, uint256 startPrice);
    event PredictionMade(uint256 indexed roundId, address indexed player, Direction direction, uint256 amount);
    event RoundFinalized(uint256 indexed roundId, Direction result, uint256 endPrice);
    event RewardClaimed(uint256 indexed roundId, address indexed player, uint256 amount);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    function createRound(address token, uint256 startPrice) external onlyOwner returns (uint256) {
        roundCounter++;
        Round storage round = rounds[roundCounter];
        round.id = roundCounter;
        round.token = token;
        round.startPrice = startPrice;
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + ROUND_DURATION;
        round.isActive = true;
        
        emit RoundCreated(roundCounter, token, startPrice);
        return roundCounter;
    }
    
    function predict(uint256 roundId, Direction direction) external payable nonReentrant {
        require(msg.value >= MIN_BET && msg.value <= MAX_BET, "Invalid bet");
        Round storage round = rounds[roundId];
        require(round.isActive, "Round not active");
        require(block.timestamp < round.endTime, "Round ended");
        require(predictions[roundId][msg.sender].amount == 0, "Already predicted");
        
        predictions[roundId][msg.sender] = Prediction({
            player: msg.sender,
            amount: msg.value,
            direction: direction,
            claimed: false
        });
        
        if (direction == Direction.UP) {
            round.upPool += msg.value;
        } else {
            round.downPool += msg.value;
        }
        
        // Award XP
        if (xpRewardsContract != address(0)) {
            (bool success,) = xpRewardsContract.call(
                abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, XP_PER_PREDICTION)
            );
            require(success);
        }
        
        emit PredictionMade(roundId, msg.sender, direction, msg.value);
    }
    
    function finalizeRound(uint256 roundId, uint256 endPrice) external onlyOwner {
        Round storage round = rounds[roundId];
        require(round.isActive, "Round not active");
        require(block.timestamp >= round.endTime, "Round not ended");
        require(!round.isFinalized, "Already finalized");
        
        round.endPrice = endPrice;
        round.isFinalized = true;
        round.isActive = false;
        
        if (endPrice > round.startPrice) {
            round.result = Direction.UP;
        } else {
            round.result = Direction.DOWN;
        }
        
        emit RoundFinalized(roundId, round.result, endPrice);
    }
    
    function claimReward(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        require(round.isFinalized, "Round not finalized");
        
        Prediction storage prediction = predictions[roundId][msg.sender];
        require(prediction.amount > 0, "No prediction");
        require(!prediction.claimed, "Already claimed");
        require(prediction.direction == round.result, "Prediction incorrect");
        
        uint256 totalPool = round.upPool + round.downPool;
        uint256 winningPool = round.result == Direction.UP ? round.upPool : round.downPool;
        
        uint256 houseFee = (totalPool * HOUSE_FEE) / FEE_DENOMINATOR;
        uint256 rewardPool = totalPool - houseFee;
        uint256 reward = (prediction.amount * rewardPool) / winningPool;
        
        prediction.claimed = true;
        payable(msg.sender).transfer(reward);
        
        // Award win bonus XP
        if (xpRewardsContract != address(0)) {
            (bool success,) = xpRewardsContract.call(
                abi.encodeWithSignature("awardXP(address,uint256)", msg.sender, XP_WIN_BONUS)
            );
            require(success);
        }
        
        emit RewardClaimed(roundId, msg.sender, reward);
    }
    
    function getRoundInfo(uint256 roundId) external view returns (
        address token,
        uint256 startPrice,
        uint256 endPrice,
        uint256 upPool,
        uint256 downPool,
        bool isActive,
        bool isFinalized
    ) {
        Round storage round = rounds[roundId];
        return (
            round.token,
            round.startPrice,
            round.endPrice,
            round.upPool,
            round.downPool,
            round.isActive,
            round.isFinalized
        );
    }
    
    function setXPRewardsContract(address _xpRewardsContract) external onlyOwner {
        xpRewardsContract = _xpRewardsContract;
    }
    
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }
    
    receive() external payable {}
}
