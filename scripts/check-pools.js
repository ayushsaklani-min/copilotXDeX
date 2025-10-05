const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking current pool reserves...");

  // Use hardcoded values
  const RPC_URL = "https://rpc-amoy.polygon.technology/";
  const PRIVATE_KEY = "0x8bc6df0ad6520901a4e6583847e11d9b139e1120f755b4750ae39b2de3bb7a3b";

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Using account:", wallet.address);
  
  // Contract addresses
  const DEX_ADDRESS = "0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba";
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Get contract instances
  const dexAbi = [
    "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
  ];

  const lpAbi = [
    "function balanceOf(address) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
  ];

  const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, wallet);

  // Check TIK-TOE pool
  console.log("\n📊 TIK-TOE Pool Status:");
  try {
    const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE]));
    const tikToePair = await dex.pairs(tikToePairKey);
    
    const tikReserve = ethers.formatEther(tikToePair[3]);
    const toeReserve = ethers.formatEther(tikToePair[4]);
    const totalSupply = ethers.formatEther(tikToePair[5]);
    
    console.log(`  TIK Reserve: ${tikReserve}`);
    console.log(`  TOE Reserve: ${toeReserve}`);
    console.log(`  Total LP Supply: ${totalSupply}`);
    console.log(`  TVL: $${(parseFloat(tikReserve) + parseFloat(toeReserve)).toFixed(2)}`);
    
    // Check user's LP balance
    const lpToken = new ethers.Contract(tikToePair[2], lpAbi, wallet);
    const userLpBalance = await lpToken.balanceOf(wallet.address);
    const userShare = totalSupply > 0 ? (parseFloat(ethers.formatEther(userLpBalance)) / parseFloat(totalSupply)) * 100 : 0;
    
    console.log(`  Your LP Balance: ${ethers.formatEther(userLpBalance)}`);
    console.log(`  Your Share: ${userShare.toFixed(4)}%`);
    
  } catch (error) {
    console.log("  ❌ Error checking TIK-TOE pool:", error.message);
  }

  // Check TAK-TOE pool
  console.log("\n📊 TAK-TOE Pool Status:");
  try {
    const takToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TAK, TOKENS.TOE]));
    const takToePair = await dex.pairs(takToePairKey);
    
    const takReserve = ethers.formatEther(takToePair[3]);
    const toeReserve = ethers.formatEther(takToePair[4]);
    const totalSupply = ethers.formatEther(takToePair[5]);
    
    console.log(`  TAK Reserve: ${takReserve}`);
    console.log(`  TOE Reserve: ${toeReserve}`);
    console.log(`  Total LP Supply: ${totalSupply}`);
    console.log(`  TVL: $${(parseFloat(takReserve) + parseFloat(toeReserve)).toFixed(2)}`);
    
    // Check user's LP balance
    const lpToken = new ethers.Contract(takToePair[2], lpAbi, wallet);
    const userLpBalance = await lpToken.balanceOf(wallet.address);
    const userShare = totalSupply > 0 ? (parseFloat(ethers.formatEther(userLpBalance)) / parseFloat(totalSupply)) * 100 : 0;
    
    console.log(`  Your LP Balance: ${ethers.formatEther(userLpBalance)}`);
    console.log(`  Your Share: ${userShare.toFixed(4)}%`);
    
  } catch (error) {
    console.log("  ❌ Error checking TAK-TOE pool:", error.message);
  }

  console.log("\n✅ Pool status check completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Pool check failed:", error);
    process.exit(1);
  });
