// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LiquidityController
 * @notice Manages LP token locking for security and trust
 * @dev Allows creators to lock liquidity with time-based unlocks
 */
contract LiquidityController is Ownable, ReentrancyGuard {
    struct LockInfo {
        address token;
        address lpToken;
        address owner;
        uint256 amount;
        uint256 lockedAt;
        uint256 unlockTime;
        bool isUnlocked;
        uint256 percentage; // Percentage of total LP locked
        uint256 tier; // 0=Bronze, 1=Silver, 2=Gold
        uint256 bonusRewards; // Accumulated bonus rewards
        bool isVesting; // Whether this is a vesting lock
        uint256 vestedAmount; // Amount already vested
    }
    
    enum LockTier { BRONZE, SILVER, GOLD }
    
    struct TierInfo {
        uint256 minDuration;
        uint256 bonusPercentage;
        string name;
    }
    
    mapping(address => LockInfo[]) public tokenLocks;
    mapping(address => mapping(address => uint256)) public userLockCount;
    mapping(uint256 => TierInfo) public tiers;
    mapping(address => uint256) public totalRewardsEarned;
    
    uint256 public constant MIN_LOCK_DURATION = 30 days;
    uint256 public constant MAX_LOCK_DURATION = 1095 days; // 3 years
    uint256 public constant EMERGENCY_UNLOCK_PENALTY = 20; // 20% penalty
    
    uint256 public rewardPool;
    
    event LiquidityLocked(
        address indexed token,
        address indexed lpToken,
        address indexed owner,
        uint256 amount,
        uint256 unlockTime,
        uint256 percentage
    );
    
    event LiquidityUnlocked(
        address indexed token,
        address indexed lpToken,
        address indexed owner,
        uint256 amount
    );
    
    event LockExtended(
        address indexed token,
        uint256 lockId,
        uint256 newUnlockTime
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize tier system
        tiers[uint256(LockTier.BRONZE)] = TierInfo({
            minDuration: 30 days,
            bonusPercentage: 5,
            name: "Bronze"
        });
        
        tiers[uint256(LockTier.SILVER)] = TierInfo({
            minDuration: 90 days,
            bonusPercentage: 20,
            name: "Silver"
        });
        
        tiers[uint256(LockTier.GOLD)] = TierInfo({
            minDuration: 365 days,
            bonusPercentage: 60,
            name: "Gold"
        });
    }
    
    /**
     * @notice Calculate lock tier based on duration
     */
    function calculateTier(uint256 duration) public pure returns (uint256) {
        if (duration >= 365 days) return uint256(LockTier.GOLD);
        if (duration >= 90 days) return uint256(LockTier.SILVER);
        return uint256(LockTier.BRONZE);
    }
    
    /**
     * @notice Calculate bonus rewards for a lock
     */
    function calculateBonusRewards(uint256 amount, uint256 duration) public view returns (uint256) {
        uint256 tier = calculateTier(duration);
        TierInfo memory tierInfo = tiers[tier];
        return (amount * tierInfo.bonusPercentage) / 100;
    }
    
    /**
     * @notice Emergency unlock with penalty
     */
    function emergencyUnlock(address token, uint256 lockId) external nonReentrant {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.isUnlocked, "Already unlocked");
        require(block.timestamp < lock.unlockTime, "Lock already expired");
        
        // Calculate penalty
        uint256 penalty = (lock.amount * EMERGENCY_UNLOCK_PENALTY) / 100;
        uint256 returnAmount = lock.amount - penalty;
        
        lock.isUnlocked = true;
        
        // Transfer reduced amount to owner
        IERC20(lock.lpToken).transfer(msg.sender, returnAmount);
        
        // Penalty goes to reward pool
        rewardPool += penalty;
        
        emit LiquidityUnlocked(token, lock.lpToken, msg.sender, returnAmount);
    }
    
    /**
     * @notice Claim accumulated bonus rewards
     */
    function claimRewards(address token, uint256 lockId) external nonReentrant {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(lock.bonusRewards > 0, "No rewards to claim");
        require(rewardPool >= lock.bonusRewards, "Insufficient reward pool");
        
        uint256 rewards = lock.bonusRewards;
        lock.bonusRewards = 0;
        totalRewardsEarned[msg.sender] += rewards;
        rewardPool -= rewards;
        
        // Transfer rewards (in MATIC)
        payable(msg.sender).transfer(rewards);
    }
    
    /**
     * @notice Fund reward pool
     */
    function fundRewardPool() external payable onlyOwner {
        require(msg.value > 0, "Must send funds");
        rewardPool += msg.value;
    }
    
    /**
     * @notice Get user's total rewards earned
     */
    function getUserRewards(address user) external view returns (uint256) {
        return totalRewardsEarned[user];
    }
    
    /**
     * @notice Get tier information
     */
    function getTierInfo(uint256 tier) external view returns (TierInfo memory) {
        return tiers[tier];
    }
    
    /**
     * @notice Lock LP tokens
     * @param token Token address
     * @param lpToken LP token address
     * @param amount Amount of LP tokens to lock
     * @param duration Lock duration in seconds
     */
    function lockLiquidity(
        address token,
        address lpToken,
        uint256 amount,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(token != address(0) && lpToken != address(0), "Invalid addresses");
        require(amount > 0, "Amount must be > 0");
        require(duration >= MIN_LOCK_DURATION, "Duration too short");
        require(duration <= MAX_LOCK_DURATION, "Duration too long");
        
        // Transfer LP tokens to this contract
        IERC20(lpToken).transferFrom(msg.sender, address(this), amount);
        
        // Calculate percentage of total LP locked
        uint256 totalLP = IERC20(lpToken).totalSupply();
        uint256 percentage = (amount * 100) / totalLP;
        
        // Calculate tier and bonus rewards
        uint256 tier = calculateTier(duration);
        uint256 bonusRewards = calculateBonusRewards(amount, duration);
        
        // Create lock
        uint256 unlockTime = block.timestamp + duration;
        LockInfo memory lock = LockInfo({
            token: token,
            lpToken: lpToken,
            owner: msg.sender,
            amount: amount,
            lockedAt: block.timestamp,
            unlockTime: unlockTime,
            isUnlocked: false,
            percentage: percentage,
            tier: tier,
            bonusRewards: bonusRewards,
            isVesting: false,
            vestedAmount: 0
        });
        
        tokenLocks[token].push(lock);
        uint256 lockId = tokenLocks[token].length - 1;
        userLockCount[msg.sender][token]++;
        
        emit LiquidityLocked(token, lpToken, msg.sender, amount, unlockTime, percentage);
        
        return lockId;
    }
    
    /**
     * @notice Unlock LP tokens after lock period
     * @param token Token address
     * @param lockId Lock ID
     */
    function unlockLiquidity(address token, uint256 lockId) external nonReentrant {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.isUnlocked, "Already unlocked");
        require(block.timestamp >= lock.unlockTime, "Lock period not ended");
        
        lock.isUnlocked = true;
        
        // Transfer LP tokens back to owner
        IERC20(lock.lpToken).transfer(msg.sender, lock.amount);
        
        emit LiquidityUnlocked(token, lock.lpToken, msg.sender, lock.amount);
    }
    
    /**
     * @notice Extend lock duration
     * @param token Token address
     * @param lockId Lock ID
     * @param additionalDuration Additional duration in seconds
     */
    function extendLock(
        address token,
        uint256 lockId,
        uint256 additionalDuration
    ) external {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.isUnlocked, "Already unlocked");
        require(additionalDuration > 0, "Duration must be > 0");
        
        uint256 newUnlockTime = lock.unlockTime + additionalDuration;
        require(
            newUnlockTime <= block.timestamp + MAX_LOCK_DURATION,
            "Exceeds max duration"
        );
        
        lock.unlockTime = newUnlockTime;
        
        emit LockExtended(token, lockId, newUnlockTime);
    }
    
    /**
     * @notice Get all locks for a token
     */
    function getTokenLocks(address token) external view returns (LockInfo[] memory) {
        return tokenLocks[token];
    }
    
    /**
     * @notice Get specific lock info
     */
    function getLockInfo(address token, uint256 lockId) external view returns (LockInfo memory) {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        return tokenLocks[token][lockId];
    }
    
    /**
     * @notice Get total locked percentage for token
     */
    function getTotalLockedPercentage(address token) external view returns (uint256) {
        LockInfo[] memory locks = tokenLocks[token];
        uint256 totalPercentage = 0;
        
        for (uint256 i = 0; i < locks.length; i++) {
            if (!locks[i].isUnlocked && block.timestamp < locks[i].unlockTime) {
                totalPercentage += locks[i].percentage;
            }
        }
        
        return totalPercentage > 100 ? 100 : totalPercentage;
    }
    
    /**
     * @notice Check if token has locked liquidity
     */
    function hasLockedLiquidity(address token) external view returns (bool) {
        LockInfo[] memory locks = tokenLocks[token];
        
        for (uint256 i = 0; i < locks.length; i++) {
            if (!locks[i].isUnlocked && block.timestamp < locks[i].unlockTime) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @notice Get lock info for RugScanner integration
     */
    function getLockInfo(address token) external view returns (
        bool hasLock,
        uint256 totalLocked,
        uint256 percentage
    ) {
        LockInfo[] memory locks = tokenLocks[token];
        uint256 total = 0;
        bool found = false;
        
        for (uint256 i = 0; i < locks.length; i++) {
            if (!locks[i].isUnlocked && block.timestamp < locks[i].unlockTime) {
                total += locks[i].amount;
                found = true;
            }
        }
        
        uint256 pct = 0;
        if (found && locks.length > 0) {
            address lpToken = locks[0].lpToken;
            uint256 totalLP = IERC20(lpToken).totalSupply();
            pct = (total * 100) / totalLP;
        }
        
        return (found, total, pct);
    }
    
    /**
     * @notice Emergency unlock by owner (for emergencies only)
     */
    function ownerEmergencyUnlock(address token, uint256 lockId) external onlyOwner {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(!lock.isUnlocked, "Already unlocked");
        
        lock.isUnlocked = true;
        IERC20(lock.lpToken).transfer(lock.owner, lock.amount);
        
        emit LiquidityUnlocked(token, lock.lpToken, lock.owner, lock.amount);
    }
}
