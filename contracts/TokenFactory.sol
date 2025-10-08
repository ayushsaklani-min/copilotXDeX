// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LaunchToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 initialSupply_, address owner_)
        ERC20(name_, symbol_)
    {
        _mint(owner_, initialSupply_ * 10 ** decimals());
    }
}

contract TokenFactory is Ownable {
    constructor() Ownable(msg.sender) {}
    event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address owner);

    function createToken(string memory name_, string memory symbol_, uint256 initialSupply_) external returns (address) {
        LaunchToken token = new LaunchToken(name_, symbol_, initialSupply_, msg.sender);
        emit TokenCreated(address(token), name_, symbol_, initialSupply_, msg.sender);
        return address(token);
    }
}


