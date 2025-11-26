// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title XPRewards
 * @notice Manages XP rewards from games and activities
 * @dev Integrates with Reputation system and game contracts
 */
contract XPRewards is Ownable {
    struct UserXP {
        uint256 totalXP;
        uint256 gameXP;
        uint256 tradingXP;
        uint256 socialXP;
        uint256 level;
        uint256 streak;
        uint256 lastActivityDate;
        uint256 multiplier; // 100 = 1x, 150 = 1.5x
    }
    
    struct DailyMission {
        string description;
        uint256 xpReward;
        uint256 requirement;
        bool isActive;
    }
    
    mapping(address => UserXP) public userXP;
    mapping(address => mapping(uint256 => bool)) public completedMissions;
    mapping(address => bool) public isGameContract;
    
    DailyMission[] public dailyMissions;
    
    address public reputationContract;
    
    uint256 public constant XP_PER_LEVEL = 100;
    uint256 public constant MAX_STREAK = 30;
    uint256 public constant STREAK_BONUS_XP = 5;
    
    event XPAwarded(address indexed user, uint256 amount, string source);
    event LevelUp(address indexed user, uint256 newLevel);
    event StreakIncreased(address indexed user, uint256 newStreak);
    event MissionCompleted(address indexed user, uint256 missionId, uint256 xpReward);
    event MultiplierUpdated(address indexed user, uint256 newMultiplier);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _initializeMissions();
    }
    
    /**
     * @notice Initialize daily missions
     */
    function _initializeMissions() internal {
        dailyMissions.push(DailyMission("Play 3 games", 20, 3, true));
        dailyMissions.push(DailyMission("Make 5 trades", 30, 5, true));
        dailyMissions.push(DailyMission("Add liquidity", 25, 1, true));
        dailyMissions.push(DailyMission("Refer a friend", 50, 1, true));
        dailyMissions.push(DailyMission("Win 3 games", 40, 3, true));
    }
    
    /**
     * @notice Award XP to user
     * @param user User address
     * @param amount XP amount
     */
    function awardXP(address user, uint256 amount) external {
        require(isGameContract[msg.sender] || msg.sender == owner(), "Not authorized");
        
        UserXP storage xp = userXP[user];
        
        // Check and update streak
        _updateStreak(user);
        
        // Apply multiplier
        uint256 multiplier = xp.multiplier > 0 ? xp.multiplier : 100;
        uint256 bonusAmount = (amount * multiplier) / 100;
        
        // Add streak bonus
        if (xp.streak > 0) {
            bonusAmount += (xp.streak * STREAK_BONUS_XP);
        }
        
        xp.totalXP += bonusAmount;
        xp.gameXP += bonusAmount;
        xp.lastActivityDate = block.timestamp;
        
        // Check for level up
        uint256 newLevel = xp.totalXP / XP_PER_LEVEL;
        if (newLevel > xp.level) {
            xp.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        // Update reputation contract if set
        if (reputationContract != address(0)) {
            (bool success,) = reputationContract.call(
                abi.encodeWithSignature("updateScore(address,uint256)", user, bonusAmount)
            );
            require(success, "Reputation update failed");
        }
        
        emit XPAwarded(user, bonusAmount, "game");
    }
    
    /**
     * @notice Award trading XP
     */
    function awardTradingXP(address user, uint256 amount) external {
        require(msg.sender == owner() || msg.sender == reputationContract, "Not authorized");
        
        UserXP storage xp = userXP[user];
        _updateStreak(user);
        
        xp.totalXP += amount;
        xp.tradingXP += amount;
        xp.lastActivityDate = block.timestamp;
        
        uint256 newLevel = xp.totalXP / XP_PER_LEVEL;
        if (newLevel > xp.level) {
            xp.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        emit XPAwarded(user, amount, "trading");
    }
    
    /**
     * @notice Award social XP
     */
    function awardSocialXP(address user, uint256 amount) external {
        require(msg.sender == owner(), "Not authorized");
        
        UserXP storage xp = userXP[user];
        _updateStreak(user);
        
        xp.totalXP += amount;
        xp.socialXP += amount;
        xp.lastActivityDate = block.timestamp;
        
        uint256 newLevel = xp.totalXP / XP_PER_LEVEL;
        if (newLevel > xp.level) {
            xp.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        emit XPAwarded(user, amount, "social");
    }
    
    /**
     * @notice Update user streak
     */
    function _updateStreak(address user) internal {
        UserXP storage xp = userXP[user];
        
        uint256 daysSinceLastActivity = (block.timestamp - xp.lastActivityDate) / 1 days;
        
        if (daysSinceLastActivity == 0) {
            // Same day, no change
            return;
        } else if (daysSinceLastActivity == 1) {
            // Consecutive day, increase streak
            if (xp.streak < MAX_STREAK) {
                xp.streak++;
                emit StreakIncreased(user, xp.streak);
            }
        } else {
            // Streak broken
            xp.streak = 1;
        }
    }
    
    /**
     * @notice Complete daily mission
     */
    function completeMission(address user, uint256 missionId) external {
        require(isGameContract[msg.sender] || msg.sender == owner(), "Not authorized");
        require(missionId < dailyMissions.length, "Invalid mission");
        require(!completedMissions[user][missionId], "Already completed");
        
        DailyMission memory mission = dailyMissions[missionId];
        require(mission.isActive, "Mission not active");
        
        completedMissions[user][missionId] = true;
        
        // Award XP for mission completion
        UserXP storage xp = userXP[user];
        _updateStreak(user);
        
        uint256 multiplier = xp.multiplier > 0 ? xp.multiplier : 100;
        uint256 bonusAmount = (mission.xpReward * multiplier) / 100;
        
        xp.totalXP += bonusAmount;
        xp.gameXP += bonusAmount;
        xp.lastActivityDate = block.timestamp;
        
        uint256 newLevel = xp.totalXP / XP_PER_LEVEL;
        if (newLevel > xp.level) {
            xp.level = newLevel;
            emit LevelUp(user, newLevel);
        }
        
        emit MissionCompleted(user, missionId, mission.xpReward);
        emit XPAwarded(user, bonusAmount, "mission");
    }
    
    /**
     * @notice Set XP multiplier for user
     */
    function setMultiplier(address user, uint256 multiplier) external onlyOwner {
        require(multiplier >= 100 && multiplier <= 300, "Invalid multiplier");
        userXP[user].multiplier = multiplier;
        emit MultiplierUpdated(user, multiplier);
    }
    
    /**
     * @notice Add game contract
     */
    function addGameContract(address gameContract) external onlyOwner {
        isGameContract[gameContract] = true;
    }
    
    /**
     * @notice Remove game contract
     */
    function removeGameContract(address gameContract) external onlyOwner {
        isGameContract[gameContract] = false;
    }
    
    /**
     * @notice Set reputation contract
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = _reputationContract;
    }
    
    /**
     * @notice Get user XP info
     */
    function getUserXP(address user) external view returns (UserXP memory) {
        return userXP[user];
    }
    
    /**
     * @notice Get all daily missions
     */
    function getDailyMissions() external view returns (DailyMission[] memory) {
        return dailyMissions;
    }
    
    /**
     * @notice Check if mission completed
     */
    function isMissionCompleted(address user, uint256 missionId) external view returns (bool) {
        return completedMissions[user][missionId];
    }
}
