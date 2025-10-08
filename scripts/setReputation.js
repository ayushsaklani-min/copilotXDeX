const hre = require("hardhat");

async function main() {
  const reputationAddress = process.env.REPUTATION_ADDRESS || "0x07535D0f538689918901e53bC8ab25bb7ee66237";
  if (!reputationAddress) throw new Error("Missing REPUTATION_ADDRESS env var");

  const dexAddress = require("../src/config/contracts.json").dexAddress;
  if (!dexAddress) throw new Error("Missing dexAddress in contracts.json");

  const dex = await hre.ethers.getContractAt("TikTakDex", dexAddress);
  const tx = await dex.setReputationContract(reputationAddress);
  console.log("Setting reputation contract...", tx.hash);
  await tx.wait();
  console.log("Reputation set to", reputationAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


