const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🎮 Deploying GameFi System...\n");

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

  // Deploy XPRewards
  console.log("\n📝 Deploying XPRewards...");
  const XPRewards = await hre.ethers.getContractFactory("XPRewards");
  const xpRewards = await XPRewards.deploy(deployer.address);
  await xpRewards.waitForDeployment();
  const xpRewardsAddress = await xpRewards.getAddress();
  console.log("✅ XPRewards deployed to:", xpRewardsAddress);

  // Set reputation contract if exists
  if (deploymentData.reputation) {
    console.log("\n🔗 Setting Reputation contract in XPRewards...");
    const tx = await xpRewards.setReputationContract(deploymentData.reputation);
    await tx.wait();
    console.log("✅ Reputation contract set");
  }

  // Deploy Coinflip
  console.log("\n📝 Deploying Coinflip...");
  const Coinflip = await hre.ethers.getContractFactory("Coinflip");
  const coinflip = await Coinflip.deploy(deployer.address);
  await coinflip.waitForDeployment();
  const coinflipAddress = await coinflip.getAddress();
  console.log("✅ Coinflip deployed to:", coinflipAddress);

  // Set XPRewards in Coinflip
  console.log("\n🔗 Setting XPRewards in Coinflip...");
  let tx = await coinflip.setXPRewardsContract(xpRewardsAddress);
  await tx.wait();
  console.log("✅ XPRewards set in Coinflip");

  // Add Coinflip as game contract in XPRewards
  console.log("\n🔗 Adding Coinflip as game contract...");
  tx = await xpRewards.addGameContract(coinflipAddress);
  await tx.wait();
  console.log("✅ Coinflip added as game contract");

  // Fund Coinflip vault
  console.log("\n💰 Funding Coinflip vault with 1 MATIC...");
  tx = await coinflip.fundVault({ value: hre.ethers.parseEther("1.0") });
  await tx.wait();
  console.log("✅ Vault funded");

  // Update deployment data
  deploymentData.xpRewards = xpRewardsAddress;
  deploymentData.coinflip = coinflipAddress;
  deploymentData.gamesDeployedAt = new Date().toISOString();

  // Save deployment data
  fs.writeFileSync(
    "games-deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n✅ GameFi System Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("XPRewards:", xpRewardsAddress);
  console.log("Coinflip:", coinflipAddress);
  console.log("\n💾 Deployment data saved to games-deployment.json");

  // Verification instructions
  console.log("\n📝 To verify contracts on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${xpRewardsAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network amoy ${coinflipAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
