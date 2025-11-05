const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 CHECKING CURRENT STATE\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Wallet:", deployer.address);
  
  // Read deployed addresses
  const fs = require('fs');
  const deployedAddresses = JSON.parse(
    fs.readFileSync('./deployed-addresses.json', 'utf8')
  );
  
  console.log("\n📋 DEPLOYED CONTRACTS:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("TIK Token:", deployedAddresses.tikToken);
  console.log("TAK Token:", deployedAddresses.takToken);
  console.log("TOE Token:", deployedAddresses.toeToken);
  console.log("DEX:", deployedAddresses.dex);
  console.log("Farm:", deployedAddresses.farm);
  console.log("Referral:", deployedAddresses.referral);
  
  // Get token contracts
  const TIK = await ethers.getContractAt("TikTakToeToken", deployedAddresses.tikToken);
  const TAK = await ethers.getContractAt("TikTakToeToken", deployedAddresses.takToken);
  const TOE = await ethers.getContractAt("TikTakToeToken", deployedAddresses.toeToken);
  const DEX = await ethers.getContractAt("TikTakDex", deployedAddresses.dex);
  
  console.log("\n💰 YOUR WALLET BALANCES:");
  console.log("────────────────────────────────────────────────────────────");
  const tikBalance = await TIK.balanceOf(deployer.address);
  const takBalance = await TAK.balanceOf(deployer.address);
  const toeBalance = await TOE.balanceOf(deployer.address);
  
  console.log("TIK:", ethers.formatEther(tikBalance));
  console.log("TAK:", ethers.formatEther(takBalance));
  console.log("TOE:", ethers.formatEther(toeBalance));
  
  const totalWallet = parseFloat(ethers.formatEther(tikBalance)) + 
                      parseFloat(ethers.formatEther(takBalance)) + 
                      parseFloat(ethers.formatEther(toeBalance));
  console.log("TOTAL IN WALLET:", totalWallet.toFixed(2), "tokens");
  
  console.log("\n🏊 DEX LIQUIDITY POOLS:");
  console.log("────────────────────────────────────────────────────────────");
  
  // Check TIK-TAK pool
  const tikTakReserves = await DEX.getReserves(deployedAddresses.tikToken, deployedAddresses.takToken);
  console.log("\nTIK-TAK Pool:");
  console.log("  TIK Reserve:", ethers.formatEther(tikTakReserves[0]));
  console.log("  TAK Reserve:", ethers.formatEther(tikTakReserves[1]));
  
  // Check TIK-TOE pool
  const tikToeReserves = await DEX.getReserves(deployedAddresses.tikToken, deployedAddresses.toeToken);
  console.log("\nTIK-TOE Pool:");
  console.log("  TIK Reserve:", ethers.formatEther(tikToeReserves[0]));
  console.log("  TOE Reserve:", ethers.formatEther(tikToeReserves[1]));
  
  // Check TAK-TOE pool
  const takToeReserves = await DEX.getReserves(deployedAddresses.takToken, deployedAddresses.toeToken);
  console.log("\nTAK-TOE Pool:");
  console.log("  TAK Reserve:", ethers.formatEther(takToeReserves[0]));
  console.log("  TOE Reserve:", ethers.formatEther(takToeReserves[1]));
  
  const totalInPools = parseFloat(ethers.formatEther(tikTakReserves[0])) +
                       parseFloat(ethers.formatEther(tikTakReserves[1])) +
                       parseFloat(ethers.formatEther(tikToeReserves[0])) +
                       parseFloat(ethers.formatEther(tikToeReserves[1])) +
                       parseFloat(ethers.formatEther(takToeReserves[0])) +
                       parseFloat(ethers.formatEther(takToeReserves[1]));
  
  console.log("\nTOTAL IN POOLS:", totalInPools.toFixed(2), "tokens");
  
  console.log("\n📊 SUMMARY:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("In Wallet:", totalWallet.toFixed(2), "tokens");
  console.log("In Pools:", totalInPools.toFixed(2), "tokens");
  console.log("GRAND TOTAL:", (totalWallet + totalInPools).toFixed(2), "tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
