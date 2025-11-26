const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("💬 Deploying Social Graph System...\n");

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

  // Deploy SocialGraph
  console.log("\n📝 Deploying SocialGraph...");
  const SocialGraph = await hre.ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraph.deploy(deployer.address);
  await socialGraph.waitForDeployment();
  const socialGraphAddress = await socialGraph.getAddress();
  console.log("✅ SocialGraph deployed to:", socialGraphAddress);

  // Update BondingCurveFactory if exists
  if (deploymentData.bondingCurveFactory) {
    console.log("\n🔗 Setting SocialGraph in BondingCurveFactory...");
    const BondingCurveFactory = await hre.ethers.getContractFactory("BondingCurveFactory");
    const factory = BondingCurveFactory.attach(deploymentData.bondingCurveFactory);
    const tx = await factory.setSocialGraphContract(socialGraphAddress);
    await tx.wait();
    console.log("✅ SocialGraph set in BondingCurveFactory");
  }

  // Update deployment data
  deploymentData.socialGraph = socialGraphAddress;
  deploymentData.socialDeployedAt = new Date().toISOString();

  // Save deployment data
  fs.writeFileSync(
    "social-deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n✅ Social Graph Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("SocialGraph:", socialGraphAddress);
  console.log("\n💾 Deployment data saved to social-deployment.json");

  // Verification instructions
  console.log("\n📝 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${socialGraphAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
