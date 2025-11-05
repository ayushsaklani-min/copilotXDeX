const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Redeploying TikTakDex with reputation fix...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  // Load existing configuration
  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log("📋 Existing Configuration:");
  console.log("- Old DEX Address:", config.dexAddress);
  console.log("- Reputation Address:", config.reputationAddress);
  console.log("- Token Factory Address:", config.tokenFactoryAddress);
  console.log("- Tokens:", config.tokens);
  console.log();

  // Deploy new TikTakDex
  console.log("📦 Deploying TikTakDex...");
  const TikTakDex = await hre.ethers.getContractFactory("TikTakDex");
  const tikTakDex = await TikTakDex.deploy();
  await tikTakDex.waitForDeployment();
  const dexAddress = await tikTakDex.getAddress();
  console.log("✅ TikTakDex deployed to:", dexAddress);

  // Set reputation contract
  console.log("\n🔗 Setting reputation contract...");
  const setRepTx = await tikTakDex.setReputationContract(config.reputationAddress);
  await setRepTx.wait();
  console.log("✅ Reputation contract set");

  // Add supported tokens
  console.log("\n🪙 Adding supported tokens...");
  const tokenAddresses = Object.values(config.tokens);
  const addTokensTx = await tikTakDex.addSupportedTokens(tokenAddresses);
  await addTokensTx.wait();
  console.log("✅ Tokens added:", Object.keys(config.tokens).join(", "));

  // Create pairs
  console.log("\n🔄 Creating trading pairs...");
  const pairs = [];
  
  // TIK-TAK
  console.log("Creating TIK-TAK pair...");
  const tikTakTx = await tikTakDex.createPair(config.tokens.TIK, config.tokens.TAK);
  const tikTakReceipt = await tikTakTx.wait();
  const tikTakPairKey = hre.ethers.keccak256(
    hre.ethers.solidityPacked(["address", "address"], [config.tokens.TIK, config.tokens.TAK])
  );
  const tikTakPair = await tikTakDex.pairs(tikTakPairKey);
  pairs.push({
    name: "TIK-TAK",
    token0: config.tokens.TIK,
    token1: config.tokens.TAK,
    pairKey: tikTakPairKey,
    lpToken: tikTakPair.lpToken
  });
  console.log("✅ TIK-TAK pair created, LP Token:", tikTakPair.lpToken);

  // TIK-TOE
  console.log("Creating TIK-TOE pair...");
  const tikToeTx = await tikTakDex.createPair(config.tokens.TIK, config.tokens.TOE);
  await tikToeTx.wait();
  const tikToePairKey = hre.ethers.keccak256(
    hre.ethers.solidityPacked(["address", "address"], [config.tokens.TIK, config.tokens.TOE])
  );
  const tikToePair = await tikTakDex.pairs(tikToePairKey);
  pairs.push({
    name: "TIK-TOE",
    token0: config.tokens.TIK,
    token1: config.tokens.TOE,
    pairKey: tikToePairKey,
    lpToken: tikToePair.lpToken
  });
  console.log("✅ TIK-TOE pair created, LP Token:", tikToePair.lpToken);

  // TAK-TOE
  console.log("Creating TAK-TOE pair...");
  const takToeTx = await tikTakDex.createPair(config.tokens.TAK, config.tokens.TOE);
  await takToeTx.wait();
  const takToePairKey = hre.ethers.keccak256(
    hre.ethers.solidityPacked(["address", "address"], [config.tokens.TAK, config.tokens.TOE])
  );
  const takToePair = await tikTakDex.pairs(takToePairKey);
  pairs.push({
    name: "TAK-TOE",
    token0: config.tokens.TAK,
    token1: config.tokens.TOE,
    pairKey: takToePairKey,
    lpToken: takToePair.lpToken
  });
  console.log("✅ TAK-TOE pair created, LP Token:", takToePair.lpToken);

  // Grant DEX as updater in Reputation contract
  console.log("\n🔐 Granting DEX as reputation updater...");
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = Reputation.attach(config.reputationAddress);
  const grantTx = await reputation.grantUpdater(dexAddress);
  await grantTx.wait();
  console.log("✅ DEX granted as reputation updater");

  // Update configuration
  const newConfig = {
    ...config,
    dexAddress: dexAddress,
    pairs: pairs,
    deployment: {
      timestamp: new Date().toISOString(),
      blockNumber: tikTakReceipt.blockNumber,
      transactionHash: tikTakReceipt.hash
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log("\n✅ Configuration updated at:", configPath);

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📋 Summary:");
  console.log("- New DEX Address:", dexAddress);
  console.log("- Reputation Address:", config.reputationAddress);
  console.log("- Token Factory Address:", config.tokenFactoryAddress);
  console.log("\n🔄 Trading Pairs:");
  pairs.forEach(pair => {
    console.log(`  - ${pair.name}: ${pair.lpToken}`);
  });

  console.log("\n⚠️  IMPORTANT: You need to add liquidity to the pools before swapping!");
  console.log("Run: npx hardhat run scripts/add-liquidity-correct.js --network amoy");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
