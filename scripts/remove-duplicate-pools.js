const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧹 Cleaning up duplicate farm pools...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- Farm Address:", config.farmAddress);
  console.log();

  // Connect to farm contract
  const LiquidityFarm = await hre.ethers.getContractFactory("LiquidityFarm");
  const farm = LiquidityFarm.attach(config.farmAddress);
  
  // Check current pool count
  const poolLength = await farm.poolLength();
  console.log(`📊 Current pools in farm: ${poolLength}`);
  
  // Get all pool info
  const pools = [];
  for (let i = 0; i < poolLength; i++) {
    const poolInfo = await farm.poolInfo(i);
    pools.push({
      index: i,
      lpToken: poolInfo.lpToken,
      allocPoint: poolInfo.allocPoint,
      totalStaked: poolInfo.totalStaked,
      active: poolInfo.active
    });
  }
  
  // Find duplicates by LP token address
  const lpTokenCounts = {};
  pools.forEach(pool => {
    const lpToken = pool.lpToken.toLowerCase();
    if (!lpTokenCounts[lpToken]) {
      lpTokenCounts[lpToken] = [];
    }
    lpTokenCounts[lpToken].push(pool);
  });
  
  console.log("\n🔍 Analyzing pools for duplicates...");
  const duplicates = [];
  Object.entries(lpTokenCounts).forEach(([lpToken, poolList]) => {
    if (poolList.length > 1) {
      console.log(`Found ${poolList.length} pools for LP token: ${lpToken}`);
      // Keep the first one, mark others for removal
      for (let i = 1; i < poolList.length; i++) {
        duplicates.push(poolList[i]);
      }
    }
  });
  
  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }
  
  console.log(`\n🗑️  Found ${duplicates.length} duplicate pools to remove:`);
  duplicates.forEach(dup => {
    const pair = config.pairs.find(p => p.lpToken.toLowerCase() === dup.lpToken.toLowerCase());
    const poolName = pair ? pair.name : "Unknown";
    console.log(`  - Pool ${dup.index}: ${poolName} (${dup.lpToken})`);
  });
  
  // Remove duplicates (in reverse order to maintain indices)
  duplicates.sort((a, b) => b.index - a.index);
  
  console.log("\n🔄 Removing duplicate pools...");
  for (const dup of duplicates) {
    try {
      console.log(`Removing pool ${dup.index}...`);
      const removeTx = await farm.removePool(dup.index);
      await removeTx.wait();
      console.log(`✅ Pool ${dup.index} removed`);
    } catch (error) {
      console.log(`❌ Failed to remove pool ${dup.index}:`, error.message);
    }
  }
  
  // Check final pool count
  const finalPoolLength = await farm.poolLength();
  console.log(`\n📊 Final pools in farm: ${finalPoolLength}`);
  
  console.log("\n🌾 Remaining pools:");
  for (let i = 0; i < finalPoolLength; i++) {
    const poolInfo = await farm.poolInfo(i);
    const pair = config.pairs.find(p => p.lpToken.toLowerCase() === poolInfo.lpToken.toLowerCase());
    const poolName = pair ? pair.name : `Pool ${i}`;
    console.log(`  ${i}. ${poolName} - ${poolInfo.allocPoint} allocation points`);
  }

  console.log("\n✅ Duplicate cleanup complete!");
  console.log("🚀 The farming dashboard should now show each pool only once!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

