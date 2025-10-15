// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IReputationTF {
    function updateScore(address user, uint256 points) external;
}

contract LaunchToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 initialSupply_, address owner_)
        ERC20(name_, symbol_)
    {
        _mint(owner_, initialSupply_ * 10 ** decimals());
    }
}

contract TokenFactory is Ownable {
    address public reputationContract;

    constructor() Ownable(msg.sender) {}
    event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address owner);
    event ReputationContractSet(address indexed reputation);

    function setReputationContract(address _addr) external onlyOwner {
        reputationContract = _addr;
        emit ReputationContractSet(_addr);
    }

    function createToken(string memory name_, string memory symbol_, uint256 initialSupply_) external returns (address) {
        LaunchToken token = new LaunchToken(name_, symbol_, initialSupply_, msg.sender);
        emit TokenCreated(address(token), name_, symbol_, initialSupply_, msg.sender);
        // Award reputation points for token creation (+5 XP)
        if (reputationContract != address(0)) {
            try IReputationTF(reputationContract).updateScore(msg.sender, 5) {
            } catch {}
        }
        return address(token);
    }
}


