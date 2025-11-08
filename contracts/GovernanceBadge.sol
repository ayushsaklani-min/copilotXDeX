// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReputation {
    function getScore(address user) external view returns (uint256);
}

/**
 * @title GovernanceBadge
 * @dev NFT badges for Diamond and Crystal tier users to participate in governance
 */
contract GovernanceBadge is ERC721URIStorage, Ownable, ReentrancyGuard {
    IReputation public reputationContract;
    
    uint256 private _tokenIdCounter;
    uint256 public constant DIAMOND_THRESHOLD = 500;
    uint256 public constant CRYSTAL_THRESHOLD = 1000;
    
    // Tier enum: 0 = None, 1 = Diamond, 2 = Crystal
    mapping(address => uint256) public userTier;
    mapping(address => uint256) public userBadgeTokenId;
    mapping(uint256 => address) public tokenIdToUser;
    mapping(uint256 => uint256) public tokenIdToTier;
    
    string private _baseTokenURI;
    
    event BadgeMinted(address indexed user, uint256 indexed tokenId, uint256 tier);
    event BadgeUpgraded(address indexed user, uint256 indexed tokenId, uint256 oldTier, uint256 newTier);
    event ReputationContractUpdated(address indexed newContract);
    
    constructor(
        address _reputationContract,
        address initialOwner
    ) ERC721("TikTakDex Governance Badge", "TIKGOV") Ownable(initialOwner) {
        reputationContract = IReputation(_reputationContract);
        _baseTokenURI = "https://tiktakdex.com/badges/";
    }
    
    function setReputationContract(address _reputationContract) external onlyOwner {
        require(_reputationContract != address(0), "Invalid address");
        reputationContract = IReputation(_reputationContract);
        emit ReputationContractUpdated(_reputationContract);
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Check if user qualifies for a badge and mint/upgrade if needed
     */
    function checkAndMintBadge(address user) external nonReentrant returns (uint256) {
        require(user != address(0), "Invalid user");
        
        uint256 score = reputationContract.getScore(user);
        uint256 currentTier = userTier[user];
        uint256 newTier = 0;
        
        if (score >= CRYSTAL_THRESHOLD) {
            newTier = 2; // Crystal
        } else if (score >= DIAMOND_THRESHOLD) {
            newTier = 1; // Diamond
        }
        
        // If user already has a badge
        if (currentTier > 0) {
            uint256 existingTokenId = userBadgeTokenId[user];
            
            // Upgrade if tier increased
            if (newTier > currentTier && existingTokenId > 0) {
                tokenIdToTier[existingTokenId] = newTier;
                userTier[user] = newTier;
                emit BadgeUpgraded(user, existingTokenId, currentTier, newTier);
                return existingTokenId;
            }
            
            // If tier decreased or no change, return existing
            if (newTier > 0) {
                return existingTokenId;
            }
        }
        
        // Mint new badge if user qualifies and doesn't have one
        if (newTier > 0 && currentTier == 0) {
            _tokenIdCounter++;
            uint256 tokenId = _tokenIdCounter;
            
            _safeMint(user, tokenId);
            _setTokenURI(tokenId, string(abi.encodePacked(_baseURI(), _tierToString(newTier), ".json")));
            
            userTier[user] = newTier;
            userBadgeTokenId[user] = tokenId;
            tokenIdToUser[tokenId] = user;
            tokenIdToTier[tokenId] = newTier;
            
            emit BadgeMinted(user, tokenId, newTier);
            return tokenId;
        }
        
        return 0;
    }
    
    /**
     * @dev Get badge info for a user
     */
    function getBadgeInfo(address user) external view returns (
        bool hasBadge,
        uint256 tokenId,
        uint256 tier,
        string memory tierName
    ) {
        tier = userTier[user];
        tokenId = userBadgeTokenId[user];
        hasBadge = tier > 0 && tokenId > 0;
        tierName = hasBadge ? _tierToString(tier) : "None";
    }
    
    /**
     * @dev Get voting power multiplier for a badge (1x for Diamond, 2x for Crystal)
     */
    function getVotingPower(uint256 tokenId) external view returns (uint256) {
        uint256 tier = tokenIdToTier[tokenId];
        if (tier == 2) return 3; // Crystal = 3x
        if (tier == 1) return 2; // Diamond = 2x
        return 1;
    }
    
    /**
     * @dev Check if address owns a valid badge
     */
    function hasValidBadge(address user) external view returns (bool) {
        return userTier[user] > 0 && userBadgeTokenId[user] > 0;
    }
    
    function _tierToString(uint256 tier) internal pure returns (string memory) {
        if (tier == 2) return "crystal";
        if (tier == 1) return "diamond";
        return "none";
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}


