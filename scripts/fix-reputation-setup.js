const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const cfgPath = path.join(__dirname, "..", "src", "config", "contracts.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  
  const dexAddress = cfg.dexAddress;
  const reputationAddress = cfg.reputationAddress;
  const tokenFactoryAddress = cfg.tokenFactoryAddress;
  
  if (!dexAddress || !reputationAddress || !tokenFactoryAddress) {
    throw new Error("Missing required addresses in config");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("🔧 Fixing Reputation Setup...");
  console.log("Using signer:", deployer.address);
  console.log("");

  // Get contracts
  const dex = await hre.ethers.getContractAt("TikTakDex", dexAddress);
  const rep = await hre.ethers.getContractAt("Reputation", reputationAddress);
  const factory = await hre.ethers.getContractAt("TokenFactory", tokenFactoryAddress);

  let fixed = false;

  // Fix DEX configuration
  console.log("1️⃣ Configuring DEX...");
  const dexRepAddr = await dex.reputationContract();
  if (dexRepAddr === hre.ethers.ZeroAddress) {
    console.log("  Setting reputation contract in DEX...");
    const tx = await dex.setReputationContract(reputationAddress);
    await tx.wait();
    console.log("  ✅ DEX reputation contract set");
    fixed = true;
  } else if (dexRepAddr.toLowerCase() !== reputationAddress.toLowerCase()) {
    console.log("  ⚠️  DEX reputation contract mismatch, updating...");
    const tx = await dex.setReputationContract(reputationAddress);
    await tx.wait();
    console.log("  ✅ DEX reputation contract updated");
    fixed = true;
  } else {
    console.log("  ✅ DEX reputation contract already set correctly");
  }

  const dexIsUpdater = await rep.isUpdater(dexAddress);
  if (!dexIsUpdater) {
    console.log("  Granting updater permissions to DEX...");
    const tx = await rep.grantUpdater(dexAddress);
    await tx.wait();
    console.log("  ✅ DEX granted updater permissions");
    fixed = true;
  } else {
    console.log("  ✅ DEX already has updater permissions");
  }
  console.log("");

  // Fix TokenFactory configuration
  console.log("2️⃣ Configuring TokenFactory...");
  const factoryRepAddr = await factory.reputationContract();
  if (factoryRepAddr === hre.ethers.ZeroAddress) {
    console.log("  Setting reputation contract in TokenFactory...");
    const tx = await factory.setReputationContract(reputationAddress);
    await tx.wait();
    console.log("  ✅ TokenFactory reputation contract set");
    fixed = true;
  } else if (factoryRepAddr.toLowerCase() !== reputationAddress.toLowerCase()) {
    console.log("  ⚠️  TokenFactory reputation contract mismatch, updating...");
    const tx = await factory.setReputationContract(reputationAddress);
    await tx.wait();
    console.log("  ✅ TokenFactory reputation contract updated");
    fixed = true;
  } else {
    console.log("  ✅ TokenFactory reputation contract already set correctly");
  }

  const factoryIsUpdater = await rep.isUpdater(tokenFactoryAddress);
  if (!factoryIsUpdater) {
    console.log("  Granting updater permissions to TokenFactory...");
    const tx = await rep.grantUpdater(tokenFactoryAddress);
    await tx.wait();
    console.log("  ✅ TokenFactory granted updater permissions");
    fixed = true;
  } else {
    console.log("  ✅ TokenFactory already has updater permissions");
  }
  console.log("");

  if (fixed) {
    console.log("✅ Reputation setup fixed successfully!");
    console.log("");
    console.log("📋 Verification:");
    console.log("  DEX reputationContract:", await dex.reputationContract());
    console.log("  DEX isUpdater:", await rep.isUpdater(dexAddress));
    console.log("  TokenFactory reputationContract:", await factory.reputationContract());
    console.log("  TokenFactory isUpdater:", await rep.isUpdater(tokenFactoryAddress));
  } else {
    console.log("✅ All reputation configurations are already correct!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

