require("dotenv").config();
require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: (() => {
        let pk = process.env.PRIVATE_KEY || '';
        if (!pk) return [];
        pk = pk.trim();
        if (!pk.startsWith('0x')) pk = '0x' + pk;
        // Keep only 0x + 64 hex chars
        if (pk.length > 66) pk = pk.slice(0, 66);
        return [pk];
      })(),
      chainId: 80002,
      gasPrice: 30000000000, // 30 gwei to meet min tip cap
      timeout: 90000,
    },
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
