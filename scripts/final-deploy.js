const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting TikTakDex deployment...");

  // Use hardcoded values for now
  const RPC_URL = "https://rpc-amoy.polygon.technology/";
  const PRIVATE_KEY = "0x8bc6df0ad6520901a4e6583847e11d9b139e1120f755b4750ae39b2de3bb7a3b";

  // Create provider and wallet manually
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Deploying with account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");
  
  if (balance === 0n) {
    console.log("❌ No MATIC balance for gas fees");
    console.log("Please get test MATIC from: https://faucet.polygon.technology/");
    return;
  }

  // Get the contract factory
  const TikTakDex = await ethers.getContractFactory("TikTakDex");
  const tikTakDex = TikTakDex.connect(wallet);

  // Deploy TikTakDex
  console.log("📦 Deploying TikTakDex contract...");
  const tikTakDexDeploy = await tikTakDex.deploy();
  await tikTakDexDeploy.waitForDeployment();
  const dexAddress = await tikTakDexDeploy.getAddress();
  console.log("✅ TikTakDex deployed to:", dexAddress);

  // Token addresses on Polygon Amoy
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Add supported tokens first
  console.log("🔧 Adding supported tokens...");
  const tokenAddresses = Object.values(TOKENS);
  const addTokensTx = await tikTakDexDeploy.addSupportedTokens(tokenAddresses);
  await addTokensTx.wait();
  console.log("✅ Supported tokens added:", Object.keys(TOKENS));

  // Create trading pairs
  console.log("🔧 Creating trading pairs...");
  
  // TIK-TAK pair
  console.log("Creating TIK-TAK pair...");
  const tikTakPairTx = await tikTakDexDeploy.createPair(TOKENS.TIK, TOKENS.TAK);
  await tikTakPairTx.wait();
  const tikTakPairData = await tikTakDexDeploy.pairs(ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TAK])));
  const tikTakPairAddress = tikTakPairData[2]; // LP token address is at index 2
  console.log("✅ TIK-TAK pair created at:", tikTakPairAddress);

  // TIK-TOE pair
  console.log("Creating TIK-TOE pair...");
  const tikToePairTx = await tikTakDexDeploy.createPair(TOKENS.TIK, TOKENS.TOE);
  await tikToePairTx.wait();
  const tikToePairData = await tikTakDexDeploy.pairs(ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE])));
  const tikToePairAddress = tikToePairData[2]; // LP token address is at index 2
  console.log("✅ TIK-TOE pair created at:", tikToePairAddress);

  // TAK-TOE pair
  console.log("Creating TAK-TOE pair...");
  const takToePairTx = await tikTakDexDeploy.createPair(TOKENS.TAK, TOKENS.TOE);
  await takToePairTx.wait();
  const takToePairData = await tikTakDexDeploy.pairs(ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TAK, TOKENS.TOE])));
  const takToePairAddress = takToePairData[2]; // LP token address is at index 2
  console.log("✅ TAK-TOE pair created at:", takToePairAddress);

  // Get contract ABIs - use simplified approach
  const dexAbi = [
    "function createPair(address token0, address token1) external returns (address)",
    "function addSupportedTokens(address[] memory tokens) external",
    "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
    "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
    "function removeLiquidity(address token0, address token1, uint256 lpAmount, address to) external returns (uint256, uint256)",
    "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256)",
    "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256)",
    "function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256)"
  ];
  
  const lpAbi = [
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function totalSupply() external view returns (uint256)",
    "function balanceOf(address) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ];

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
      TikTakDex: dexAbi,
      TikTakLP: lpAbi,
    },
    deployment: {
      timestamp: new Date().toISOString(),
      blockNumber: await provider.getBlockNumber(),
      transactionHash: tikTakPairTx.hash,
    },
  };

  // Save configuration to src/config/contracts.json
  const fs = require("fs");
  const path = require("path");
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
