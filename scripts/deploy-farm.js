const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌾 Deploying Liquidity Farm...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- DEX Address:", config.dexAddress);
  console.log("- Reputation Address:", config.reputationAddress);
  console.log("- TIK Token:", config.tokens.TIK);
  console.log();

  // Deploy LiquidityFarm
  console.log("📦 Deploying LiquidityFarm contract...");
  
  // Use TIK as reward token
  const rewardToken = config.tokens.TIK;
  const reputationContract = config.reputationAddress;
  
  // Reward rate: 0.1 TIK per second = 8640 TIK per day
  const rewardPerSecond = hre.ethers.parseEther("0.1");

  const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
  const farm = await LiquidityFarm.deploy(
    rewardToken,
    reputationContract,
    rewardPerSecond
  );
  await farm.waitForDeployment();
  
  const farmAddress = await farm.getAddress();
  console.log("✅ LiquidityFarm deployed to:", farmAddress);

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
    
    const addPoolTx = await farm.addPool(allocPoint, pair.lpToken);
    await addPoolTx.wait();
    console.log(`✅ ${pair.name} pool added with ${allocPoint} allocation points`);
    poolsAdded++;
  }
  
  if (poolsAdded === 0) {
    console.log("❌ No valid pools to add!");
    return;
  }

  // Fund the farm with reward tokens
  console.log("\n💰 Funding farm with reward tokens...");
  const fundAmount = hre.ethers.parseEther("100000"); // 100k TIK tokens
  
  const tikToken = await hre.ethers.getContractAt("MockERC20", rewardToken);
  const approveTx = await tikToken.approve(farmAddress, fundAmount);
  await approveTx.wait();
  console.log("✅ Approved TIK tokens");
  
  const fundTx = await farm.fundFarm(fundAmount);
  await fundTx.wait();
  console.log("✅ Farm funded with", hre.ethers.formatEther(fundAmount), "TIK");

  // Update configuration
  const newConfig = {
    ...config,
    farmAddress: farmAddress,
    farmRewardToken: rewardToken,
    farmRewardPerSecond: rewardPerSecond.toString(),
  };

  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log("\n✅ Configuration updated");

  console.log("\n🎉 Farm Deployment Complete!");
  console.log("\n📋 Summary:");
  console.log("- Farm Address:", farmAddress);
  console.log("- Reward Token:", rewardToken);
  console.log("- Reward Rate:", hre.ethers.formatEther(rewardPerSecond), "TIK/second");
  console.log("- Total Pools:", config.pairs.length);
  console.log("\n🌾 Pools:");
  config.pairs.forEach((pair, idx) => {
    let allocPoint = 50;
    if (pair.name === "TIK-TOE") allocPoint = 100;
    if (pair.name === "TIK-TAK") allocPoint = 75;
    console.log(`  ${idx}. ${pair.name} - ${allocPoint} points`);
  });

  console.log("\n📊 Estimated APRs (will vary based on TVL):");
  console.log("  - TIK-TOE: ~50-100% APR");
  console.log("  - TIK-TAK: ~30-60% APR");
  console.log("  - TAK-TOE: ~20-40% APR");

  console.log("\n🎁 Reputation Multipliers:");
  console.log("  - Bronze (0-49 XP): 1.0x");
  console.log("  - Silver (50-99 XP): 1.15x");
  console.log("  - Gold (100-499 XP): 1.3x");
  console.log("  - Diamond (500+ XP): 1.5x");

  console.log("\n✅ Users can now:");
  console.log("  1. Stake LP tokens in the farm");
  console.log("  2. Earn TIK rewards");
  console.log("  3. Harvest or auto-compound");
  console.log("  4. Get reputation multiplier bonuses");

  console.log("\n🚀 Next: Visit /farm page to start farming!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
