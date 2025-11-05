const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🎁 Deploying Referral System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Configuration:");
  console.log("- Reputation Address:", config.reputationAddress);
  console.log();

  // Deploy Referral contract
  console.log("📦 Deploying Referral contract...");
  
  const Referral = await hre.ethers.getContractFactory("Referral");
  const referral = await Referral.deploy(config.reputationAddress);
  await referral.waitForDeployment();
  
  const referralAddress = await referral.getAddress();
  console.log("✅ Referral deployed to:", referralAddress);

  // Bootstrap owner
  console.log("\n🔧 Bootstrapping owner...");
  const bootstrapTx = await referral.bootstrapOwner();
  await bootstrapTx.wait();
  console.log("✅ Owner bootstrapped");

  // Grant referral contract as reputation updater
  console.log("\n🔐 Granting referral contract as reputation updater...");
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = Reputation.attach(config.reputationAddress);
  const grantTx = await reputation.grantUpdater(referralAddress);
  await grantTx.wait();
  console.log("✅ Referral contract granted as reputation updater");

  // Update configuration
  const newConfig = {
    ...config,
    referralAddress: referralAddress,
  };

  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log("\n✅ Configuration updated");

  console.log("\n🎉 Referral System Deployment Complete!");
  console.log("\n📋 Summary:");
  console.log("- Referral Address:", referralAddress);
  console.log("- Reputation Address:", config.reputationAddress);

  console.log("\n🎁 Referral Rewards:");
  console.log("  - Direct Referral (Level 1): +10 XP for referrer");
  console.log("  - Indirect Referral (Level 2): +3 XP for level 2 referrer");
  console.log("  - New User Bonus: +5 XP for referee");

  console.log("\n📊 Requirements:");
  console.log("  - Minimum 10 XP to refer others");
  console.log("  - Must be registered to refer");

  console.log("\n✅ Users can now:");
  console.log("  1. Register with a referral code");
  console.log("  2. Generate their own referral link");
  console.log("  3. Earn XP for inviting friends");
  console.log("  4. Track their referral stats");

  console.log("\n🚀 Next: Visit /referrals page to start referring!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
