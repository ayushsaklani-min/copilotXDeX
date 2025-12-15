// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SimpleDEXFactory.sol";
import "./SimpleDEXPair.sol";
import "./IWETH.sol";

/**
 * @title SimpleDEXRouter
 * @notice Minimal Uniswap V2 style router for adding/removing liquidity
 */
contract SimpleDEXRouter is ReentrancyGuard {
    address public immutable factory;
    address public immutable WETH;
    
    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, "Expired");
        _;
    }
    
    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }
    
    receive() external payable {
        assert(msg.sender == WETH);
    }
    
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable ensure(deadline) nonReentrant returns (uint amountToken, uint amountETH, uint liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        
        address pair = SimpleDEXFactory(factory).getPair(token, WETH);
        if (pair == address(0)) {
            pair = SimpleDEXFactory(factory).createPair(token, WETH);
        }
        
        IERC20(token).transferFrom(msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        
        liquidity = SimpleDEXPair(pair).mint(to);
        
        if (msg.value > amountETH) {
            payable(msg.sender).transfer(msg.value - amountETH);
        }
    }
    
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal view returns (uint amountA, uint amountB) {
        address pair = SimpleDEXFactory(factory).getPair(tokenA, tokenB);
        
        if (pair == address(0)) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            (uint112 reserveA, uint112 reserveB,) = SimpleDEXPair(pair).getReserves();
            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "Insufficient B amount");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                    assert(amountAOptimal <= amountADesired);
                    require(amountAOptimal >= amountAMin, "Insufficient A amount");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }
    
    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, "Insufficient amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");
        amountB = amountA * reserveB / reserveA;
    }
    
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external ensure(deadline) nonReentrant returns (uint amountToken, uint amountETH) {
        address pair = SimpleDEXFactory(factory).getPair(token, WETH);
        require(pair != address(0), "Pair doesn't exist");
        
        SimpleDEXPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint amount0, uint amount1) = SimpleDEXPair(pair).burn(address(this));
        (address token0,) = sortTokens(token, WETH);
        (amountToken, amountETH) = token == token0 ? (amount0, amount1) : (amount1, amount0);
        
        require(amountToken >= amountTokenMin, "Insufficient token amount");
        require(amountETH >= amountETHMin, "Insufficient ETH amount");
        
        IERC20(token).transfer(to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        payable(to).transfer(amountETH);
    }
    
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "Identical addresses");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
    }
}
