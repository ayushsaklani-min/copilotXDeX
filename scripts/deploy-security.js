const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔐 Deploying Security Suite...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Load existing deployment data
  let deploymentData = {};
  try {
    deploymentData = JSON.parse(fs.readFileSync("deploy-report.json", "utf8"));
  } catch (error) {
    console.log("No existing deployment data found, creating new...");
  }

  // Deploy LiquidityController
  console.log("\n📝 Deploying LiquidityController...");
  const LiquidityController = await hre.ethers.getContractFactory("LiquidityController");
  const liquidityController = await LiquidityController.deploy(deployer.address);
  await liquidityController.waitForDeployment();
  const liquidityControllerAddress = await liquidityController.getAddress();
  console.log("✅ LiquidityController deployed to:", liquidityControllerAddress);

  // Deploy RugScanner
  console.log("\n📝 Deploying RugScanner...");
  const RugScanner = await hre.ethers.getContractFactory("RugScanner");
  const rugScanner = await RugScanner.deploy(deployer.address);
  await rugScanner.waitForDeployment();
  const rugScannerAddress = await rugScanner.getAddress();
  console.log("✅ RugScanner deployed to:", rugScannerAddress);

  // Set LiquidityController in RugScanner
  console.log("\n🔗 Connecting RugScanner to LiquidityController...");
  const tx = await rugScanner.setLiquidityController(liquidityControllerAddress);
  await tx.wait();
  console.log("✅ LiquidityController set in RugScanner");

  // Update deployment data
  deploymentData.liquidityController = liquidityControllerAddress;
  deploymentData.rugScanner = rugScannerAddress;
  deploymentData.securityDeployedAt = new Date().toISOString();

  // Save deployment data
  fs.writeFileSync(
    "security-deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n✅ Security Suite Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("LiquidityController:", liquidityControllerAddress);
  console.log("RugScanner:", rugScannerAddress);
  console.log("\n💾 Deployment data saved to security-deployment.json");

  // Verification instructions
  console.log("\n📝 To verify contracts on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${liquidityControllerAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network amoy ${rugScannerAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
