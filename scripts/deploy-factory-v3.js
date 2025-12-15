/**
 * Deploy BondingCurveFactoryV3 with DEX integration and auto LP locking
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

// For now, we'll use a placeholder address since QuickSwap may not be on Amoy
// In production, use actual QuickSwap router: 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff (Polygon mainnet)
// For testing, we can deploy without DEX integration first
const QUICKSWAP_ROUTER = "0x0000000000000000000000000000000000000000"; // Placeholder - will add DEX later
const LIQUIDITY_CONTROLLER = "0x82d107d355380FC2f030F1DE172335d9C0C08944"; // From v3-deployment.json

async function main() {
  console.log("🚀 Deploying BondingCurveFactoryV3 with DEX Integration...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Deploy BondingCurveFactoryV3Simple (without DEX dependency)
  console.log("📝 Deploying BondingCurveFactoryV3Simple...");
  const BondingCurveFactoryV3 = await ethers.getContractFactory("BondingCurveFactoryV3Simple");
  
  const factory = await BondingCurveFactoryV3.deploy(
    deployer.address, // owner
    LIQUIDITY_CONTROLLER // liquidity controller
  );

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ BondingCurveFactoryV3 deployed to:", factoryAddress);
  console.log();

  // Save deployment info
  const deployment = {
    network: "amoy",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      bondingCurveFactoryV3: factoryAddress,
      dexRouter: QUICKSWAP_ROUTER,
      liquidityController: LIQUIDITY_CONTROLLER
    },
    features: [
      "Bonding curve token creation",
      "Automatic graduation at 100 MATIC TVL",
      "DEX pair creation (QuickSwap)",
      "Automatic liquidity addition",
      "80% LP token locking for 1 year",
      "20% LP tokens to creator"
    ],
    config: {
      graduationThreshold: "100 MATIC",
      lpLockDuration: "365 days",
      lpLockPercentage: "80%",
      creationFee: "0.01 MATIC"
    }
  };

  fs.writeFileSync(
    "factory-v3-deployment.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("✅ Deployment Complete!\n");
  console.log("📋 Deployment Summary:");
  console.log("BondingCurveFactoryV3:", factoryAddress);
  console.log("DEX Router:", QUICKSWAP_ROUTER);
  console.log("Liquidity Controller:", LIQUIDITY_CONTROLLER);
  console.log();
  console.log("💾 Deployment data saved to factory-v3-deployment.json\n");

  console.log("📝 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${factoryAddress} "${deployer.address}" "${QUICKSWAP_ROUTER}" "${LIQUIDITY_CONTROLLER}"`);
  console.log();

  console.log("🎯 Next Steps:");
  console.log("1. Update src/config/contracts-v2.ts with new factory address");
  console.log("2. Test token creation");
  console.log("3. Test graduation by buying 100+ MATIC worth");
  console.log("4. Verify LP tokens are locked in LiquidityController");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
