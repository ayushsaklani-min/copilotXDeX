const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting TikTakDex deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get the contract factory
  const TikTakDex = await hre.ethers.getContractFactory("TikTakDex");

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
  const tikTakPairTx = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TAK);
  await tikTakPairTx.wait();
  const tikTakPairAddress = await tikTakDex.getPair(TOKENS.TIK, TOKENS.TAK);
  console.log("✅ TIK-TAK pair created at:", tikTakPairAddress);

  // TIK-TOE pair
  console.log("Creating TIK-TOE pair...");
  const tikToePairTx = await tikTakDex.createPair(TOKENS.TIK, TOKENS.TOE);
  await tikToePairTx.wait();
  const tikToePairAddress = await tikTakDex.getPair(TOKENS.TIK, TOKENS.TOE);
  console.log("✅ TIK-TOE pair created at:", tikToePairAddress);

  // TAK-TOE pair
  console.log("Creating TAK-TOE pair...");
  const takToePairTx = await tikTakDex.createPair(TOKENS.TAK, TOKENS.TOE);
  await takToePairTx.wait();
  const takToePairAddress = await tikTakDex.getPair(TOKENS.TAK, TOKENS.TOE);
  console.log("✅ TAK-TOE pair created at:", takToePairAddress);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log(`   DEX Contract: ${dexAddress}`);
  console.log(`   TIK-TAK Pair: ${tikTakPairAddress}`);
  console.log(`   TIK-TOE Pair: ${tikToePairAddress}`);
  console.log(`   TAK-TOE Pair: ${takToePairAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
