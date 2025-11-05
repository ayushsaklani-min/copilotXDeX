const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("💰 Checking farm funding status...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- Farm Address:", config.farmAddress);
  console.log("- Reward Token:", config.farmRewardToken);
  console.log();

  // Check farm's reward token balance
  const tikToken = await hre.ethers.getContractAt("MockERC20", config.farmRewardToken);
  const farmBalance = await tikToken.balanceOf(config.farmAddress);
  console.log("Farm's TIK balance:", hre.ethers.formatEther(farmBalance), "TIK");
  
  if (farmBalance < hre.ethers.parseEther("1000")) {
    console.log("⚠️  Farm has low balance. Funding with reward tokens...");
    const fundAmount = hre.ethers.parseEther("100000"); // 100k TIK tokens
    
    const approveTx = await tikToken.approve(config.farmAddress, fundAmount);
    await approveTx.wait();
    console.log("✅ Approved TIK tokens");
    
    const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
    const farm = LiquidityFarm.attach(config.farmAddress);
    
    const fundTx = await farm.fundFarm(fundAmount);
    await fundTx.wait();
    console.log("✅ Farm funded with", hre.ethers.formatEther(fundAmount), "TIK");
    
    // Check new balance
    const newBalance = await tikToken.balanceOf(config.farmAddress);
    console.log("New farm balance:", hre.ethers.formatEther(newBalance), "TIK");
  } else {
    console.log("✅ Farm has sufficient balance");
  }

  // Check pool info
  const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
  const farm = LiquidityFarm.attach(config.farmAddress);
  
  const poolLength = await farm.poolLength();
  console.log(`\n📊 Total pools in farm: ${poolLength}`);
  
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

  console.log("🎉 Farm is ready for farming!");
  console.log("🚀 Visit /dex → Farming tab to start staking LP tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

