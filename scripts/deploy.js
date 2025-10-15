const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting TikTakDex deployment...");

  // Get the contract factories
  const TikTakDex = await hre.ethers.getContractFactory("TikTakDex");
  const TikTakLP = await hre.ethers.getContractFactory("TikTakLP");
  const Reputation = await hre.ethers.getContractFactory("Reputation");

  // Deploy TikTakDex
  console.log("📦 Deploying TikTakDex contract...");
  const tikTakDex = await TikTakDex.deploy();
  await tikTakDex.waitForDeployment();
  const dexAddress = await tikTakDex.getAddress();
  console.log("✅ TikTakDex deployed to:", dexAddress);

  // Deploy Reputation
  console.log("📦 Deploying Reputation contract...");
  const [deployer] = await hre.ethers.getSigners();
  const reputation = await Reputation.deploy(deployer.address);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ Reputation deployed to:", reputationAddress);

  // Grant updater to DEX and set reputation in DEX
  console.log("🔐 Granting DEX updater role in Reputation...");
  await (await reputation.grantUpdater(dexAddress)).wait();
  console.log("🔧 Setting reputation contract in DEX...");
  await (await tikTakDex.setReputationContract(reputationAddress)).wait();

  // Token addresses on Polygon Amoy
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Add supported tokens first (required by createPair)
  console.log("🧩 Adding supported tokens...");
  await (await tikTakDex.addSupportedTokens(Object.values(TOKENS))).wait();
  console.log("✅ Supported tokens added");

  // Create trading pairs
  console.log("🔧 Creating trading pairs...");
  
  // TIK-TAK pair
  console.log("Creating TIK-TAK pair...");
  const tikTakPairTx = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TAK);
  await tikTakPairTx.wait();
  const tikTakKey = await tikTakDex.getPairKey(TOKENS.TIK, TOKENS.TAK);
  const tikTakPair = await tikTakDex.getPair(tikTakKey);
  console.log("✅ TIK-TAK LP token:", tikTakPair.lpToken);

  // TIK-TOE pair
  console.log("Creating TIK-TOE pair...");
  const tikToePairTx = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TOE);
  await tikToePairTx.wait();
  const tikToeKey = await tikTakDex.getPairKey(TOKENS.TIK, TOKENS.TOE);
  const tikToePair = await tikTakDex.getPair(tikToeKey);
  console.log("✅ TIK-TOE LP token:", tikToePair.lpToken);

  // TAK-TOE pair
  console.log("Creating TAK-TOE pair...");
  const takToePairTx = await tikTakDex.createPair(TOKENS.TAK, TOKENS.TOE);
  await takToePairTx.wait();
  const takToeKey = await tikTakDex.getPairKey(TOKENS.TAK, TOKENS.TOE);
  const takToePair = await tikTakDex.getPair(takToeKey);
  console.log("✅ TAK-TOE LP token:", takToePair.lpToken);

  // Get contract ABIs
  const dexAbi = TikTakDex.interface.format(); // human-readable ABI (string[])
  const lpAbi = TikTakLP.interface.format();

  // Create contracts configuration
  const contractsConfig = {
    network: "polygon-amoy",
    chainId: 80002,
    dexAddress: dexAddress,
    reputationAddress: reputationAddress,
    tokens: TOKENS,
    pairs: [
      { name: "TIK-TAK", token0: TOKENS.TIK, token1: TOKENS.TAK, pairKey: tikTakKey, lpToken: tikTakPair.lpToken },
      { name: "TIK-TOE", token0: TOKENS.TIK, token1: TOKENS.TOE, pairKey: tikToeKey, lpToken: tikToePair.lpToken },
      { name: "TAK-TOE", token0: TOKENS.TAK, token1: TOKENS.TOE, pairKey: takToeKey, lpToken: takToePair.lpToken },
    ],
    abis: {
      TikTakDex: dexAbi,
      TikTakLP: lpAbi,
    },
    deployment: {
      timestamp: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber(),
      transactionHash: tikTakPairTx.hash,
    },
  };

  // Save configuration to src/config/contracts.json
  const configPath = path.join(__dirname, "..", "src", "config", "contracts.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(contractsConfig, null, 2));
  console.log("✅ Contract configuration saved to src/config/contracts.json");

  // Generate deployment report
  const deployReport = {
    timestamp: new Date().toISOString(),
    network: "polygon-amoy",
    chainId: 80002,
    contracts: {
      TikTakDex: dexAddress,
      Reputation: reputationAddress,
      "TIK-TAK_LP": tikTakPair.lpToken,
      "TIK-TOE_LP": tikToePair.lpToken,
      "TAK-TOE_LP": takToePair.lpToken,
    },
    tokens: TOKENS,
    explorer: "https://amoy.polygonscan.com/",
  };

  const reportPath = path.join(__dirname, "..", "deploy-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(deployReport, null, 2));
  console.log("✅ Deployment report saved to deploy-report.json");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log(`   DEX Contract: ${dexAddress}`);
  console.log(`   Reputation: ${reputationAddress}`);
  console.log(`   TIK-TAK LP: ${tikTakPair.lpToken}`);
  console.log(`   TIK-TOE LP: ${tikToePair.lpToken}`);
  console.log(`   TAK-TOE LP: ${takToePair.lpToken}`);
  console.log("\n🌐 View on explorer:");
  console.log(`   https://amoy.polygonscan.com/address/${dexAddress}`);
  console.log(`   https://amoy.polygonscan.com/address/${reputationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });