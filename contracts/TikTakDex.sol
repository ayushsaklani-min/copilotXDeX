// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TikTakLP.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IReputation {
    function getScore(address user) external view returns (uint256);
    function updateScore(address user, uint256 points) external;
}

/**
 * @title TikTakDex
 * @dev Uniswap V2-style AMM DEX for TIK-TAK-TOE tokens
 * @notice Supports multiple trading pairs with 0.3% fee (0.25% LP, 0.05% owner)
 */
contract TikTakDex is Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant LP_FEE = 25; // 0.25%
    uint256 public constant OWNER_FEE = 5; // 0.05%
    uint256 public constant TOTAL_FEE = LP_FEE + OWNER_FEE; // 0.3%
    uint256 public constant MINIMUM_LIQUIDITY = 1000; // Minimum LP tokens for first deposit

    // Reputation config
    address public reputationContract;

    // Structs
    struct Pair {
        address token0;
        address token1;
        address lpToken;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply;
        uint256 kLast; // K value at last liquidity event
    }

    // State variables
    mapping(bytes32 => Pair) public pairs;
    mapping(address => mapping(address => bytes32)) public pairKeys;
    mapping(address => bool) public supportedTokens;
    
    address[] public allTokens;
    uint256 public ownerFeeAccumulated;

    // Events
    event PairCreated(address indexed token0, address indexed token1, address indexed lpToken, bytes32 pairKey);
    event LiquidityAdded(address indexed pairKey, address indexed user, uint256 amount0, uint256 amount1, uint256 lpAmount);
    event LiquidityRemoved(address indexed pairKey, address indexed user, uint256 amount0, uint256 amount1, uint256 lpAmount);
    event Swap(address indexed pairKey, address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(address indexed pairKey, uint256 reserve0, uint256 reserve1);
    event FeeAdjusted(address indexed user, uint256 reputation, uint256 feePercent);
    event ReputationAwarded(address indexed user, uint256 points, bytes32 indexed pairKey, bytes32 action);

    constructor() Ownable(msg.sender) {}

    function setReputationContract(address _addr) external onlyOwner {
        reputationContract = _addr;
    }

    /**
     * @dev Add supported tokens to the DEX
     * @param tokens Array of token addresses to support
     */
    function addSupportedTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!supportedTokens[tokens[i]]) {
                supportedTokens[tokens[i]] = true;
                allTokens.push(tokens[i]);
            }
        }
    }

    /**
     * @dev Create a new trading pair
     * @param token0 First token address
     * @param token1 Second token address
     * @return pairKey The unique key for this pair
     */
    function createPair(address token0, address token1) external onlyOwner returns (bytes32) {
        require(token0 != token1, "TikTakDex: IDENTICAL_ADDRESSES");
        require(supportedTokens[token0] && supportedTokens[token1], "TikTakDex: UNSUPPORTED_TOKEN");
        
        // Ensure token0 < token1 for consistency
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }

        bytes32 pairKey = keccak256(abi.encodePacked(token0, token1));
        require(pairs[pairKey].token0 == address(0), "TikTakDex: PAIR_EXISTS");

        // Create LP token with dynamic naming based on token addresses
        // Format: "TikTakLP-<shortAddr0>-<shortAddr1>"
        string memory addr0Str = _addressToString(token0);
        string memory addr1Str = _addressToString(token1);
        
        string memory lpName = string(abi.encodePacked(
            "TikTakLP-",
            _substring(addr0Str, 0, 6),
            "-",
            _substring(addr1Str, 0, 6)
        ));
        string memory lpSymbol = string(abi.encodePacked(
            "LP-",
            _substring(addr0Str, 0, 4),
            _substring(addr1Str, 0, 4)
        ));

        TikTakLP lpToken = new TikTakLP(lpName, lpSymbol);

        pairs[pairKey] = Pair({
            token0: token0,
            token1: token1,
            lpToken: address(lpToken),
            reserve0: 0,
            reserve1: 0,
            totalSupply: 0,
            kLast: 0
        });

        pairKeys[token0][token1] = pairKey;
        pairKeys[token1][token0] = pairKey;

        emit PairCreated(token0, token1, address(lpToken), pairKey);
        return pairKey;
    }

    /**
     * @dev Add liquidity to a pair
     * @param token0 First token address
     * @param token1 Second token address
     * @param amount0 Amount of token0 to add
     * @param amount1 Amount of token1 to add
     * @param to Address to receive LP tokens
     * @return lpAmount Amount of LP tokens minted
     */
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        address to
    ) external returns (uint256 lpAmount) {
        bytes32 pairKey = getPairKey(token0, token1);
        Pair storage pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
            (amount0, amount1) = (amount1, amount0);
        }

        uint256 _reserve0 = pair.reserve0;
        uint256 _reserve1 = pair.reserve1;

        if (_reserve0 == 0 && _reserve1 == 0) {
            // First liquidity provision - require minimum liquidity to prevent precision issues
            lpAmount = sqrt(amount0 * amount1);
            require(lpAmount > MINIMUM_LIQUIDITY, "TikTakDex: INSUFFICIENT_LIQUIDITY_MINTED");
            // Lock minimum liquidity forever (burn to zero address)
            // This prevents someone from draining the pool by being the first to add/remove
            lpAmount = lpAmount - MINIMUM_LIQUIDITY;
        } else {
            // Subsequent liquidity provision
            uint256 liquidity0 = (amount0 * pair.totalSupply) / _reserve0;
            uint256 liquidity1 = (amount1 * pair.totalSupply) / _reserve1;
            lpAmount = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }

        require(lpAmount > 0, "TikTakDex: INSUFFICIENT_LIQUIDITY_MINTED");

        // Transfer tokens
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Update reserves
        pair.reserve0 = _reserve0 + amount0;
        pair.reserve1 = _reserve1 + amount1;

        // Mint LP tokens (or burn minimum liquidity for first deposit)
        if (_reserve0 == 0 && _reserve1 == 0) {
            // Burn minimum liquidity to zero address (Uniswap V2 pattern)
            TikTakLP(pair.lpToken).mint(address(0), MINIMUM_LIQUIDITY);
            TikTakLP(pair.lpToken).mint(to, lpAmount);
            // Update totalSupply to include burned amount
            pair.totalSupply = MINIMUM_LIQUIDITY + lpAmount;
        } else {
            TikTakLP(pair.lpToken).mint(to, lpAmount);
            pair.totalSupply = pair.totalSupply + lpAmount;
        }

        emit LiquidityAdded(address(pair.lpToken), to, amount0, amount1, lpAmount);
        emit Sync(address(pair.lpToken), pair.reserve0, pair.reserve1);

        // Award reputation points for adding liquidity (+2 XP)
        _awardReputation(to, 2, pairKey, "ADD_LIQ");
    }

    /**
     * @dev Remove liquidity from a pair
     * @param token0 First token address
     * @param token1 Second token address
     * @param lpAmount Amount of LP tokens to burn
     * @param to Address to receive tokens
     * @return amount0 Amount of token0 received
     * @return amount1 Amount of token1 received
     */
    function removeLiquidity(
        address token0,
        address token1,
        uint256 lpAmount,
        address to
    ) external returns (uint256 amount0, uint256 amount1) {
        bytes32 pairKey = getPairKey(token0, token1);
        Pair storage pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }

        uint256 _totalSupply = pair.totalSupply;
        require(lpAmount <= _totalSupply, "TikTakDex: INSUFFICIENT_LIQUIDITY");

        amount0 = (lpAmount * pair.reserve0) / _totalSupply;
        amount1 = (lpAmount * pair.reserve1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "TikTakDex: INSUFFICIENT_LIQUIDITY_BURNED");

        // Burn LP tokens
        TikTakLP(pair.lpToken).burn(msg.sender, lpAmount);

        // Update reserves
        pair.reserve0 = pair.reserve0 - amount0;
        pair.reserve1 = pair.reserve1 - amount1;
        pair.totalSupply = _totalSupply - lpAmount;

        // Transfer tokens
        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);

        emit LiquidityRemoved(address(pair.lpToken), to, amount0, amount1, lpAmount);
        emit Sync(address(pair.lpToken), pair.reserve0, pair.reserve1);
    }

    /**
     * @dev Swap exact tokens for tokens
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum amount of output tokens (slippage protection)
     * @param to Address to receive output tokens
     * @return amountOut Amount of output tokens received
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        bytes32 pairKey = getPairKey(tokenIn, tokenOut);
        Pair storage pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        // Get amount out (this already accounts for fee in the AMM formula)
        amountOut = getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut > 0, "TikTakDex: INSUFFICIENT_OUTPUT_AMOUNT");
        require(amountOut >= amountOutMin, "TikTakDex: INSUFFICIENT_OUTPUT_AMOUNT");

        // Transfer input tokens
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate fees based on user's reputation
        uint256 feePercent = getUserFeeRate(msg.sender); // in basis points (e.g., 30 = 0.30%)
        
        // The fee is already factored into amountOut via getAmountOut formula
        // Calculate owner fee portion from input amount (simplified tracking)
        // Owner fee is OWNER_FEE / TOTAL_FEE of the total fee
        uint256 ownerFeeAmount = (amountIn * feePercent * OWNER_FEE) / (FEE_DENOMINATOR * TOTAL_FEE);

        // Update reserves: add full amountIn, subtract amountOut
        // The LP fee automatically stays in the pool (increases LP token value)
        // This is because amountOut already accounts for the fee in the AMM formula
        if (tokenIn == pair.token0) {
            pair.reserve0 = pair.reserve0 + amountIn;
            pair.reserve1 = pair.reserve1 - amountOut;
        } else {
            pair.reserve0 = pair.reserve0 - amountOut;
            pair.reserve1 = pair.reserve1 + amountIn;
        }

        // Accumulate owner fee (tracked in input token terms for simplicity)
        // Note: In production, you'd want per-token tracking, but this works for the current structure
        ownerFeeAccumulated = ownerFeeAccumulated + ownerFeeAmount;

        // Transfer output tokens to user
        IERC20(tokenOut).safeTransfer(to, amountOut);

        // Emit events
        uint256 reputation = reputationContract == address(0) ? 0 : IReputation(reputationContract).getScore(msg.sender);
        emit FeeAdjusted(msg.sender, reputation, feePercent);
        emit Swap(address(pair.lpToken), to, tokenIn, amountIn, amountOut);
        emit Sync(address(pair.lpToken), pair.reserve0, pair.reserve1);

        // Award reputation points for swapping (+1 XP)
        _awardReputation(msg.sender, 1, pairKey, "SWAP");
    }

    /**
     * @dev Get amount out for a given amount in
     * @param amountIn Amount of input tokens
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return amountOut Amount of output tokens
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) public view returns (uint256 amountOut) {
        bytes32 pairKey = getPairKey(tokenIn, tokenOut);
        Pair memory pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == pair.token0) {
            reserveIn = pair.reserve0;
            reserveOut = pair.reserve1;
        } else {
            reserveIn = pair.reserve1;
            reserveOut = pair.reserve0;
        }

        require(amountIn > 0, "TikTakDex: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "TikTakDex: INSUFFICIENT_LIQUIDITY");

        uint256 userFee = getUserFeeRate(msg.sender);
        // Translate user fee to pair pricing fee equivalent (TOTAL_FEE is 0.3% baseline)
        // We model pricing fee with "userFee" directly.
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - userFee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Get amount in for a given amount out
     * @param amountOut Amount of output tokens
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return amountIn Amount of input tokens required
     */
    function getAmountIn(
        uint256 amountOut,
        address tokenIn,
        address tokenOut
    ) public view returns (uint256 amountIn) {
        bytes32 pairKey = getPairKey(tokenIn, tokenOut);
        Pair memory pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == pair.token0) {
            reserveIn = pair.reserve0;
            reserveOut = pair.reserve1;
        } else {
            reserveIn = pair.reserve1;
            reserveOut = pair.reserve0;
        }

        require(amountOut > 0, "TikTakDex: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "TikTakDex: INSUFFICIENT_LIQUIDITY");

        uint256 userFee = getUserFeeRate(msg.sender);
        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * (FEE_DENOMINATOR - userFee);
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @dev Get reserves for a pair
     * @param token0 First token address
     * @param token1 Second token address
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     */
    function getReserves(address token0, address token1) external view returns (uint256 reserve0, uint256 reserve1) {
        bytes32 pairKey = getPairKey(token0, token1);
        Pair memory pair = pairs[pairKey];
        require(pair.token0 != address(0), "TikTakDex: PAIR_NOT_EXISTS");

        if (token0 == pair.token0) {
            return (pair.reserve0, pair.reserve1);
        } else {
            return (pair.reserve1, pair.reserve0);
        }
    }

    /**
     * @dev Award reputation points to user for DEX actions
     * @param user Address of the user
     * @param points Number of points to award
     * @param pairKey The pair key for the action
     * @param action The action type (SWAP, ADD_LIQ, etc.)
     */
    function _awardReputation(address user, uint256 points, bytes32 pairKey, bytes32 action) internal {
        if (reputationContract == address(0)) return;
        // Gamified scheme based on action points
        // Use try/catch to prevent reverts from breaking core DEX flows
        try IReputation(reputationContract).updateScore(user, points) {
            emit ReputationAwarded(user, points, pairKey, action);
        } catch {
            // ignore failures
        }
    }

    /**
     * @dev Get pair key for two tokens
     * @param token0 First token address
     * @param token1 Second token address
     * @return pairKey The unique key for this pair
     */
    function getPairKey(address token0, address token1) public pure returns (bytes32) {
        if (token0 < token1) {
            return keccak256(abi.encodePacked(token0, token1));
        } else {
            return keccak256(abi.encodePacked(token1, token0));
        }
    }

    /**
     * @dev Get pair information
     * @param pairKey The pair key
     * @return pair The pair struct
     */
    function getPair(bytes32 pairKey) external view returns (Pair memory) {
        return pairs[pairKey];
    }

    /**
     * @dev Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getUserFeeRate(address user) public view returns (uint256) {
        if (reputationContract == address(0)) {
            return TOTAL_FEE; // default 0.3%
        }
        uint256 score = IReputation(reputationContract).getScore(user);
        if (score >= 500) return 5;      // 0.05%
        if (score >= 100) return 10;     // 0.1%
        if (score >= 50) return 20;      // 0.2%
        return 30;                        // 0.3%
    }

    /**
     * @dev Withdraw accumulated owner fees
     * @notice Note: ownerFeeAccumulated is tracked in input token terms from swaps
     * In production, you'd want per-token fee tracking. This is a simplified version.
     * For now, this function is kept for compatibility but fees are distributed
     * through the pool value increase (LP tokens gain value from fees staying in pool).
     */
    function withdrawOwnerFees() external onlyOwner {
        uint256 amount = ownerFeeAccumulated;
        require(amount > 0, "TikTakDex: NO_FEES_TO_WITHDRAW");
        
        ownerFeeAccumulated = 0;
        
        // Note: In this implementation, fees are in various ERC20 tokens from swaps
        // This function would need per-token tracking in production
        // For now, we reset the accumulator (fees effectively stay in pool for LPs)
        // In a production system, you'd track fees per token and allow withdrawal per token
    }

    /**
     * @dev Calculate square root using Babylonian method
     * @param x Number to calculate square root of
     * @return y Square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev Convert address to string (hex format)
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    /**
     * @dev Get substring of a string (simplified - gets first N characters)
     */
    function _substring(string memory str, uint256 start, uint256 length) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(start + length <= strBytes.length, "TikTakDex: INVALID_SUBSTRING");
        
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = strBytes[start + i];
        }
        return string(result);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
