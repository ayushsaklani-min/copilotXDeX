// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Reputation
 * @dev Simple on-chain reputation contract with owner-managed updaters
 */
contract Reputation is Ownable {
    mapping(address => uint256) private userToScore;
    mapping(address => bool) public isUpdater;

    event ScoreUpdated(address indexed user, uint256 newScore, uint256 addedPoints, address indexed caller);
    event UpdaterGranted(address indexed updater);
    event UpdaterRevoked(address indexed updater);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function grantUpdater(address updater) external onlyOwner {
        isUpdater[updater] = true;
        emit UpdaterGranted(updater);
    }

    function revokeUpdater(address updater) external onlyOwner {
        isUpdater[updater] = false;
        emit UpdaterRevoked(updater);
    }

    function updateScore(address user, uint256 points) external {
        require(isUpdater[msg.sender] || msg.sender == owner(), "NOT_AUTHORIZED");
        if (points == 0) return;
        uint256 newScore = userToScore[user] + points;
        userToScore[user] = newScore;
        emit ScoreUpdated(user, newScore, points, msg.sender);
    }

    function setScore(address user, uint256 newScore) external onlyOwner {
        userToScore[user] = newScore;
        emit ScoreUpdated(user, newScore, 0, msg.sender);
    }

    function getScore(address user) external view returns (uint256) {
        return userToScore[user];
    }
}



