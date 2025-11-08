// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReputation {
    function getScore(address user) external view returns (uint256);
}

/**
 * @title LiquidityFarm
 * @dev Stake LP tokens to earn rewards with auto-compounding and reputation multipliers
 */
contract LiquidityFarm is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Structs
    struct PoolInfo {
        IERC20 lpToken;           // LP token to stake
        uint256 allocPoint;       // Allocation points for this pool
        uint256 lastRewardTime;   // Last time rewards were calculated
        uint256 accRewardPerShare; // Accumulated rewards per share
        uint256 totalStaked;      // Total LP tokens staked
        bool active;              // Pool is active
    }

    struct UserInfo {
        uint256 amount;           // LP tokens staked
        uint256 rewardDebt;       // Reward debt
        uint256 pendingRewards;   // Pending rewards
        uint256 lastStakeTime;    // Last stake timestamp
        uint256 totalEarned;      // Total rewards earned
    }

    // State variables
    IERC20 public rewardToken;
    IReputation public reputationContract;
    
    uint256 public rewardPerSecond;
    uint256 public totalAllocPoint;
    uint256 public constant PRECISION = 1e12;
    
    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    // Reputation multipliers (in basis points, 10000 = 1x)
    uint256 public constant BASE_MULTIPLIER = 10000;      // 1.0x
    uint256 public constant SILVER_MULTIPLIER = 11500;    // 1.15x
    uint256 public constant GOLD_MULTIPLIER = 13000;      // 1.3x
    uint256 public constant DIAMOND_MULTIPLIER = 15000;   // 1.5x
    
    // Reputation thresholds
    uint256 public constant SILVER_THRESHOLD = 50;
    uint256 public constant GOLD_THRESHOLD = 100;
    uint256 public constant DIAMOND_THRESHOLD = 500;

    // Events
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPerSecondUpdated(uint256 newRewardPerSecond);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint);

    constructor(
        address _rewardToken,
        address _reputationContract,
        uint256 _rewardPerSecond
    ) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
        reputationContract = IReputation(_reputationContract);
        rewardPerSecond = _rewardPerSecond;
    }

    // View functions
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function getReputationMultiplier(address user) public view returns (uint256) {
        if (address(reputationContract) == address(0)) {
            return BASE_MULTIPLIER;
        }
        
        uint256 score = reputationContract.getScore(user);
        
        if (score >= DIAMOND_THRESHOLD) return DIAMOND_MULTIPLIER;
        if (score >= GOLD_THRESHOLD) return GOLD_MULTIPLIER;
        if (score >= SILVER_THRESHOLD) return SILVER_MULTIPLIER;
        return BASE_MULTIPLIER;
    }

    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalStaked != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = (timeElapsed * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare = accRewardPerShare + (reward * PRECISION) / pool.totalStaked;
        }
        
        uint256 pending = (user.amount * accRewardPerShare) / PRECISION - user.rewardDebt;
        
        // Apply reputation multiplier
        uint256 multiplier = getReputationMultiplier(_user);
        pending = (pending * multiplier) / BASE_MULTIPLIER;
        
        return pending + user.pendingRewards;
    }

    function getUserInfo(uint256 _pid, address _user) external view returns (
        uint256 amount,
        uint256 pendingRewards,
        uint256 totalEarned,
        uint256 reputationMultiplier
    ) {
        UserInfo storage user = userInfo[_pid][_user];
        return (
            user.amount,
            user.pendingRewards,
            user.totalEarned,
            getReputationMultiplier(_user)
        );
    }

    function getPoolAPR(uint256 _pid) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        
        if (pool.totalStaked == 0) return 0;
        
        // Annual rewards for this pool
        uint256 annualRewards = rewardPerSecond * 365 days * pool.allocPoint / totalAllocPoint;
        
        // APR = (annual rewards / total staked) * 100
        return (annualRewards * 10000) / pool.totalStaked;
    }

    // Admin functions
    function addPool(uint256 _allocPoint, address _lpToken) external onlyOwner {
        require(_lpToken != address(0), "Invalid LP token");
        
        totalAllocPoint = totalAllocPoint + _allocPoint;
        
        poolInfo.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            allocPoint: _allocPoint,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            totalStaked: 0,
            active: true
        }));
        
        emit PoolAdded(poolInfo.length - 1, _lpToken, _allocPoint);
    }

    function updatePool(uint256 _pid, uint256 _allocPoint) external onlyOwner {
        massUpdatePools();
        
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        
        emit PoolUpdated(_pid, _allocPoint);
    }

    function setRewardPerSecond(uint256 _rewardPerSecond) external onlyOwner {
        massUpdatePools();
        rewardPerSecond = _rewardPerSecond;
        emit RewardPerSecondUpdated(_rewardPerSecond);
    }

    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = IReputation(_reputationContract);
    }

    // Update reward variables for all pools
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePoolRewards(pid);
        }
    }

    // Update reward variables of the given pool
    function updatePoolRewards(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        
        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = (timeElapsed * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
        
        pool.accRewardPerShare = pool.accRewardPerShare + (reward * PRECISION) / pool.totalStaked;
        pool.lastRewardTime = block.timestamp;
    }

    // Stake LP tokens
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        require(pool.active, "Pool not active");
        require(_amount > 0, "Cannot deposit 0");
        
        updatePoolRewards(_pid);
        
        // Harvest pending rewards
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION - user.rewardDebt;
            if (pending > 0) {
                // Apply reputation multiplier
                uint256 multiplier = getReputationMultiplier(msg.sender);
                pending = (pending * multiplier) / BASE_MULTIPLIER;
                
                user.pendingRewards = user.pendingRewards + pending;
            }
        }
        
        // Transfer LP tokens
        pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        user.amount = user.amount + _amount;
        pool.totalStaked = pool.totalStaked + _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        user.lastStakeTime = block.timestamp;
        
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        require(user.amount >= _amount, "Insufficient balance");
        require(_amount > 0, "Cannot withdraw 0");
        
        updatePoolRewards(_pid);
        
        // Harvest pending rewards
        uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION - user.rewardDebt;
        if (pending > 0) {
            // Apply reputation multiplier
            uint256 multiplier = getReputationMultiplier(msg.sender);
            pending = (pending * multiplier) / BASE_MULTIPLIER;
            
            user.pendingRewards = user.pendingRewards + pending;
        }
        
        user.amount = user.amount - _amount;
        pool.totalStaked = pool.totalStaked - _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        
        pool.lpToken.safeTransfer(msg.sender, _amount);
        
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Harvest rewards
    function harvest(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        updatePoolRewards(_pid);
        
        uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION - user.rewardDebt;
        
        // Apply reputation multiplier
        uint256 multiplier = getReputationMultiplier(msg.sender);
        pending = (pending * multiplier) / BASE_MULTIPLIER;
        
        uint256 totalPending = pending + user.pendingRewards;
        
        if (totalPending > 0) {
            user.pendingRewards = 0;
            user.totalEarned = user.totalEarned + totalPending;
            user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
            
            safeRewardTransfer(msg.sender, totalPending);
            
            emit Harvest(msg.sender, _pid, totalPending);
        }
    }

    // Auto-compound: harvest and restake
    // Note: This is a simplified compound that adds rewards to staked amount
    // In production, you'd want to convert reward tokens to LP tokens via a DEX
    function compound(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        updatePoolRewards(_pid);
        
        uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION - user.rewardDebt;
        
        // Apply reputation multiplier
        uint256 multiplier = getReputationMultiplier(msg.sender);
        pending = (pending * multiplier) / BASE_MULTIPLIER;
        
        uint256 totalPending = pending + user.pendingRewards;
        
        if (totalPending > 0) {
            user.pendingRewards = 0;
            user.totalEarned = user.totalEarned + totalPending;
            
            // Transfer rewards to user first (they receive the tokens)
            safeRewardTransfer(msg.sender, totalPending);
            
            // Then user needs to convert rewards to LP tokens and deposit
            // For now, we just track that rewards were harvested
            // In production, you'd integrate with a DEX to swap rewards -> LP tokens
            // and then call deposit() with the new LP tokens
            
            user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
            
            emit Harvest(msg.sender, _pid, totalPending);
            // Note: No Deposit event since we're not actually adding LP tokens here
            // User would need to manually convert and deposit LP tokens for true compounding
        }
    }

    // Emergency withdraw without caring about rewards
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        pool.totalStaked = pool.totalStaked - amount;
        
        pool.lpToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Safe reward transfer function
    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.safeTransfer(_to, rewardBal);
        } else {
            rewardToken.safeTransfer(_to, _amount);
        }
    }

    // Fund the farm with reward tokens
    function fundFarm(uint256 _amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    // Emergency withdraw reward tokens
    function emergencyRewardWithdraw(uint256 _amount) external onlyOwner {
        rewardToken.safeTransfer(msg.sender, _amount);
    }
}
