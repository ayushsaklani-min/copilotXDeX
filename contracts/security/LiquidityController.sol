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
    }
    
    mapping(address => LockInfo[]) public tokenLocks;
    mapping(address => mapping(address => uint256)) public userLockCount;
    
    uint256 public constant MIN_LOCK_DURATION = 30 days;
    uint256 public constant MAX_LOCK_DURATION = 1095 days; // 3 years
    
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
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
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
            percentage: percentage
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
     * @notice Emergency unlock (owner only, for emergencies)
     */
    function emergencyUnlock(address token, uint256 lockId) external onlyOwner {
        require(lockId < tokenLocks[token].length, "Invalid lock ID");
        
        LockInfo storage lock = tokenLocks[token][lockId];
        require(!lock.isUnlocked, "Already unlocked");
        
        lock.isUnlocked = true;
        IERC20(lock.lpToken).transfer(lock.owner, lock.amount);
        
        emit LiquidityUnlocked(token, lock.lpToken, lock.owner, lock.amount);
    }
}
