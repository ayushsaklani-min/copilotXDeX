const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌾 Adding pools to existing Liquidity Farm...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (!config.farmAddress) {
    console.log("❌ No farm address found in config. Please deploy farm first.");
    return;
  }

  console.log("📋 Configuration:");
  console.log("- Farm Address:", config.farmAddress);
  console.log("- DEX Address:", config.dexAddress);
  console.log("- Reward Token:", config.farmRewardToken);
  console.log();

  // Connect to existing farm
  const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
  const farm = LiquidityFarm.attach(config.farmAddress);

  // Check current pool count
  const poolLength = await farm.poolLength();
  console.log(`📊 Current pools in farm: ${poolLength}`);

  // Add pools for each LP token
  console.log("\n🔄 Adding farm pools...");
  
  let poolsAdded = 0;
  for (const pair of config.pairs) {
    // Skip invalid LP tokens
    if (!pair.lpToken || pair.lpToken === "0x0000000000000000000000000000000000000000") {
      console.log(`⏭️  Skipping ${pair.name} (no LP token)`);
      continue;
    }
    
    console.log(`Adding pool for ${pair.name}...`);
    
    // Allocation points (higher = more rewards)
    // TIK-TOE gets most rewards (100 points)
    // TIK-TAK gets medium rewards (75 points)
    // TAK-TOE gets least rewards (50 points)
    let allocPoint = 50;
    if (pair.name === "TIK-TOE") allocPoint = 100;
    if (pair.name === "TIK-TAK") allocPoint = 75;
    
    try {
      const addPoolTx = await farm.addPool(allocPoint, pair.lpToken);
      await addPoolTx.wait();
      console.log(`✅ ${pair.name} pool added with ${allocPoint} allocation points`);
      poolsAdded++;
    } catch (error) {
      console.log(`❌ Failed to add ${pair.name} pool:`, error.message);
    }
  }
  
  if (poolsAdded === 0) {
    console.log("❌ No pools were added!");
    return;
  }

  // Check final pool count
  const finalPoolLength = await farm.poolLength();
  console.log(`\n📊 Final pools in farm: ${finalPoolLength}`);

  // Fund the farm with reward tokens if needed
  console.log("\n💰 Checking farm funding...");
  const farmBalance = await farm.totalRewardBalance();
  console.log("Current farm balance:", hre.ethers.formatEther(farmBalance), "TIK");
  
  if (farmBalance < hre.ethers.parseEther("1000")) {
    console.log("⚠️  Farm has low balance. Funding with reward tokens...");
    const fundAmount = hre.ethers.parseEther("100000"); // 100k TIK tokens
    
    const tikToken = await hre.ethers.getContractAt("MockERC20", config.farmRewardToken);
    const approveTx = await tikToken.approve(config.farmAddress, fundAmount);
    await approveTx.wait();
    console.log("✅ Approved TIK tokens");
    
    const fundTx = await farm.fundFarm(fundAmount);
    await fundTx.wait();
    console.log("✅ Farm funded with", hre.ethers.formatEther(fundAmount), "TIK");
  } else {
    console.log("✅ Farm has sufficient balance");
  }

  console.log("\n🎉 Pool Addition Complete!");
  console.log("\n📋 Summary:");
  console.log("- Farm Address:", config.farmAddress);
  console.log("- Pools Added:", poolsAdded);
  console.log("- Total Pools:", finalPoolLength);
  console.log("\n🌾 Pool Details:");
  
  for (let i = 0; i < finalPoolLength; i++) {
    const poolInfo = await farm.poolInfo(i);
    const pair = config.pairs.find(p => p.lpToken.toLowerCase() === poolInfo.lpToken.toLowerCase());
    const poolName = pair ? pair.name : "Unknown";
    console.log(`  ${i}. ${poolName} - ${poolInfo.allocPoint} allocation points`);
  }

  console.log("\n✅ Users can now:");
  console.log("  1. Stake LP tokens in the farm");
  console.log("  2. Earn TIK rewards");
  console.log("  3. Harvest or auto-compound");
  console.log("  4. Get reputation multiplier bonuses");

  console.log("\n🚀 Visit /dex → Farming tab to start farming!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

