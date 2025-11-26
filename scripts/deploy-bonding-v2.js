const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Bonding Curve Factory V2...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy BondingCurveFactoryV2
  console.log("\n📝 Deploying BondingCurveFactoryV2...");
  const BondingCurveFactoryV2 = await hre.ethers.getContractFactory("BondingCurveFactoryV2");
  const bondingFactory = await BondingCurveFactoryV2.deploy(deployer.address);
  await bondingFactory.waitForDeployment();
  const bondingFactoryAddress = await bondingFactory.getAddress();
  console.log("✅ BondingCurveFactoryV2 deployed to:", bondingFactoryAddress);

  // Set reputation contract
  const reputationAddress = "0xf77AA837587dc07FE822C5CB0B3D5BF5294CaB42";
  console.log("\n🔗 Setting Reputation contract...");
  const tx = await bondingFactory.setReputationContract(reputationAddress);
  await tx.wait();
  console.log("✅ Reputation contract set");

  // Set social graph if exists
  try {
    const socialData = JSON.parse(fs.readFileSync("social-deployment.json", "utf8"));
    if (socialData.socialGraph) {
      console.log("\n🔗 Setting SocialGraph contract...");
      const tx2 = await bondingFactory.setSocialGraphContract(socialData.socialGraph);
      await tx2.wait();
      console.log("✅ SocialGraph contract set");
    }
  } catch (error) {
    console.log("⚠️  SocialGraph not found, skipping...");
  }

  // Save deployment data
  const deploymentData = {
    bondingCurveFactoryV2: bondingFactoryAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    network: hre.network.name,
  };

  fs.writeFileSync(
    "bonding-v2-deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n✅ Bonding Curve Factory V2 Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("BondingCurveFactoryV2:", bondingFactoryAddress);
  console.log("\n💾 Deployment data saved to bonding-v2-deployment.json");

  console.log("\n📝 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${bondingFactoryAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
