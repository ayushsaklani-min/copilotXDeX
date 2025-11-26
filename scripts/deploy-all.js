const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 COPILOTXDEX 2.0 - COMPLETE DEPLOYMENT\n");
  console.log("=" .repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // Phase 1: Core Contracts
  console.log("\n📦 PHASE 1: Deploying Core Contracts...\n");
  
  // Deploy Reputation (if not exists)
  let reputationAddress = "0xf77AA837587dc07FE822C5CB0B3D5BF5294CaB42"; // Existing
  console.log("✅ Reputation (existing):", reputationAddress);
  deploymentData.contracts.reputation = reputationAddress;

  // Phase 2: Bonding Curve System
  console.log("\n📦 PHASE 2: Deploying Bonding Curve System...\n");
  
  const BondingCurveFactory = await hre.ethers.getContractFactory("BondingCurveFactory");
  const bondingFactory = await BondingCurveFactory.deploy(deployer.address);
  await bondingFactory.waitForDeployment();
  const bondingFactoryAddress = await bondingFactory.getAddress();
  console.log("✅ BondingCurveFactory:", bondingFactoryAddress);
  deploymentData.contracts.bondingCurveFactory = bondingFactoryAddress;

  // Set reputation
  await bondingFactory.setReputationContract(reputationAddress);
  console.log("   🔗 Reputation contract set");

  // Phase 3: Security Suite
  console.log("\n📦 PHASE 3: Deploying Security Suite...\n");
  
  const LiquidityController = await hre.ethers.getContractFactory("LiquidityController");
  const liquidityController = await LiquidityController.deploy(deployer.address);
  await liquidityController.waitForDeployment();
  const liquidityControllerAddress = await liquidityController.getAddress();
  console.log("✅ LiquidityController:", liquidityControllerAddress);
  deploymentData.contracts.liquidityController = liquidityControllerAddress;

  const RugScanner = await hre.ethers.getContractFactory("RugScanner");
  const rugScanner = await RugScanner.deploy(deployer.address);
  await rugScanner.waitForDeployment();
  const rugScannerAddress = await rugScanner.getAddress();
  console.log("✅ RugScanner:", rugScannerAddress);
  deploymentData.contracts.rugScanner = rugScannerAddress;

  await rugScanner.setLiquidityController(liquidityControllerAddress);
  console.log("   🔗 LiquidityController set in RugScanner");

  // Phase 4: Social Graph
  console.log("\n📦 PHASE 4: Deploying Social Graph...\n");
  
  const SocialGraph = await hre.ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraph.deploy(deployer.address);
  await socialGraph.waitForDeployment();
  const socialGraphAddress = await socialGraph.getAddress();
  console.log("✅ SocialGraph:", socialGraphAddress);
  deploymentData.contracts.socialGraph = socialGraphAddress;

  await bondingFactory.setSocialGraphContract(socialGraphAddress);
  console.log("   🔗 SocialGraph set in BondingCurveFactory");

  // Phase 5: GameFi System
  console.log("\n📦 PHASE 5: Deploying GameFi System...\n");
  
  const XPRewards = await hre.ethers.getContractFactory("XPRewards");
  const xpRewards = await XPRewards.deploy(deployer.address);
  await xpRewards.waitForDeployment();
  const xpRewardsAddress = await xpRewards.getAddress();
  console.log("✅ XPRewards:", xpRewardsAddress);
  deploymentData.contracts.xpRewards = xpRewardsAddress;

  await xpRewards.setReputationContract(reputationAddress);
  console.log("   🔗 Reputation set in XPRewards");

  const Coinflip = await hre.ethers.getContractFactory("Coinflip");
  const coinflip = await Coinflip.deploy(deployer.address);
  await coinflip.waitForDeployment();
  const coinflipAddress = await coinflip.getAddress();
  console.log("✅ Coinflip:", coinflipAddress);
  deploymentData.contracts.coinflip = coinflipAddress;

  await coinflip.setXPRewardsContract(xpRewardsAddress);
  await xpRewards.addGameContract(coinflipAddress);
  console.log("   🔗 Coinflip integrated with XPRewards");

  const Mines = await hre.ethers.getContractFactory("Mines");
  const mines = await Mines.deploy(deployer.address);
  await mines.waitForDeployment();
  const minesAddress = await mines.getAddress();
  console.log("✅ Mines:", minesAddress);
  deploymentData.contracts.mines = minesAddress;

  await mines.setXPRewardsContract(xpRewardsAddress);
  await xpRewards.addGameContract(minesAddress);
  console.log("   🔗 Mines integrated with XPRewards");

  const MemeRoyale = await hre.ethers.getContractFactory("MemeRoyale");
  const memeRoyale = await MemeRoyale.deploy(deployer.address);
  await memeRoyale.waitForDeployment();
  const memeRoyaleAddress = await memeRoyale.getAddress();
  console.log("✅ MemeRoyale:", memeRoyaleAddress);
  deploymentData.contracts.memeRoyale = memeRoyaleAddress;

  await memeRoyale.setXPRewardsContract(xpRewardsAddress);
  await xpRewards.addGameContract(memeRoyaleAddress);
  console.log("   🔗 MemeRoyale integrated with XPRewards");

  const PredictThePrice = await hre.ethers.getContractFactory("PredictThePrice");
  const predictPrice = await PredictThePrice.deploy(deployer.address);
  await predictPrice.waitForDeployment();
  const predictPriceAddress = await predictPrice.getAddress();
  console.log("✅ PredictThePrice:", predictPriceAddress);
  deploymentData.contracts.predictThePrice = predictPriceAddress;

  await predictPrice.setXPRewardsContract(xpRewardsAddress);
  await xpRewards.addGameContract(predictPriceAddress);
  console.log("   🔗 PredictThePrice integrated with XPRewards");

  // Fund game vaults
  console.log("\n💰 Funding Game Vaults...");
  await coinflip.fundVault({ value: hre.ethers.parseEther("1.0") });
  await mines.fundVault({ value: hre.ethers.parseEther("1.0") });
  console.log("   ✅ Vaults funded with 1 MATIC each");

  // Save deployment data
  fs.writeFileSync(
    "deployment-complete.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log("\n🎉 DEPLOYMENT COMPLETE!\n");
  console.log("📋 Summary:");
  console.log("   • BondingCurveFactory:", bondingFactoryAddress);
  console.log("   • LiquidityController:", liquidityControllerAddress);
  console.log("   • RugScanner:", rugScannerAddress);
  console.log("   • SocialGraph:", socialGraphAddress);
  console.log("   • XPRewards:", xpRewardsAddress);
  console.log("   • Coinflip:", coinflipAddress);
  console.log("   • Mines:", minesAddress);
  console.log("   • MemeRoyale:", memeRoyaleAddress);
  console.log("   • PredictThePrice:", predictPriceAddress);
  console.log("\n💾 Deployment data saved to: deployment-complete.json");
  console.log("\n✅ All systems integrated and ready!");
  console.log("\n🚀 Next steps:");
  console.log("   1. Update src/config/contracts-v2.ts with addresses");
  console.log("   2. Verify contracts on PolygonScan");
  console.log("   3. Test all features");
  console.log("   4. Launch frontend: npm run dev");
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
