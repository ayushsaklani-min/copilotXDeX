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
  console.log("🔍 Checking Reputation Setup...");
  console.log("Using signer:", deployer.address);
  console.log("");

  // Get contracts
  const dex = await hre.ethers.getContractAt("TikTakDex", dexAddress);
  const rep = await hre.ethers.getContractAt("Reputation", reputationAddress);
  const factory = await hre.ethers.getContractAt("TokenFactory", tokenFactoryAddress);

  console.log("📋 Contract Addresses:");
  console.log("  DEX:", dexAddress);
  console.log("  Reputation:", reputationAddress);
  console.log("  TokenFactory:", tokenFactoryAddress);
  console.log("");

  // Check if reputation contract is set in DEX
  console.log("1️⃣ Checking DEX Configuration:");
  const dexRepAddr = await dex.reputationContract();
  console.log("  DEX reputationContract:", dexRepAddr);
  if (dexRepAddr === hre.ethers.ZeroAddress) {
    console.log("  ❌ DEX reputation contract is NOT set!");
  } else if (dexRepAddr.toLowerCase() !== reputationAddress.toLowerCase()) {
    console.log("  ⚠️  DEX reputation contract mismatch!");
  } else {
    console.log("  ✅ DEX reputation contract is set correctly");
  }

  // Check if DEX is granted updater
  const dexIsUpdater = await rep.isUpdater(dexAddress);
  console.log("  DEX isUpdater:", dexIsUpdater);
  if (!dexIsUpdater) {
    console.log("  ❌ DEX is NOT granted updater permissions!");
  } else {
    console.log("  ✅ DEX has updater permissions");
  }
  console.log("");

  // Check if reputation contract is set in TokenFactory
  console.log("2️⃣ Checking TokenFactory Configuration:");
  const factoryRepAddr = await factory.reputationContract();
  console.log("  TokenFactory reputationContract:", factoryRepAddr);
  if (factoryRepAddr === hre.ethers.ZeroAddress) {
    console.log("  ❌ TokenFactory reputation contract is NOT set!");
  } else if (factoryRepAddr.toLowerCase() !== reputationAddress.toLowerCase()) {
    console.log("  ⚠️  TokenFactory reputation contract mismatch!");
  } else {
    console.log("  ✅ TokenFactory reputation contract is set correctly");
  }

  // Check if TokenFactory is granted updater
  const factoryIsUpdater = await rep.isUpdater(tokenFactoryAddress);
  console.log("  TokenFactory isUpdater:", factoryIsUpdater);
  if (!factoryIsUpdater) {
    console.log("  ❌ TokenFactory is NOT granted updater permissions!");
  } else {
    console.log("  ✅ TokenFactory has updater permissions");
  }
  console.log("");

  // Summary
  console.log("📊 Summary:");
  const issues = [];
  if (dexRepAddr === hre.ethers.ZeroAddress) issues.push("DEX reputation contract not set");
  if (!dexIsUpdater) issues.push("DEX not granted updater");
  if (factoryRepAddr === hre.ethers.ZeroAddress) issues.push("TokenFactory reputation contract not set");
  if (!factoryIsUpdater) issues.push("TokenFactory not granted updater");

  if (issues.length === 0) {
    console.log("  ✅ All reputation configurations are correct!");
  } else {
    console.log("  ❌ Issues found:");
    issues.forEach(issue => console.log("    -", issue));
    console.log("");
    console.log("🔧 To fix, run:");
    console.log("  node scripts/fix-reputation-setup.js");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

