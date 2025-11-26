const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Bonding Curve System...\n");

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

  // Deploy BondingCurveFactory
  console.log("\n📝 Deploying BondingCurveFactory...");
  const BondingCurveFactory = await hre.ethers.getContractFactory("BondingCurveFactory");
  const bondingFactory = await BondingCurveFactory.deploy(deployer.address);
  await bondingFactory.waitForDeployment();
  const bondingFactoryAddress = await bondingFactory.getAddress();
  console.log("✅ BondingCurveFactory deployed to:", bondingFactoryAddress);

  // Set reputation contract if exists
  if (deploymentData.reputation) {
    console.log("\n🔗 Setting Reputation contract...");
    const tx = await bondingFactory.setReputationContract(deploymentData.reputation);
    await tx.wait();
    console.log("✅ Reputation contract set");
  }

  // Update deployment data
  deploymentData.bondingCurveFactory = bondingFactoryAddress;
  deploymentData.bondingCurveFactoryDeployedAt = new Date().toISOString();

  // Save deployment data
  fs.writeFileSync(
    "bonding-deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n✅ Bonding Curve System Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("BondingCurveFactory:", bondingFactoryAddress);
  console.log("\n💾 Deployment data saved to bonding-deployment.json");

  // Verification instructions
  console.log("\n📝 To verify contracts on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${bondingFactoryAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
