const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 RECOVERING TOKENS FROM ORIGINAL DEX\n");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Wallet:", deployer.address);
  
  // ORIGINAL DEX addresses from deploy-report.json
  const ORIGINAL_DEX = "0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3";
  const TIK = "0xf0dc4aa8063810B4116091371a74D55856c9Fa87";
  const TAK = "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3";
  const TOE = "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc";
  
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("Original DEX:", ORIGINAL_DEX);
  console.log("TIK Token:", TIK);
  console.log("TAK Token:", TAK);
  console.log("TOE Token:", TOE);
  
  // Get contracts
  const dex = await ethers.getContractAt("TikTakDex", ORIGINAL_DEX);
  const tikToken = await ethers.getContractAt("LaunchToken", TIK);
  const takToken = await ethers.getContractAt("LaunchToken", TAK);
  const toeToken = await ethers.getContractAt("LaunchToken", TOE);
  
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
  if (tikTakReserves[0] > 0 && tikTakReserves[1] > 0) {
    console.log("\n1️⃣ Removing TIK-TAK liquidity...");
    try {
      const tx1 = await dex.removeLiquidity(TIK, TAK, tikTakReserves[0], tikTakReserves[1]);
      await tx1.wait();
      const amount = parseFloat(ethers.formatEther(tikTakReserves[0])) + 
                     parseFloat(ethers.formatEther(tikTakReserves[1]));
      recovered += amount;
      console.log("✅ Recovered", amount.toFixed(2), "tokens from TIK-TAK pool");
    } catch (error) {
      console.log("❌ Failed:", error.message);
    }
  }
  
  // Remove liquidity from TIK-TOE pool
  if (tikToeReserves[0] > 0 && tikToeReserves[1] > 0) {
    console.log("\n2️⃣ Removing TIK-TOE liquidity...");
    try {
      const tx2 = await dex.removeLiquidity(TIK, TOE, tikToeReserves[0], tikToeReserves[1]);
      await tx2.wait();
      const amount = parseFloat(ethers.formatEther(tikToeReserves[0])) + 
                     parseFloat(ethers.formatEther(tikToeReserves[1]));
      recovered += amount;
      console.log("✅ Recovered", amount.toFixed(2), "tokens from TIK-TOE pool");
    } catch (error) {
      console.log("❌ Failed:", error.message);
    }
  }
  
  // Remove liquidity from TAK-TOE pool
  if (takToeReserves[0] > 0 && takToeReserves[1] > 0) {
    console.log("\n3️⃣ Removing TAK-TOE liquidity...");
    try {
      const tx3 = await dex.removeLiquidity(TAK, TOE, takToeReserves[0], takToeReserves[1]);
      await tx3.wait();
      const amount = parseFloat(ethers.formatEther(takToeReserves[0])) + 
                     parseFloat(ethers.formatEther(takToeReserves[1]));
      recovered += amount;
      console.log("✅ Recovered", amount.toFixed(2), "tokens from TAK-TOE pool");
    } catch (error) {
      console.log("❌ Failed:", error.message);
    }
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
