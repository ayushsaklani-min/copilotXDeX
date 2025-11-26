// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBondingCurveFactory {
    function updateTokenStats(
        address tokenAddress,
        bool isBuy,
        uint256 amount,
        uint256 price,
        uint256 newTVL,
        uint256 newMarketCap
    ) external;
}
