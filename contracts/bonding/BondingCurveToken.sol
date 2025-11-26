// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IBondingCurveFactory.sol";

/**
 * @title BondingCurveToken
 * @notice ERC20 token with bonding curve pricing - supply minted on buy, burned on sell
 * @dev Implements linear, exponential, and sigmoid bonding curves
 */
contract BondingCurveToken is ERC20, ReentrancyGuard {
    enum CurveType { LINEAR, EXPONENTIAL, SIGMOID }
    
    // Token configuration
    address public immutable creator;
    address public immutable factory;
    CurveType public immutable curveType;
    uint256 public immutable initialPrice;
    uint256 public immutable creatorRoyalty; // 1-5%
    string public metadata; // IPFS hash
    
    // Trading state
    uint256 public totalVolume;
    uint256 public totalBuys;
    uint256 public totalSells;
    mapping(address => uint256) public lastTradeTime;
    mapping(address => uint256) public buyerContribution;
    
    // Anti-bot protection
    uint256 public constant COOLDOWN_PERIOD = 30 seconds;
    uint256 public constant MAX_BUY_PER_TX = 10 ether; // Max 10 MATIC per buy
    
    // Fee structure
    uint256 public constant TOTAL_FEE = 30; // 0.3%
    uint256 public constant LP_FEE = 25; // 0.25%
    uint256 public constant PROTOCOL_FEE = 5; // 0.05%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Curve parameters
    uint256 public constant LINEAR_SLOPE = 1e12; // Price increases linearly
    uint256 public constant EXPONENTIAL_BASE = 1001; // 1.001x per token
    uint256 public constant EXPONENTIAL_DENOMINATOR = 1000;
    
    // Events
    event Buy(address indexed buyer, uint256 amount, uint256 tokens, uint256 price);
    event Sell(address indexed seller, uint256 tokens, uint256 amount, uint256 price);
    event CreatorRoyaltyPaid(address indexed creator, uint256 amount);
    
    constructor(
        string memory name_,
        string memory symbol_,
        address creator_,
        address factory_,
        CurveType curveType_,
        uint256 initialPrice_,
        uint256 creatorRoyalty_,
        string memory metadata_
    ) ERC20(name_, symbol_) {
        creator = creator_;
        factory = factory_;
        curveType = curveType_;
        initialPrice = initialPrice_;
        creatorRoyalty = creatorRoyalty_;
        metadata = metadata_;
    }
    
    /**
     * @notice Buy tokens with MATIC
     * @dev Mints new tokens based on bonding curve price
     */
    function buy() external payable nonReentrant {
        require(msg.value > 0, "Must send MATIC");
        require(msg.value <= MAX_BUY_PER_TX, "Exceeds max buy");
        require(
            block.timestamp >= lastTradeTime[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown active"
        );
        
        uint256 amountAfterFee = _takeFees(msg.value, true);
        uint256 tokensToMint = calculateBuyReturn(amountAfterFee);
        
        require(tokensToMint > 0, "Insufficient output");
        
        // Update state
        _mint(msg.sender, tokensToMint);
        lastTradeTime[msg.sender] = block.timestamp;
        buyerContribution[msg.sender] += msg.value;
        totalVolume += msg.value;
        totalBuys++;
        
        // Update factory stats (best-effort only, never break trading)
        uint256 currentPrice = getCurrentPrice();
        uint256 tvl = address(this).balance;
        uint256 marketCap = totalSupply() * currentPrice / 1e18;

        if (factory != address(0)) {
            // If the factory call fails (e.g. token not registered), ignore it so buys still work
            try IBondingCurveFactory(factory).updateTokenStats(
                address(this),
                true,
                msg.value,
                currentPrice,
                tvl,
                marketCap
            ) {
                // no-op on success
            } catch {
                // ignore failures
            }
        }
        
        emit Buy(msg.sender, msg.value, tokensToMint, currentPrice);
    }
    
    /**
     * @notice Sell tokens for MATIC
     * @dev Burns tokens and returns MATIC based on bonding curve
     */
    function sell(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Must sell > 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        require(
            block.timestamp >= lastTradeTime[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown active"
        );
        
        uint256 maticReturn = calculateSellReturn(tokenAmount);
        require(maticReturn > 0, "Insufficient output");
        require(address(this).balance >= maticReturn, "Insufficient liquidity");
        
        uint256 amountAfterFee = _takeFees(maticReturn, false);
        
        // Update state
        _burn(msg.sender, tokenAmount);
        lastTradeTime[msg.sender] = block.timestamp;
        totalVolume += maticReturn;
        totalSells++;
        
        // Transfer MATIC
        payable(msg.sender).transfer(amountAfterFee);
        
        // Update factory stats (best-effort only, never break trading)
        uint256 currentPrice = getCurrentPrice();
        uint256 tvl = address(this).balance;
        uint256 marketCap = totalSupply() * currentPrice / 1e18;

        if (factory != address(0)) {
            // If the factory call fails (e.g. token not registered), ignore it so sells still work
            try IBondingCurveFactory(factory).updateTokenStats(
                address(this),
                false,
                maticReturn,
                currentPrice,
                tvl,
                marketCap
            ) {
                // no-op on success
            } catch {
                // ignore failures
            }
        }
        
        emit Sell(msg.sender, tokenAmount, amountAfterFee, currentPrice);
    }
    
    /**
     * @notice Calculate tokens received for MATIC amount
     */
    function calculateBuyReturn(uint256 maticAmount) public view returns (uint256) {
        uint256 supply = totalSupply();
        
        if (curveType == CurveType.LINEAR) {
            // Linear: price = initialPrice + (supply * slope)
            // Integral: tokens = sqrt(2 * maticAmount / slope + (supply + initialPrice/slope)^2) - (supply + initialPrice/slope)
            uint256 a = supply + (initialPrice * 1e18 / LINEAR_SLOPE);
            uint256 b = 2 * maticAmount * 1e18 / LINEAR_SLOPE;
            uint256 c = a * a + b;
            return sqrt(c) - a;
        } else if (curveType == CurveType.EXPONENTIAL) {
            // Exponential: price = initialPrice * (base ^ supply)
            // Simplified calculation for small amounts
            uint256 currentPrice = getCurrentPrice();
            return (maticAmount * 1e18) / currentPrice;
        } else {
            // Sigmoid: price = initialPrice / (1 + e^(-k * (supply - midpoint)))
            // Simplified linear approximation
            uint256 currentPrice = getCurrentPrice();
            return (maticAmount * 1e18) / currentPrice;
        }
    }
    
    /**
     * @notice Calculate MATIC received for token amount
     */
    function calculateSellReturn(uint256 tokenAmount) public view returns (uint256) {
        uint256 supply = totalSupply();
        require(supply >= tokenAmount, "Insufficient supply");
        
        if (curveType == CurveType.LINEAR) {
            // Linear sell calculation
            uint256 avgPrice = (getCurrentPrice() + getPriceAtSupply(supply - tokenAmount)) / 2;
            return (tokenAmount * avgPrice) / 1e18;
        } else if (curveType == CurveType.EXPONENTIAL) {
            // Exponential sell calculation
            uint256 avgPrice = (getCurrentPrice() + getPriceAtSupply(supply - tokenAmount)) / 2;
            return (tokenAmount * avgPrice) / 1e18;
        } else {
            // Sigmoid sell calculation
            uint256 avgPrice = (getCurrentPrice() + getPriceAtSupply(supply - tokenAmount)) / 2;
            return (tokenAmount * avgPrice) / 1e18;
        }
    }
    
    /**
     * @notice Get current token price
     */
    function getCurrentPrice() public view returns (uint256) {
        return getPriceAtSupply(totalSupply());
    }
    
    /**
     * @notice Get price at specific supply
     */
    function getPriceAtSupply(uint256 supply) public view returns (uint256) {
        if (supply == 0) return initialPrice;
        
        if (curveType == CurveType.LINEAR) {
            // Linear: price = initialPrice + (supply * slope)
            return initialPrice + (supply * LINEAR_SLOPE / 1e18);
        } else if (curveType == CurveType.EXPONENTIAL) {
            // Exponential: price = initialPrice * (1.001 ^ supply)
            // Simplified: price ≈ initialPrice * (1 + 0.001 * supply)
            return initialPrice + (initialPrice * supply / 1000);
        } else {
            // Sigmoid: simplified linear growth with saturation
            uint256 midpoint = 1000000 * 1e18; // 1M tokens
            if (supply < midpoint) {
                return initialPrice + (initialPrice * supply / midpoint);
            } else {
                return initialPrice * 2; // Saturates at 2x initial price
            }
        }
    }
    
    /**
     * @notice Take fees from trade amount
     */
    function _takeFees(uint256 amount, bool isBuy) internal returns (uint256) {
        uint256 totalFeeAmount = (amount * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 creatorFeeAmount = (amount * creatorRoyalty * 100) / FEE_DENOMINATOR;
        uint256 protocolFeeAmount = (amount * PROTOCOL_FEE) / FEE_DENOMINATOR;
        
        // Pay creator royalty
        if (creatorFeeAmount > 0) {
            payable(creator).transfer(creatorFeeAmount);
            emit CreatorRoyaltyPaid(creator, creatorFeeAmount);
        }
        
        // Protocol fee stays in contract (becomes liquidity)
        
        return amount - totalFeeAmount - creatorFeeAmount;
    }
    
    /**
     * @notice Square root function (Babylonian method)
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    /**
     * @notice Get token statistics
     */
    function getStats() external view returns (
        uint256 price,
        uint256 supply,
        uint256 tvl,
        uint256 volume,
        uint256 buys,
        uint256 sells
    ) {
        return (
            getCurrentPrice(),
            totalSupply(),
            address(this).balance,
            totalVolume,
            totalBuys,
            totalSells
        );
    }
    
    receive() external payable {}
}
