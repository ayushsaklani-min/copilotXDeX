const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 RECOVERING TOKENS FROM ORIGINAL DEX (WITH LP TOKENS)\n");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Wallet:", deployer.address);
  
  // ORIGINAL DEX addresses from deploy-report.json
  const ORIGINAL_DEX = "0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3";
  const TIK = "0xf0dc4aa8063810B4116091371a74D55856c9Fa87";
  const TAK = "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3";
  const TOE = "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc";
  
  // LP Token addresses from deploy-report.json
  const TIK_TAK_LP = "0x235b7Cb52BbF354f7dE866a7C4da7Ab9f97E1417";
  const TIK_TOE_LP = "0x4583E86B912f13826F6454bfB88E5CeD86f9090a";
  const TAK_TOE_LP = "0x82ca215a26755153a67C9cf50DeB4873bF91531C";
  
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("Original DEX:", ORIGINAL_DEX);
  console.log("TIK Token:", TIK);
  console.log("TAK Token:", TAK);
  console.log("TOE Token:", TOE);
  console.log("TIK-TAK LP:", TIK_TAK_LP);
  console.log("TIK-TOE LP:", TIK_TOE_LP);
  console.log("TAK-TOE LP:", TAK_TOE_LP);
  
  // Get contracts
  const dex = await ethers.getContractAt("TikTakDex", ORIGINAL_DEX);
  const tikToken = await ethers.getContractAt("LaunchToken", TIK);
  const takToken = await ethers.getContractAt("LaunchToken", TAK);
  const toeToken = await ethers.getContractAt("LaunchToken", TOE);
  const tikTakLP = await ethers.getContractAt("TikTakLP", TIK_TAK_LP);
  const tikToeLP = await ethers.getContractAt("TikTakLP", TIK_TOE_LP);
  const takToeLP = await ethers.getContractAt("TikTakLP", TAK_TOE_LP);
  
  console.log("\n💰 CHECKING CURRENT BALANCES:");
  console.log("────────────────────────────────────────────────────────────");
  
  const tikBefore = await tikToken.balanceOf(deployer.address);
  const takBefore = await takToken.balanceOf(deployer.address);
  const toeBefore = await toeToken.balanceOf(deployer.address);
  
  console.log("TIK in wallet:", ethers.formatEther(tikBefore));
  console.log("TAK in wallet:", ethers.formatEther(takBefore));
  console.log("TOE in wallet:", ethers.formatEther(toeBefore));
  
  const totalBefore = parseFloat(ethers.formatEther(tikBefore)) + 
                      parseFloat(ethers.formatEther(takBefore)) + 
                      parseFloat(ethers.formatEther(toeBefore));
  console.log("TOTAL BEFORE:", totalBefore.toFixed(2), "tokens");
  
  console.log("\n🎫 CHECKING LP TOKEN BALANCES:");
  console.log("────────────────────────────────────────────────────────────");
  
  const tikTakLPBalance = await tikTakLP.balanceOf(deployer.address);
  const tikToeLPBalance = await tikToeLP.balanceOf(deployer.address);
  const takToeLPBalance = await takToeLP.balanceOf(deployer.address);
  
  console.log("TIK-TAK LP:", ethers.formatEther(tikTakLPBalance));
  console.log("TIK-TOE LP:", ethers.formatEther(tikToeLPBalance));
  console.log("TAK-TOE LP:", ethers.formatEther(takToeLPBalance));
  
  console.log("\n🏊 CHECKING POOL RESERVES:");
  console.log("────────────────────────────────────────────────────────────");
  
  // Check TIK-TAK pool
  const tikTakReserves = await dex.getReserves(TIK, TAK);
  console.log("\nTIK-TAK Pool:");
  console.log("  TIK Reserve:", ethers.formatEther(tikTakReserves[0]));
  console.log("  TAK Reserve:", ethers.formatEther(tikTakReserves[1]));
  
  // Check TIK-TOE pool
  const tikToeReserves = await dex.getReserves(TIK, TOE);
  console.log("\nTIK-TOE Pool:");
  console.log("  TIK Reserve:", ethers.formatEther(tikToeReserves[0]));
  console.log("  TOE Reserve:", ethers.formatEther(tikToeReserves[1]));
  
  // Check TAK-TOE pool
  const takToeReserves = await dex.getReserves(TAK, TOE);
  console.log("\nTAK-TOE Pool:");
  console.log("  TAK Reserve:", ethers.formatEther(takToeReserves[0]));
  console.log("  TOE Reserve:", ethers.formatEther(takToeReserves[1]));
  
  const totalInPools = parseFloat(ethers.formatEther(tikTakReserves[0])) +
                       parseFloat(ethers.formatEther(tikTakReserves[1])) +
                       parseFloat(ethers.formatEther(tikToeReserves[0])) +
                       parseFloat(ethers.formatEther(tikToeReserves[1])) +
                       parseFloat(ethers.formatEther(takToeReserves[0])) +
                       parseFloat(ethers.formatEther(takToeReserves[1]));
  
  console.log("\nTOTAL IN POOLS:", totalInPools.toFixed(2), "tokens 🎯");
  
  console.log("\n🚀 STARTING RECOVERY...");
  console.log("────────────────────────────────────────────────────────────");
  
  let recovered = 0;
  
  // Remove liquidity from TIK-TAK pool
  if (tikTakLPBalance > 0) {
    console.log("\n1️⃣ Removing TIK-TAK liquidity...");
    console.log("   LP tokens to burn:", ethers.formatEther(tikTakLPBalance));
    try {
      // Approve DEX to burn LP tokens
      const approveTx1 = await tikTakLP.approve(ORIGINAL_DEX, tikTakLPBalance);
      await approveTx1.wait();
      console.log("   ✅ Approved LP tokens");
      
      const tx1 = await dex.removeLiquidity(TIK, TAK, tikTakLPBalance, deployer.address);
      await tx1.wait();
      const amount = parseFloat(ethers.formatEther(tikTakReserves[0])) + 
                     parseFloat(ethers.formatEther(tikTakReserves[1]));
      recovered += amount;
      console.log("   ✅ Recovered ~", amount.toFixed(2), "tokens from TIK-TAK pool");
    } catch (error) {
      console.log("   ❌ Failed:", error.message);
    }
  } else {
    console.log("\n1️⃣ No TIK-TAK LP tokens to remove");
  }
  
  // Remove liquidity from TIK-TOE pool
  if (tikToeLPBalance > 0) {
    console.log("\n2️⃣ Removing TIK-TOE liquidity...");
    console.log("   LP tokens to burn:", ethers.formatEther(tikToeLPBalance));
    try {
      // Approve DEX to burn LP tokens
      const approveTx2 = await tikToeLP.approve(ORIGINAL_DEX, tikToeLPBalance);
      await approveTx2.wait();
      console.log("   ✅ Approved LP tokens");
      
      const tx2 = await dex.removeLiquidity(TIK, TOE, tikToeLPBalance, deployer.address);
      await tx2.wait();
      const amount = parseFloat(ethers.formatEther(tikToeReserves[0])) + 
                     parseFloat(ethers.formatEther(tikToeReserves[1]));
      recovered += amount;
      console.log("   ✅ Recovered ~", amount.toFixed(2), "tokens from TIK-TOE pool");
    } catch (error) {
      console.log("   ❌ Failed:", error.message);
    }
  } else {
    console.log("\n2️⃣ No TIK-TOE LP tokens to remove");
  }
  
  // Remove liquidity from TAK-TOE pool
  if (takToeLPBalance > 0) {
    console.log("\n3️⃣ Removing TAK-TOE liquidity...");
    console.log("   LP tokens to burn:", ethers.formatEther(takToeLPBalance));
    try {
      // Approve DEX to burn LP tokens
      const approveTx3 = await takToeLP.approve(ORIGINAL_DEX, takToeLPBalance);
      await approveTx3.wait();
      console.log("   ✅ Approved LP tokens");
      
      const tx3 = await dex.removeLiquidity(TAK, TOE, takToeLPBalance, deployer.address);
      await tx3.wait();
      const amount = parseFloat(ethers.formatEther(takToeReserves[0])) + 
                     parseFloat(ethers.formatEther(takToeReserves[1]));
      recovered += amount;
      console.log("   ✅ Recovered ~", amount.toFixed(2), "tokens from TAK-TOE pool");
    } catch (error) {
      console.log("   ❌ Failed:", error.message);
    }
  } else {
    console.log("\n3️⃣ No TAK-TOE LP tokens to remove");
  }
  
  console.log("\n💰 FINAL BALANCES:");
  console.log("────────────────────────────────────────────────────────────");
  
  const tikAfter = await tikToken.balanceOf(deployer.address);
  const takAfter = await takToken.balanceOf(deployer.address);
  const toeAfter = await toeToken.balanceOf(deployer.address);
  
  console.log("TIK in wallet:", ethers.formatEther(tikAfter));
  console.log("TAK in wallet:", ethers.formatEther(takAfter));
  console.log("TOE in wallet:", ethers.formatEther(toeAfter));
  
  const totalAfter = parseFloat(ethers.formatEther(tikAfter)) + 
                     parseFloat(ethers.formatEther(takAfter)) + 
                     parseFloat(ethers.formatEther(toeAfter));
  
  console.log("\n📊 RECOVERY SUMMARY:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("Before:", totalBefore.toFixed(2), "tokens");
  console.log("After:", totalAfter.toFixed(2), "tokens");
  console.log("Recovered:", (totalAfter - totalBefore).toFixed(2), "tokens 🎉");
  console.log("\n✅ RECOVERY COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
