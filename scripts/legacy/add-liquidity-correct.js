const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("💧 Adding initial liquidity to TikTakDex (correct contract)...");

  // Get the deployer account from hardhat
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.log("❌ No MATIC balance for gas fees");
    return;
  }

  // Load contract addresses from config
  const contracts = require("../../src/config/contracts.json");
  const DEX_ADDRESS = contracts.dexAddress;
  const TOKENS = contracts.tokens;

  // Get contract instances
  const dexAbi = [
    "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
    "function getReserves(address token0, address token1) external view returns (uint256 reserve0, uint256 reserve1)",
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];

  const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, deployer);

  // Check token balances
  console.log("\n🔍 Checking token balances...");
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(address, erc20Abi, deployer);
    const balance = await token.balanceOf(deployer.address);
    console.log(`${symbol} balance:`, ethers.formatEther(balance));
  }

  // Add liquidity to TIK-TAK pair
  console.log("\n💧 Adding liquidity to TIK-TAK pair...");
  try {
    const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, deployer);
    const takToken = new ethers.Contract(TOKENS.TAK, erc20Abi, deployer);

    const tikBalance = await tikToken.balanceOf(deployer.address);
    const takBalance = await takToken.balanceOf(deployer.address);

    if (tikBalance === 0n || takBalance === 0n) {
      console.log("❌ No TIK or TAK tokens to add liquidity");
      console.log(`TIK: ${ethers.formatEther(tikBalance)}, TAK: ${ethers.formatEther(takBalance)}`);
      return;
    }

    // Use a reasonable amount for initial liquidity (e.g., 1000 tokens each)
    const liquidityAmount = ethers.parseEther("1000");
    const tikAmount = tikBalance > liquidityAmount ? liquidityAmount : tikBalance / 2n;
    const takAmount = takBalance > liquidityAmount ? liquidityAmount : takBalance / 2n;

    console.log(`Adding ${ethers.formatEther(tikAmount)} TIK and ${ethers.formatEther(takAmount)} TAK`);

    // Approve tokens
    console.log("Approving TIK tokens...");
    const tikApproveTx = await tikToken.approve(DEX_ADDRESS, tikAmount);
    await tikApproveTx.wait();
    console.log("✅ TIK approved");

    console.log("Approving TAK tokens...");
    const takApproveTx = await takToken.approve(DEX_ADDRESS, takAmount);
    await takApproveTx.wait();
    console.log("✅ TAK approved");

    // Add liquidity
    console.log("Adding liquidity...");
    const addLiquidityTx = await dex.addLiquidity(
      TOKENS.TIK,
      TOKENS.TAK,
      tikAmount,
      takAmount,
      deployer.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ TIK-TAK liquidity added!");
    console.log("Transaction hash:", receipt.hash);

    // Check reserves
    const [reserve0, reserve1] = await dex.getReserves(TOKENS.TIK, TOKENS.TAK);
    console.log("TIK-TAK reserves:", ethers.formatEther(reserve0), "TIK,", ethers.formatEther(reserve1), "TAK");

  } catch (error) {
    console.log("❌ Failed to add TIK-TAK liquidity:", error.message);
    console.error(error);
  }

  // Add liquidity to TIK-TOE pair
  console.log("\n💧 Adding liquidity to TIK-TOE pair...");
  try {
    const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, deployer);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, deployer);

    const tikBalance = await tikToken.balanceOf(deployer.address);
    const toeBalance = await toeToken.balanceOf(deployer.address);

    if (tikBalance === 0n || toeBalance === 0n) {
      console.log("❌ No TIK or TOE tokens to add liquidity");
      return;
    }

    const liquidityAmount = ethers.parseEther("1000");
    const tikAmount = tikBalance > liquidityAmount ? liquidityAmount : tikBalance / 2n;
    const toeAmount = toeBalance > liquidityAmount ? liquidityAmount : toeBalance / 2n;

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
      deployer.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ TIK-TOE liquidity added!");
    console.log("Transaction hash:", receipt.hash);

    // Check reserves
    const [reserve0, reserve1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log("TIK-TOE reserves:", ethers.formatEther(reserve0), "TIK,", ethers.formatEther(reserve1), "TOE");

  } catch (error) {
    console.log("❌ Failed to add TIK-TOE liquidity:", error.message);
  }

  // Add liquidity to TAK-TOE pair
  console.log("\n💧 Adding liquidity to TAK-TOE pair...");
  try {
    const takToken = new ethers.Contract(TOKENS.TAK, erc20Abi, deployer);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, deployer);

    const takBalance = await takToken.balanceOf(deployer.address);
    const toeBalance = await toeToken.balanceOf(deployer.address);

    if (takBalance === 0n || toeBalance === 0n) {
      console.log("❌ No TAK or TOE tokens to add liquidity");
      return;
    }

    const liquidityAmount = ethers.parseEther("1000");
    const takAmount = takBalance > liquidityAmount ? liquidityAmount : takBalance / 2n;
    const toeAmount = toeBalance > liquidityAmount ? liquidityAmount : toeBalance / 2n;

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
      deployer.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ TAK-TOE liquidity added!");
    console.log("Transaction hash:", receipt.hash);

    // Check reserves
    const [reserve0, reserve1] = await dex.getReserves(TOKENS.TAK, TOKENS.TOE);
    console.log("TAK-TOE reserves:", ethers.formatEther(reserve0), "TAK,", ethers.formatEther(reserve1), "TOE");

  } catch (error) {
    console.log("❌ Failed to add TAK-TOE liquidity:", error.message);
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
