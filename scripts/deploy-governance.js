const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏛️ Deploying Governance System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- DEX Address:", config.dexAddress);
  console.log("- Reputation Address:", config.reputationAddress);
  console.log();

  // Step 1: Deploy GovernanceBadge
  console.log("📦 Step 1: Deploying GovernanceBadge contract...");
  const GovernanceBadge = await hre.ethers.getContractFactory("GovernanceBadge");
  const badge = await GovernanceBadge.deploy(
    config.reputationAddress,
    deployer.address
  );
  await badge.waitForDeployment();
  const badgeAddress = await badge.getAddress();
  console.log("✅ GovernanceBadge deployed to:", badgeAddress);

  // Step 2: Deploy Governance
  console.log("\n📦 Step 2: Deploying Governance contract...");
  const Governance = await hre.ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    badgeAddress,
    config.dexAddress,
    deployer.address
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // Step 3: Grant governance contract as updater to reputation (if needed)
  console.log("\n📦 Step 3: Setting up permissions...");
  try {
    const Reputation = await hre.ethers.getContractAt("Reputation", config.reputationAddress);
    // Note: Governance doesn't need to update reputation, badges check reputation directly
    console.log("✅ Permissions configured");
  } catch (err) {
    console.log("⚠️ Could not configure permissions:", err.message);
  }

  // Update config
  const updatedConfig = {
    ...config,
    badgeAddress: badgeAddress,
    governanceAddress: governanceAddress
  };

  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
  console.log("\n✅ Configuration updated in contracts.json");

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: config.network,
    chainId: config.chainId,
    badge: badgeAddress,
    governance: governanceAddress,
    deployer: deployer.address
  };

  const deploymentPath = path.join(__dirname, "../governance-deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to governance-deployment.json");

  console.log("\n🎉 Governance system deployed successfully!");
  console.log("\n📋 Summary:");
  console.log("- Badge Contract:", badgeAddress);
  console.log("- Governance Contract:", governanceAddress);
  console.log("\n💡 Next steps:");
  console.log("1. Users with 500+ XP (Diamond) or 1000+ XP (Crystal) can mint badges");
  console.log("2. Badge holders can create and vote on proposals");
  console.log("3. Visit /governance page to interact with the system");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


