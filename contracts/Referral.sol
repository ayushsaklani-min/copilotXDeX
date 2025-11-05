// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReputation {
    function updateScore(address user, uint256 points) external;
    function getScore(address user) external view returns (uint256);
}

/**
 * @title Referral
 * @dev Referral system with bonus XP rewards for both referrer and referee
 */
contract Referral is Ownable, ReentrancyGuard {
    
    // Structs
    struct ReferralInfo {
        address referrer;           // Who referred this user
        uint256 referralCount;      // How many users this address referred
        uint256 totalEarnedXP;      // Total XP earned from referrals
        uint256 registeredAt;       // When user registered
        bool isRegistered;          // Has used a referral code
    }

    struct ReferralStats {
        uint256 level1Count;        // Direct referrals
        uint256 level2Count;        // Referrals of referrals
        uint256 totalXPEarned;      // Total XP from all levels
    }

    // State variables
    IReputation public reputationContract;
    
    mapping(address => ReferralInfo) public referralInfo;
    mapping(address => address[]) public referrals;  // referrer => list of referees
    mapping(address => ReferralStats) public referralStats;
    
    // Referral rewards (in XP)
    uint256 public constant REFERRER_BONUS = 10;     // Referrer gets 10 XP
    uint256 public constant REFEREE_BONUS = 5;       // Referee gets 5 XP
    uint256 public constant LEVEL2_BONUS = 3;        // Level 2 referrer gets 3 XP
    
    // Minimum reputation to refer
    uint256 public constant MIN_REPUTATION_TO_REFER = 10;
    
    uint256 public totalReferrals;
    uint256 public totalXPDistributed;

    // Events
    event ReferralRegistered(address indexed referee, address indexed referrer, uint256 referrerBonus, uint256 refereeBonus);
    event Level2Bonus(address indexed level2Referrer, address indexed referee, uint256 bonus);
    event ReputationContractUpdated(address indexed newContract);

    constructor(address _reputationContract) Ownable(msg.sender) {
        reputationContract = IReputation(_reputationContract);
    }

    /**
     * @dev Register a referral relationship
     * @param _referrer Address of the referrer
     */
    function registerReferral(address _referrer) external nonReentrant {
        require(_referrer != address(0), "Invalid referrer");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(!referralInfo[msg.sender].isRegistered, "Already registered");
        require(referralInfo[_referrer].isRegistered || _referrer == owner(), "Referrer not registered");
        
        // Check referrer has minimum reputation
        if (_referrer != owner()) {
            uint256 referrerReputation = reputationContract.getScore(_referrer);
            require(referrerReputation >= MIN_REPUTATION_TO_REFER, "Referrer needs more reputation");
        }

        // Register the referral
        referralInfo[msg.sender] = ReferralInfo({
            referrer: _referrer,
            referralCount: 0,
            totalEarnedXP: 0,
            registeredAt: block.timestamp,
            isRegistered: true
        });

        // Update referrer's stats
        referralInfo[_referrer].referralCount++;
        referrals[_referrer].push(msg.sender);
        referralStats[_referrer].level1Count++;
        
        totalReferrals++;

        // Award XP to referrer
        try reputationContract.updateScore(_referrer, REFERRER_BONUS) {
            referralInfo[_referrer].totalEarnedXP += REFERRER_BONUS;
            referralStats[_referrer].totalXPEarned += REFERRER_BONUS;
            totalXPDistributed += REFERRER_BONUS;
        } catch {}

        // Award XP to referee (new user)
        try reputationContract.updateScore(msg.sender, REFEREE_BONUS) {
            totalXPDistributed += REFEREE_BONUS;
        } catch {}

        emit ReferralRegistered(msg.sender, _referrer, REFERRER_BONUS, REFEREE_BONUS);

        // Check for level 2 bonus (referrer's referrer)
        address level2Referrer = referralInfo[_referrer].referrer;
        if (level2Referrer != address(0)) {
            referralStats[level2Referrer].level2Count++;
            
            try reputationContract.updateScore(level2Referrer, LEVEL2_BONUS) {
                referralInfo[level2Referrer].totalEarnedXP += LEVEL2_BONUS;
                referralStats[level2Referrer].totalXPEarned += LEVEL2_BONUS;
                totalXPDistributed += LEVEL2_BONUS;
                
                emit Level2Bonus(level2Referrer, msg.sender, LEVEL2_BONUS);
            } catch {}
        }
    }

    /**
     * @dev Get referral information for a user
     */
    function getReferralInfo(address _user) external view returns (
        address referrer,
        uint256 referralCount,
        uint256 totalEarnedXP,
        uint256 registeredAt,
        bool isRegistered
    ) {
        ReferralInfo memory info = referralInfo[_user];
        return (
            info.referrer,
            info.referralCount,
            info.totalEarnedXP,
            info.registeredAt,
            info.isRegistered
        );
    }

    /**
     * @dev Get list of referrals for a user
     */
    function getReferrals(address _user) external view returns (address[] memory) {
        return referrals[_user];
    }

    /**
     * @dev Get detailed referral stats
     */
    function getReferralStats(address _user) external view returns (
        uint256 level1Count,
        uint256 level2Count,
        uint256 totalXPEarned,
        uint256 currentReputation
    ) {
        ReferralStats memory stats = referralStats[_user];
        uint256 reputation = reputationContract.getScore(_user);
        
        return (
            stats.level1Count,
            stats.level2Count,
            stats.totalXPEarned,
            reputation
        );
    }

    /**
     * @dev Check if user can refer others
     */
    function canRefer(address _user) external view returns (bool) {
        if (!referralInfo[_user].isRegistered && _user != owner()) {
            return false;
        }
        
        uint256 reputation = reputationContract.getScore(_user);
        return reputation >= MIN_REPUTATION_TO_REFER;
    }

    /**
     * @dev Get referral chain (up to 3 levels)
     */
    function getReferralChain(address _user) external view returns (
        address level1,
        address level2,
        address level3
    ) {
        level1 = referralInfo[_user].referrer;
        if (level1 != address(0)) {
            level2 = referralInfo[level1].referrer;
            if (level2 != address(0)) {
                level3 = referralInfo[level2].referrer;
            }
        }
    }

    /**
     * @dev Get global referral statistics
     */
    function getGlobalStats() external view returns (
        uint256 _totalReferrals,
        uint256 _totalXPDistributed,
        uint256 averageReferralsPerUser
    ) {
        uint256 registeredUsers = totalReferrals > 0 ? totalReferrals : 1;
        return (
            totalReferrals,
            totalXPDistributed,
            totalReferrals / registeredUsers
        );
    }

    /**
     * @dev Get top referrers (simplified - returns first N addresses with most referrals)
     * Note: In production, use off-chain indexing for better performance
     */
    function getTopReferrers(uint256 _count) external view returns (
        address[] memory topAddresses,
        uint256[] memory referralCounts
    ) {
        // This is a simplified version - in production, maintain a sorted list
        topAddresses = new address[](_count);
        referralCounts = new uint256[](_count);
        
        // Note: This is just a placeholder structure
        // Real implementation would need off-chain indexing
        return (topAddresses, referralCounts);
    }

    /**
     * @dev Calculate potential earnings for referring N users
     */
    function calculatePotentialEarnings(uint256 _directReferrals, uint256 _level2Referrals) 
        external 
        pure 
        returns (uint256 totalXP) 
    {
        uint256 directXP = _directReferrals * REFERRER_BONUS;
        uint256 level2XP = _level2Referrals * LEVEL2_BONUS;
        return directXP + level2XP;
    }

    // Admin functions
    function setReputationContract(address _reputationContract) external onlyOwner {
        require(_reputationContract != address(0), "Invalid address");
        reputationContract = IReputation(_reputationContract);
        emit ReputationContractUpdated(_reputationContract);
    }

    /**
     * @dev Owner can register without referrer (bootstrap)
     */
    function bootstrapOwner() external onlyOwner {
        require(!referralInfo[owner()].isRegistered, "Already registered");
        
        referralInfo[owner()] = ReferralInfo({
            referrer: address(0),
            referralCount: 0,
            totalEarnedXP: 0,
            registeredAt: block.timestamp,
            isRegistered: true
        });
    }
}
