// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BondingCurveToken.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IUniswapV2Pair.sol";

interface ILiquidityController {
    function lockLiquidity(
        address token,
        address lpToken,
        uint256 amount,
        uint256 duration,
        uint256 percentage
    ) external returns (uint256);
}

/**
 * @title BondingCurveFactoryV3
 * @notice Factory with automatic graduation to DEX + LP locking
 * @dev Integrates with QuickSwap and LiquidityController
 */
contract BondingCurveFactoryV3 is Ownable, ReentrancyGuard {
    enum CurveType { LINEAR, EXPONENTIAL, SIGMOID }
    
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
        address lpPair;
        uint256 lpLockId;
    }
    
    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;
    mapping(address => address[]) public creatorTokens;
    
    uint256 public constant GRADUATION_THRESHOLD = 100 ether;
    uint256 public constant LP_LOCK_DURATION = 365 days; // 1 year default
    uint256 public constant LP_LOCK_PERCENTAGE = 80; // Lock 80% of LP
    uint256 public creationFee = 0.01 ether;
    
    address public reputationContract;
    address public socialGraphContract;
    address public liquidityController;
    
    // QuickSwap Router on Polygon Amoy Testnet
    IUniswapV2Router public immutable dexRouter;
    IUniswapV2Factory public immutable dexFactory;
    
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
        address indexed lpPair,
        uint256 liquidityAdded,
        uint256 lpLockId,
        uint256 timestamp
    );
    
    constructor(
        address initialOwner,
        address _dexRouter,
        address _liquidityController
    ) Ownable(initialOwner) {
        dexRouter = IUniswapV2Router(_dexRouter);
        dexFactory = IUniswapV2Factory(dexRouter.factory());
        liquidityController = _liquidityController;
    }
    
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
        
        BondingCurveToken token = new BondingCurveToken(
            name,
            symbol,
            msg.sender,
            address(this),
            BondingCurveToken.CurveType(uint8(curveType)),
            initialPrice,
            creatorRoyalty,
            metadata
        );
        
        address tokenAddress = address(token);
        
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
            graduated: false,
            lpPair: address(0),
            lpLockId: 0
        });
        
        allTokens.push(tokenAddress);
        creatorTokens[msg.sender].push(tokenAddress);
        
        if (reputationContract != address(0)) {
            (bool success,) = reputationContract.call(
                abi.encodeWithSignature("updateScore(address,uint256)", msg.sender, 10)
            );
            // Don't revert if reputation fails
        }
        
        emit TokenCreated(tokenAddress, msg.sender, name, symbol, curveType, initialPrice);
        
        return tokenAddress;
    }
    
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
            _graduateToken(tokenAddress);
        }
        
        emit TokenTraded(tokenAddress, tx.origin, isBuy, amount, price, token.totalVolume);
    }
    
    /**
     * @notice Graduate token to DEX with automatic LP locking
     * @dev Creates pair, adds liquidity, locks LP tokens
     */
    function _graduateToken(address tokenAddress) internal {
        TokenInfo storage token = tokens[tokenAddress];
        require(!token.graduated, "Already graduated");
        
        BondingCurveToken bondingToken = BondingCurveToken(payable(tokenAddress));
        
        // Call graduate on token to mint tokens and transfer MATIC to factory
        (uint256 tokenBalance, uint256 maticBalance) = bondingToken.graduate();
        
        require(tokenBalance > 0 && maticBalance > 0, "Insufficient liquidity");
        
        // Create or get pair
        address weth = dexRouter.WETH();
        address pair = dexFactory.getPair(tokenAddress, weth);
        if (pair == address(0)) {
            pair = dexFactory.createPair(tokenAddress, weth);
        }
        
        // Approve router to spend tokens (tokens are now in factory)
        IERC20(tokenAddress).approve(address(dexRouter), tokenBalance);
        
        // Add liquidity to DEX
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = dexRouter.addLiquidityETH{value: maticBalance}(
            tokenAddress,
            tokenBalance,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this), // LP tokens come to factory
            block.timestamp + 300
        );
        
        // Lock LP tokens
        uint256 lpToLock = (liquidity * LP_LOCK_PERCENTAGE) / 100;
        uint256 lpLockId = 0;
        
        if (liquidityController != address(0) && lpToLock > 0) {
            IERC20(pair).approve(liquidityController, lpToLock);
            
            try ILiquidityController(liquidityController).lockLiquidity(
                tokenAddress,
                pair,
                lpToLock,
                LP_LOCK_DURATION,
                LP_LOCK_PERCENTAGE
            ) returns (uint256 lockId) {
                lpLockId = lockId;
            } catch {
                // If locking fails, send LP to creator
                IERC20(pair).transfer(token.creator, lpToLock);
            }
        }
        
        // Send remaining LP to creator
        uint256 remainingLP = liquidity - lpToLock;
        if (remainingLP > 0) {
            IERC20(pair).transfer(token.creator, remainingLP);
        }
        
        // Mark as graduated
        token.graduated = true;
        token.lpPair = pair;
        token.lpLockId = lpLockId;
        
        emit TokenGraduated(tokenAddress, pair, liquidity, lpLockId, block.timestamp);
    }
    
    /**
     * @notice Manual graduation trigger (owner only, for testing)
     */
    function manualGraduate(address tokenAddress) external onlyOwner {
        require(tokens[tokenAddress].tokenAddress != address(0), "Token not found");
        require(!tokens[tokenAddress].graduated, "Already graduated");
        _graduateToken(tokenAddress);
    }
    
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }
    
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = _reputationContract;
    }
    
    function setSocialGraphContract(address _socialGraphContract) external onlyOwner {
        socialGraphContract = _socialGraphContract;
    }
    
    function setLiquidityController(address _liquidityController) external onlyOwner {
        liquidityController = _liquidityController;
    }
    
    function setCreationFee(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    receive() external payable {}
}
