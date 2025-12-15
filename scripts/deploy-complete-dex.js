/**
 * Deploy Complete DEX System with LP Lock Integration
 * 1. Deploy WETH
 * 2. Deploy DEX Factory
 * 3. Deploy DEX Router
 * 4. Deploy BondingCurveFactoryV3 with full integration
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

const LIQUIDITY_CONTROLLER = "0x82d107d355380FC2f030F1DE172335d9C0C08944";

async function main() {
  console.log("🚀 Deploying Complete DEX System with LP Lock...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // 1. Deploy WETH
  console.log("📝 Step 1: Deploying WETH...");
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ WETH deployed to:", wethAddress);
  console.log();

  // 2. Deploy DEX Factory
  console.log("📝 Step 2: Deploying SimpleDEXFactory...");
  const SimpleDEXFactory = await ethers.getContractFactory("SimpleDEXFactory");
  const dexFactory = await SimpleDEXFactory.deploy();
  await dexFactory.waitForDeployment();
  const dexFactoryAddress = await dexFactory.getAddress();
  console.log("✅ SimpleDEXFactory deployed to:", dexFactoryAddress);
  console.log();

  // 3. Deploy DEX Router
  console.log("📝 Step 3: Deploying SimpleDEXRouter...");
  const SimpleDEXRouter = await ethers.getContractFactory("SimpleDEXRouter");
  const dexRouter = await SimpleDEXRouter.deploy(dexFactoryAddress, wethAddress);
  await dexRouter.waitForDeployment();
  const dexRouterAddress = await dexRouter.getAddress();
  console.log("✅ SimpleDEXRouter deployed to:", dexRouterAddress);
  console.log();

  // 4. Deploy BondingCurveFactoryV3 with full DEX integration
  console.log("📝 Step 4: Deploying BondingCurveFactoryV3 (Full Version)...");
  const BondingCurveFactoryV3 = await ethers.getContractFactory("BondingCurveFactoryV3");
  const bondingFactory = await BondingCurveFactoryV3.deploy(
    deployer.address,
    dexRouterAddress,
    LIQUIDITY_CONTROLLER
  );
  await bondingFactory.waitForDeployment();
  const bondingFactoryAddress = await bondingFactory.getAddress();
  console.log("✅ BondingCurveFactoryV3 deployed to:", bondingFactoryAddress);
  console.log();

  // Save deployment info
  const deployment = {
    network: "amoy",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      weth: wethAddress,
      dexFactory: dexFactoryAddress,
      dexRouter: dexRouterAddress,
      bondingCurveFactoryV3: bondingFactoryAddress,
      liquidityController: LIQUIDITY_CONTROLLER
    },
    features: [
      "✅ Custom DEX (Uniswap V2 style)",
      "✅ WETH/WMATIC wrapper",
      "✅ Bonding curve token creation",
      "✅ Automatic graduation at 100 MATIC TVL",
      "✅ Automatic DEX pair creation",
      "✅ Automatic liquidity addition",
      "✅ 80% LP token locking for 1 year",
      "✅ 20% LP tokens to creator",
      "✅ Full LP Lock integration"
    ],
    config: {
      graduationThreshold: "100 MATIC",
      lpLockDuration: "365 days (1 year)",
      lpLockPercentage: "80%",
      creatorLPShare: "20%",
      creationFee: "0.01 MATIC"
    }
  };

  fs.writeFileSync(
    "complete-dex-deployment.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("=" .repeat(60));
  console.log("🎉 COMPLETE DEX SYSTEM DEPLOYED!");
  console.log("=" .repeat(60));
  console.log("\n📋 Deployment Summary:");
  console.log("WETH:", wethAddress);
  console.log("DEX Factory:", dexFactoryAddress);
  console.log("DEX Router:", dexRouterAddress);
  console.log("BondingCurveFactoryV3:", bondingFactoryAddress);
  console.log("LiquidityController:", LIQUIDITY_CONTROLLER);
  console.log();
  console.log("💾 Deployment data saved to complete-dex-deployment.json\n");

  console.log("🎯 How It Works:");
  console.log("1. Create token with 0.01 MATIC");
  console.log("2. Users buy tokens on bonding curve");
  console.log("3. When TVL reaches 100 MATIC:");
  console.log("   → Automatically creates DEX pair");
  console.log("   → Adds all liquidity to DEX");
  console.log("   → Locks 80% of LP tokens for 1 year");
  console.log("   → Gives 20% LP tokens to creator");
  console.log("4. Token now trades on DEX with locked liquidity!");
  console.log();

  console.log("📝 Verification Commands:");
  console.log(`npx hardhat verify --network amoy ${wethAddress}`);
  console.log(`npx hardhat verify --network amoy ${dexFactoryAddress}`);
  console.log(`npx hardhat verify --network amoy ${dexRouterAddress} "${dexFactoryAddress}" "${wethAddress}"`);
  console.log(`npx hardhat verify --network amoy ${bondingFactoryAddress} "${deployer.address}" "${dexRouterAddress}" "${LIQUIDITY_CONTROLLER}"`);
  console.log();

  console.log("✅ LP LOCK FEATURE IS NOW 100% COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
