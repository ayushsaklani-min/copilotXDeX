const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const cfgPath = path.join(__dirname, "..", "src", "config", "contracts.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  const repAddr = cfg.reputationAddress;
  const factoryAddr = cfg.tokenFactoryAddress;
  if (!repAddr || !factoryAddr) throw new Error("Missing reputationAddress or tokenFactoryAddress in config");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Linking TokenFactory with Reputation as", deployer.address);

  const factory = await hre.ethers.getContractAt("TokenFactory", factoryAddr);
  const rep = await hre.ethers.getContractAt("Reputation", repAddr);

  console.log("Granting updater to factory...");
  await (await rep.grantUpdater(factoryAddr)).wait();

  console.log("Setting reputation on factory...");
  await (await factory.setReputationContract(repAddr)).wait();

  console.log("✅ TokenFactory linked to Reputation.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
