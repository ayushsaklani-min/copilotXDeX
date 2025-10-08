const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TokenFactory with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("TokenFactory");
  const fee = await deployer.provider.getFeeData();
  const gasPrice = hre.ethers.parseUnits('150', 'gwei');

  // Try to replace the last pending nonce if there is one
  const latestNonce = await deployer.getNonce(); // latest mined nonce (next to use if none pending)
  const pendingNonce = await deployer.provider.getTransactionCount(deployer.address, 'pending');
  const hasPending = pendingNonce > latestNonce;
  const nonceToUse = hasPending ? pendingNonce - 1 : latestNonce;

  const factory = await Factory.deploy({ gasPrice, nonce: nonceToUse });
  const deploymentTx = factory.deploymentTransaction();
  if (deploymentTx && deploymentTx.hash) {
    console.log("Deployment tx:", deploymentTx.hash);
  }
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("TokenFactory deployed at:", address);
  // Write to config file to help the frontend
  try {
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(__dirname, '..', 'src', 'config', 'contracts.json');
    const exists = fs.existsSync(cfgPath);
    if (exists) {
      const json = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      json.tokenFactoryAddress = address;
      fs.writeFileSync(cfgPath, JSON.stringify(json, null, 2));
      console.log('Updated src/config/contracts.json with tokenFactoryAddress');
    }
    fs.writeFileSync(path.join(__dirname, '..', 'deploy-factory.json'), JSON.stringify({ address }, null, 2));
  } catch (e) {
    console.warn('Could not update config automatically:', e.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


