// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SocialGraph
 * @notice Stores token social metadata and community interactions
 * @dev Manages creator profiles, announcements, and community engagement
 */
contract SocialGraph is Ownable {
    struct TokenMetadata {
        string name;
        string symbol;
        string description;
        string imageIPFS;
        string websiteURL;
        string twitterURL;
        string telegramURL;
        string discordURL;
        address creator;
        uint256 createdAt;
        bool isVerified;
    }
    
    struct Announcement {
        uint256 id;
        address token;
        address creator;
        string content;
        string imageIPFS;
        uint256 timestamp;
        uint256 likes;
        uint256 comments;
    }
    
    struct Comment {
        uint256 id;
        uint256 announcementId;
        address commenter;
        string content;
        uint256 timestamp;
        uint256 likes;
    }
    
    struct CreatorProfile {
        address creator;
        string username;
        string bio;
        string avatarIPFS;
        string twitterHandle;
        uint256 reputation;
        uint256 tokensCreated;
        uint256 totalVolume;
        bool isVerified;
        bool isTrusted;
    }
    
    struct Badge {
        string name;
        string description;
        string imageIPFS;
        uint256 requirement;
    }
    
    // Storage
    mapping(address => TokenMetadata) public tokenMetadata;
    mapping(address => Announcement[]) public tokenAnnouncements;
    mapping(uint256 => Comment[]) public announcementComments;
    mapping(address => CreatorProfile) public creatorProfiles;
    mapping(address => mapping(uint256 => bool)) public hasLikedAnnouncement;
    mapping(address => mapping(uint256 => bool)) public hasLikedComment;
    mapping(address => Badge[]) public userBadges;
    
    uint256 public announcementCounter;
    uint256 public commentCounter;
    
    // Badge types
    Badge[] public availableBadges;
    
    // Events
    event TokenMetadataUpdated(address indexed token, address indexed creator);
    event AnnouncementCreated(address indexed token, uint256 indexed announcementId, address creator);
    event CommentAdded(uint256 indexed announcementId, uint256 indexed commentId, address commenter);
    event AnnouncementLiked(uint256 indexed announcementId, address indexed liker);
    event CommentLiked(uint256 indexed commentId, address indexed liker);
    event CreatorProfileUpdated(address indexed creator);
    event BadgeAwarded(address indexed user, string badgeName);
    event TokenVerified(address indexed token);
    event CreatorTrusted(address indexed creator);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _initializeBadges();
    }
    
    /**
     * @notice Initialize available badges
     */
    function _initializeBadges() internal {
        availableBadges.push(Badge("Early Adopter", "First 100 users", "", 0));
        availableBadges.push(Badge("Token Creator", "Created a token", "", 1));
        availableBadges.push(Badge("Whale", "Holds > 1% of supply", "", 0));
        availableBadges.push(Badge("Diamond Hands", "Held for > 30 days", "", 0));
        availableBadges.push(Badge("Community Leader", "100+ followers", "", 100));
        availableBadges.push(Badge("Trusted Creator", "Verified by team", "", 0));
    }
    
    /**
     * @notice Set or update token metadata
     */
    function setTokenMetadata(
        address token,
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageIPFS,
        string memory websiteURL,
        string memory twitterURL,
        string memory telegramURL,
        string memory discordURL
    ) external {
        TokenMetadata storage metadata = tokenMetadata[token];
        
        // Only creator or owner can update
        require(
            metadata.creator == address(0) || 
            metadata.creator == msg.sender || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        if (metadata.creator == address(0)) {
            metadata.creator = msg.sender;
            metadata.createdAt = block.timestamp;
            
            // Update creator profile
            creatorProfiles[msg.sender].tokensCreated++;
        }
        
        metadata.name = name;
        metadata.symbol = symbol;
        metadata.description = description;
        metadata.imageIPFS = imageIPFS;
        metadata.websiteURL = websiteURL;
        metadata.twitterURL = twitterURL;
        metadata.telegramURL = telegramURL;
        metadata.discordURL = discordURL;
        
        emit TokenMetadataUpdated(token, msg.sender);
    }
    
    /**
     * @notice Create announcement for token
     */
    function createAnnouncement(
        address token,
        string memory content,
        string memory imageIPFS
    ) external returns (uint256) {
        TokenMetadata memory metadata = tokenMetadata[token];
        require(metadata.creator == msg.sender, "Not token creator");
        
        announcementCounter++;
        
        Announcement memory announcement = Announcement({
            id: announcementCounter,
            token: token,
            creator: msg.sender,
            content: content,
            imageIPFS: imageIPFS,
            timestamp: block.timestamp,
            likes: 0,
            comments: 0
        });
        
        tokenAnnouncements[token].push(announcement);
        
        emit AnnouncementCreated(token, announcementCounter, msg.sender);
        
        return announcementCounter;
    }
    
    /**
     * @notice Add comment to announcement
     */
    function addComment(
        uint256 announcementId,
        string memory content
    ) external returns (uint256) {
        commentCounter++;
        
        Comment memory comment = Comment({
            id: commentCounter,
            announcementId: announcementId,
            commenter: msg.sender,
            content: content,
            timestamp: block.timestamp,
            likes: 0
        });
        
        announcementComments[announcementId].push(comment);
        
        // Update announcement comment count
        // Note: This requires iterating through announcements - optimize in production
        
        emit CommentAdded(announcementId, commentCounter, msg.sender);
        
        return commentCounter;
    }
    
    /**
     * @notice Like an announcement
     */
    function likeAnnouncement(address token, uint256 announcementIndex) external {
        require(announcementIndex < tokenAnnouncements[token].length, "Invalid announcement");
        
        Announcement storage announcement = tokenAnnouncements[token][announcementIndex];
        require(!hasLikedAnnouncement[msg.sender][announcement.id], "Already liked");
        
        announcement.likes++;
        hasLikedAnnouncement[msg.sender][announcement.id] = true;
        
        emit AnnouncementLiked(announcement.id, msg.sender);
    }
    
    /**
     * @notice Like a comment
     */
    function likeComment(uint256 announcementId, uint256 commentIndex) external {
        require(commentIndex < announcementComments[announcementId].length, "Invalid comment");
        
        Comment storage comment = announcementComments[announcementId][commentIndex];
        require(!hasLikedComment[msg.sender][comment.id], "Already liked");
        
        comment.likes++;
        hasLikedComment[msg.sender][comment.id] = true;
        
        emit CommentLiked(comment.id, msg.sender);
    }
    
    /**
     * @notice Update creator profile
     */
    function updateCreatorProfile(
        string memory username,
        string memory bio,
        string memory avatarIPFS,
        string memory twitterHandle
    ) external {
        CreatorProfile storage profile = creatorProfiles[msg.sender];
        
        profile.creator = msg.sender;
        profile.username = username;
        profile.bio = bio;
        profile.avatarIPFS = avatarIPFS;
        profile.twitterHandle = twitterHandle;
        
        emit CreatorProfileUpdated(msg.sender);
    }
    
    /**
     * @notice Award badge to user
     */
    function awardBadge(address user, uint256 badgeIndex) external onlyOwner {
        require(badgeIndex < availableBadges.length, "Invalid badge");
        
        Badge memory badge = availableBadges[badgeIndex];
        userBadges[user].push(badge);
        
        emit BadgeAwarded(user, badge.name);
    }
    
    /**
     * @notice Verify token (owner only)
     */
    function verifyToken(address token) external onlyOwner {
        tokenMetadata[token].isVerified = true;
        emit TokenVerified(token);
    }
    
    /**
     * @notice Trust creator (owner only)
     */
    function trustCreator(address creator) external onlyOwner {
        creatorProfiles[creator].isTrusted = true;
        emit CreatorTrusted(creator);
    }
    
    /**
     * @notice Get token metadata
     */
    function getTokenMetadata(address token) external view returns (TokenMetadata memory) {
        return tokenMetadata[token];
    }
    
    /**
     * @notice Get token announcements
     */
    function getTokenAnnouncements(address token) external view returns (Announcement[] memory) {
        return tokenAnnouncements[token];
    }
    
    /**
     * @notice Get announcement comments
     */
    function getAnnouncementComments(uint256 announcementId) external view returns (Comment[] memory) {
        return announcementComments[announcementId];
    }
    
    /**
     * @notice Get creator profile
     */
    function getCreatorProfile(address creator) external view returns (CreatorProfile memory) {
        return creatorProfiles[creator];
    }
    
    /**
     * @notice Get user badges
     */
    function getUserBadges(address user) external view returns (Badge[] memory) {
        return userBadges[user];
    }
}
