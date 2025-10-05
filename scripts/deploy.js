const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting TikTakDex deployment...");

  // Get the contract factories
  const TikTakDex = await hre.ethers.getContractFactory("TikTakDex");
  const TikTakLP = await hre.ethers.getContractFactory("TikTakLP");

  // Deploy TikTakDex
  console.log("📦 Deploying TikTakDex contract...");
  const tikTakDex = await TikTakDex.deploy();
  await tikTakDex.waitForDeployment();
  const dexAddress = await tikTakDex.getAddress();
  console.log("✅ TikTakDex deployed to:", dexAddress);

  // Token addresses on Polygon Amoy
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Create trading pairs
  console.log("🔧 Creating trading pairs...");
  
  // TIK-TAK pair
  console.log("Creating TIK-TAK pair...");
  const tikTakPair = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TAK);
  await tikTakPair.wait();
  const tikTakPairAddress = await tikTakDex.getPair(TOKENS.TIK, TOKENS.TAK);
  console.log("✅ TIK-TAK pair created at:", tikTakPairAddress);

  // TIK-TOE pair
  console.log("Creating TIK-TOE pair...");
  const tikToePair = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TOE);
  await tikToePair.wait();
  const tikToePairAddress = await tikTakDex.getPair(TOKENS.TIK, TOKENS.TOE);
  console.log("✅ TIK-TOE pair created at:", tikToePairAddress);

  // TAK-TOE pair
  console.log("Creating TAK-TOE pair...");
  const takToePair = await tikTakDex.createPair(TOKENS.TAK, TOKENS.TOE);
  await takToePair.wait();
  const takToePairAddress = await tikTakDex.getPair(TOKENS.TAK, TOKENS.TOE);
  console.log("✅ TAK-TOE pair created at:", takToePairAddress);

  // Get contract ABIs
  const dexAbi = TikTakDex.interface.format("json");
  const lpAbi = TikTakLP.interface.format("json");

  // Create contracts configuration
  const contractsConfig = {
    network: "polygon-amoy",
    chainId: 80002,
    dexAddress: dexAddress,
    tokens: TOKENS,
    pairs: {
      "TIK-TAK": tikTakPairAddress,
      "TIK-TOE": tikToePairAddress,
      "TAK-TOE": takToePairAddress,
    },
    abis: {
      TikTakDex: JSON.parse(dexAbi),
      TikTakLP: JSON.parse(lpAbi),
    },
    deployment: {
      timestamp: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber(),
      transactionHash: tikTakPair.hash,
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
      "TIK-TAK_Pair": tikTakPairAddress,
      "TIK-TOE_Pair": tikToePairAddress,
      "TAK-TOE_Pair": takToePairAddress,
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
  console.log(`   TIK-TAK Pair: ${tikTakPairAddress}`);
  console.log(`   TIK-TOE Pair: ${tikToePairAddress}`);
  console.log(`   TAK-TOE Pair: ${takToePairAddress}`);
  console.log("\n🌐 View on explorer:");
  console.log(`   https://amoy.polygonscan.com/address/${dexAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });