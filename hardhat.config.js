require("dotenv").config();
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
      viaIR: true,
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
        if (pk.length > 66) pk = pk.slice(0, 66);
        return [pk];
      })(),
      chainId: 80002,
      gasPrice: 30000000000,
      timeout: 90000,
    },
    polygon: {
      url: process.env.RPC_URL || "https://polygon-rpc.com/",
      accounts: (() => {
        let pk = process.env.PRIVATE_KEY || '';
        if (!pk) return [];
        pk = pk.trim();
        if (!pk.startsWith('0x')) pk = '0x' + pk;
        if (pk.length > 66) pk = pk.slice(0, 66);
        return [pk];
      })(),
      chainId: 137,
      gasPrice: "auto",
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
