// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BondingCurveToken.sol";

/**
 * @title BondingCurveFactory
 * @notice Factory for deploying bonding curve tokens with automatic liquidity
 * @dev Creates tokens with configurable bonding curves and tracks all deployments
 */
contract BondingCurveFactory is Ownable, ReentrancyGuard {
    // Curve types
    enum CurveType { LINEAR, EXPONENTIAL, SIGMOID }
    
    // Token metadata
    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        CurveType curveType;
        uint256 createdAt;
        uint256 initialPrice;
        uint256 currentPrice;
        uint256 totalVolume;
        uint256 totalBuys;
        uint256 totalSells;
        uint256 marketCap;
        uint256 tvl;
        bool graduated;
    }
    
    // State variables
    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;
    mapping(address => address[]) public creatorTokens;
    
    uint256 public constant INITIAL_LIQUIDITY = 0.5 ether; // 0.5 MATIC
    uint256 public constant GRADUATION_THRESHOLD = 100 ether; // Graduate at 100 MATIC TVL
    uint256 public creationFee = 0.01 ether;
    
    address public reputationContract;
    address public socialGraphContract;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        CurveType curveType,
        uint256 initialPrice
    );
    
    event TokenTraded(
        address indexed tokenAddress,
        address indexed trader,
        bool isBuy,
        uint256 amount,
        uint256 price,
        uint256 volume
    );
    
    event TokenGraduated(
        address indexed tokenAddress,
        uint256 finalTVL,
        uint256 timestamp
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @notice Create a new bonding curve token
     * @param name Token name
     * @param symbol Token symbol
     * @param curveType Type of bonding curve
     * @param initialPrice Starting price in wei
     * @param creatorRoyalty Creator royalty percentage (1-5%)
     * @param metadata IPFS hash for token metadata
     */
    function createToken(
        string memory name,
        string memory symbol,
        CurveType curveType,
        uint256 initialPrice,
        uint256 creatorRoyalty,
        string memory metadata
    ) external payable nonReentrant returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(creatorRoyalty <= 5, "Royalty too high");
        require(initialPrice > 0, "Invalid initial price");
        
        // Deploy bonding curve token
        BondingCurveToken token = new BondingCurveToken(
            name,
            symbol,
            msg.sender,
            address(this),
            curveType,
            initialPrice,
            creatorRoyalty,
            metadata
        );
        
        address tokenAddress = address(token);
        
        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            curveType: curveType,
            createdAt: block.timestamp,
            initialPrice: initialPrice,
            currentPrice: initialPrice,
            totalVolume: 0,
            totalBuys: 0,
            totalSells: 0,
            marketCap: 0,
            tvl: 0,
            graduated: false
        });
        
        allTokens.push(tokenAddress);
        creatorTokens[msg.sender].push(tokenAddress);
        
        // Update reputation if contract set
        if (reputationContract != address(0)) {
            (bool success,) = reputationContract.call(
                abi.encodeWithSignature("updateScore(address,uint256)", msg.sender, 10)
            );
            require(success, "Reputation update failed");
        }
        
        emit TokenCreated(tokenAddress, msg.sender, name, symbol, curveType, initialPrice);
        
        return tokenAddress;
    }
    
    /**
     * @notice Update token statistics after trade
     * @dev Called by BondingCurveToken contracts
     */
    function updateTokenStats(
        address tokenAddress,
        bool isBuy,
        uint256 amount,
        uint256 price,
        uint256 newTVL,
        uint256 newMarketCap
    ) external {
        require(tokens[tokenAddress].tokenAddress != address(0), "Token not found");
        require(msg.sender == tokenAddress, "Only token can update");
        
        TokenInfo storage token = tokens[tokenAddress];
        token.currentPrice = price;
        token.totalVolume += amount;
        token.tvl = newTVL;
        token.marketCap = newMarketCap;
        
        if (isBuy) {
            token.totalBuys++;
        } else {
            token.totalSells++;
        }
        
        // Check graduation threshold
        if (!token.graduated && newTVL >= GRADUATION_THRESHOLD) {
            token.graduated = true;
            emit TokenGraduated(tokenAddress, newTVL, block.timestamp);
        }
        
        emit TokenTraded(tokenAddress, tx.origin, isBuy, amount, price, token.totalVolume);
    }
    
    /**
     * @notice Get all tokens created by an address
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @notice Get total number of tokens
     */
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @notice Get token info
     */
    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }
    
    /**
     * @notice Set reputation contract address
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = _reputationContract;
    }
    
    /**
     * @notice Set social graph contract address
     */
    function setSocialGraphContract(address _socialGraphContract) external onlyOwner {
        socialGraphContract = _socialGraphContract;
    }
    
    /**
     * @notice Update creation fee
     */
    function setCreationFee(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }
    
    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    receive() external payable {}
}
