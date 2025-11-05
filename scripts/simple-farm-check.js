const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌾 Checking farm pools status...\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- Farm Address:", config.farmAddress);
  console.log("- Reward Token:", config.farmRewardToken);
  console.log();

  // Connect to farm contract
  const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
  const farm = LiquidityFarm.attach(config.farmAddress);
  
  // Check pool count
  const poolLength = await farm.poolLength();
  console.log(`📊 Total pools in farm: ${poolLength}`);
  
  // Check reward token balance
  const tikToken = await hre.ethers.getContractAt("MockERC20", config.farmRewardToken);
  const farmBalance = await tikToken.balanceOf(config.farmAddress);
  console.log("Farm's TIK balance:", hre.ethers.formatEther(farmBalance), "TIK");
  
  // Check reward rate
  const rewardPerSecond = await farm.rewardPerSecond();
  console.log("Reward rate:", hre.ethers.formatEther(rewardPerSecond), "TIK/second");
  
  console.log("\n🌾 Pool Details:");
  for (let i = 0; i < poolLength; i++) {
    const poolInfo = await farm.poolInfo(i);
    const pair = config.pairs.find(p => p.lpToken.toLowerCase() === poolInfo.lpToken.toLowerCase());
    const poolName = pair ? pair.name : `Pool ${i}`;
    console.log(`  ${i}. ${poolName}`);
    console.log(`     - LP Token: ${poolInfo.lpToken}`);
    console.log(`     - Allocation Points: ${poolInfo.allocPoint}`);
    console.log(`     - Total Staked: ${hre.ethers.formatEther(poolInfo.totalStaked)} LP`);
    console.log(`     - Active: ${poolInfo.active}`);
    console.log();
  }

  console.log("✅ Farm is ready!");
  console.log("🚀 The pools should now show up in the farming dashboard!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

