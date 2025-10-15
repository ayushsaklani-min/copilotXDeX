const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const cfgPath = path.join(__dirname, "..", "src", "config", "contracts.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  const dexAddress = cfg.dexAddress;
  const reputationAddress = process.env.REPUTATION_ADDRESS || cfg.reputationAddress;
  if (!dexAddress || !reputationAddress) throw new Error("Missing dexAddress or reputationAddress in config/env");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using signer:", deployer.address);

  const dex = await hre.ethers.getContractAt("TikTakDex", dexAddress);
  const rep = await hre.ethers.getContractAt("Reputation", reputationAddress);

  console.log("Granting updater to DEX...", dexAddress);
  try {
    const txGrant = await rep.grantUpdater(dexAddress);
    console.log("grantUpdater tx:", txGrant.hash);
    await txGrant.wait();
  } catch (e) {
    console.warn("grantUpdater may have failed or already granted", e?.reason || e?.message || e);
  }

  console.log("Setting reputation contract in DEX...", reputationAddress);
  const tx = await dex.setReputationContract(reputationAddress);
  console.log("setReputationContract tx:", tx.hash);
  await tx.wait();
  console.log("Reputation set to", reputationAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


