const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔄 Testing token swap on TikTakDex...");

  // Use hardcoded values
  const RPC_URL = "https://rpc-amoy.polygon.technology/";
  const PRIVATE_KEY = "0x8bc6df0ad6520901a4e6583847e11d9b139e1120f755b4750ae39b2de3bb7a3b";

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Using account:", wallet.address);
  
  // Contract addresses
  const DEX_ADDRESS = "0x3Db5A1C4bE6C21ceCaf3E74611Bd55F41651f0Ba";
  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc",
  };

  // Get contract instances
  const dexAbi = [
    "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256)",
    "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
    "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
  ];

  const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, wallet);

  // Test TIK to TOE swap
  console.log("\n🔄 Testing TIK to TOE swap...");
  try {
    const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, wallet);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, wallet);

    // Check balances before swap
    const tikBalanceBefore = await tikToken.balanceOf(wallet.address);
    const toeBalanceBefore = await toeToken.balanceOf(wallet.address);
    
    console.log("TIK balance before:", ethers.formatEther(tikBalanceBefore));
    console.log("TOE balance before:", ethers.formatEther(toeBalanceBefore));

    // Get pool reserves
    const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE]));
    const pair = await dex.pairs(tikToePairKey);
    const tikReserve = pair[3];
    const toeReserve = pair[4];
    
    console.log("Pool reserves - TIK:", ethers.formatEther(tikReserve), "TOE:", ethers.formatEther(toeReserve));

    // Calculate swap amount (1 TIK)
    const swapAmount = ethers.parseEther("1");
    const expectedOut = await dex.getAmountOut(swapAmount, TOKENS.TIK, TOKENS.TOE);
    console.log("Swapping 1 TIK for", ethers.formatEther(expectedOut), "TOE");

    // Approve TIK tokens
    console.log("Approving TIK tokens...");
    const approveTx = await tikToken.approve(DEX_ADDRESS, swapAmount);
    await approveTx.wait();

    // Execute swap
    console.log("Executing swap...");
    const swapTx = await dex.swapExactTokensForTokens(
      TOKENS.TIK,
      TOKENS.TOE,
      swapAmount,
      wallet.address
    );
    const receipt = await swapTx.wait();

    // Check balances after swap
    const tikBalanceAfter = await tikToken.balanceOf(wallet.address);
    const toeBalanceAfter = await toeToken.balanceOf(wallet.address);
    
    console.log("TIK balance after:", ethers.formatEther(tikBalanceAfter));
    console.log("TOE balance after:", ethers.formatEther(toeBalanceAfter));
    console.log("TOE received:", ethers.formatEther(toeBalanceAfter - toeBalanceBefore));

    console.log("✅ Swap successful!");
    console.log("Transaction hash:", receipt.hash);

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
  }

  console.log("\n🎉 Swap test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Swap test failed:", error);
    process.exit(1);
  });
