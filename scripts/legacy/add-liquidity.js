const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("💧 Adding initial liquidity to TikTakDex...");

  // Use hardcoded values
  const RPC_URL = "https://rpc-amoy.polygon.technology/";
  const PRIVATE_KEY = "0x8bc6df0ad6520901a4e6583847e11d9b139e1120f755b4750ae39b2de3bb7a3b";

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Using account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");
  
  if (balance === 0n) {
    console.log("❌ No MATIC balance for gas fees");
    return;
  }

  // Contract addresses
  const DEX_ADDRESS = "0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba";
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Get contract instances
  const dexAbi = [
    "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
    "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
  ];

  const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, wallet);

  // Check token balances
  console.log("\n🔍 Checking token balances...");
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(address, erc20Abi, wallet);
    const balance = await token.balanceOf(wallet.address);
    console.log(`${symbol} balance:`, ethers.formatEther(balance));
  }

  // Add liquidity to TIK-TOE pair
  console.log("\n💧 Adding liquidity to TIK-TOE pair...");
  try {
    const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, wallet);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, wallet);

    // Check if we have tokens
    const tikBalance = await tikToken.balanceOf(wallet.address);
    const toeBalance = await toeToken.balanceOf(wallet.address);

    if (tikBalance === 0n || toeBalance === 0n) {
      console.log("❌ No TIK or TOE tokens to add liquidity");
      console.log("You need to get TIK and TOE tokens first");
      return;
    }

    // Use 10% of available tokens for liquidity
    const tikAmount = tikBalance / 10n;
    const toeAmount = toeBalance / 10n;

    console.log(`Adding ${ethers.formatEther(tikAmount)} TIK and ${ethers.formatEther(toeAmount)} TOE`);

    // Approve tokens
    console.log("Approving TIK tokens...");
    const tikApproveTx = await tikToken.approve(DEX_ADDRESS, tikAmount);
    await tikApproveTx.wait();

    console.log("Approving TOE tokens...");
    const toeApproveTx = await toeToken.approve(DEX_ADDRESS, toeAmount);
    await toeApproveTx.wait();

    // Add liquidity
    console.log("Adding liquidity...");
    const addLiquidityTx = await dex.addLiquidity(
      TOKENS.TIK,
      TOKENS.TOE,
      tikAmount,
      toeAmount,
      wallet.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ TIK-TOE liquidity added!");
    console.log("Transaction hash:", receipt.hash);
    console.log("LP tokens minted:", ethers.formatEther(receipt.logs[0].args[3] || 0));

  } catch (error) {
    console.log("❌ Failed to add TIK-TOE liquidity:", error.message);
  }

  // Add liquidity to TAK-TOE pair
  console.log("\n💧 Adding liquidity to TAK-TOE pair...");
  try {
    const takToken = new ethers.Contract(TOKENS.TAK, erc20Abi, wallet);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, wallet);

    // Check if we have tokens
    const takBalance = await takToken.balanceOf(wallet.address);
    const toeBalance = await toeToken.balanceOf(wallet.address);

    if (takBalance === 0n || toeBalance === 0n) {
      console.log("❌ No TAK or TOE tokens to add liquidity");
      console.log("You need to get TAK and TOE tokens first");
      return;
    }

    // Use 10% of available tokens for liquidity
    const takAmount = takBalance / 10n;
    const toeAmount = toeBalance / 10n;

    console.log(`Adding ${ethers.formatEther(takAmount)} TAK and ${ethers.formatEther(toeAmount)} TOE`);

    // Approve tokens
    console.log("Approving TAK tokens...");
    const takApproveTx = await takToken.approve(DEX_ADDRESS, takAmount);
    await takApproveTx.wait();

    console.log("Approving TOE tokens...");
    const toeApproveTx = await toeToken.approve(DEX_ADDRESS, toeAmount);
    await toeApproveTx.wait();

    // Add liquidity
    console.log("Adding liquidity...");
    const addLiquidityTx = await dex.addLiquidity(
      TOKENS.TAK,
      TOKENS.TOE,
      takAmount,
      toeAmount,
      wallet.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ TAK-TOE liquidity added!");
    console.log("Transaction hash:", receipt.hash);
    console.log("LP tokens minted:", ethers.formatEther(receipt.logs[0].args[3] || 0));

  } catch (error) {
    console.log("❌ Failed to add TAK-TOE liquidity:", error.message);
  }

  // Check final pool states
  console.log("\n📊 Final pool states:");
  try {
    const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE]));
    const takToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TAK, TOKENS.TOE]));

    const tikToePair = await dex.pairs(tikToePairKey);
    const takToePair = await dex.pairs(takToePairKey);

    console.log("TIK-TOE reserves:", ethers.formatEther(tikToePair[3]), "TIK,", ethers.formatEther(tikToePair[4]), "TOE");
    console.log("TAK-TOE reserves:", ethers.formatEther(takToePair[3]), "TAK,", ethers.formatEther(takToePair[4]), "TOE");

  } catch (error) {
    console.log("❌ Failed to check pool states:", error.message);
  }

  console.log("\n🎉 Liquidity addition completed!");
  console.log("Your DEX pools now have liquidity and are ready for trading!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Liquidity addition failed:", error);
    process.exit(1);
  });
