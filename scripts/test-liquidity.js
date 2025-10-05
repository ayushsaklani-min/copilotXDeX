const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("💧 Testing liquidity management on TikTakDex...");

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
    "function addLiquidity(address token0, address token1, uint256 amount0, uint256 amount1, address to) external returns (uint256)",
    "function removeLiquidity(address token0, address token1, uint256 lpAmount, address to) external returns (uint256, uint256)",
    "function pairs(bytes32) external view returns (address, address, address, uint256, uint256, uint256, uint256)",
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];

  const lpAbi = [
    "function balanceOf(address) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
  ];

  const dex = new ethers.Contract(DEX_ADDRESS, dexAbi, wallet);

  // Test adding liquidity to TIK-TOE pool
  console.log("\n💧 Testing add liquidity to TIK-TOE pool...");
  try {
    const tikToken = new ethers.Contract(TOKENS.TIK, erc20Abi, wallet);
    const toeToken = new ethers.Contract(TOKENS.TOE, erc20Abi, wallet);

    // Check balances before
    const tikBalanceBefore = await tikToken.balanceOf(wallet.address);
    const toeBalanceBefore = await toeToken.balanceOf(wallet.address);
    
    console.log("TIK balance before:", ethers.formatEther(tikBalanceBefore));
    console.log("TOE balance before:", ethers.formatEther(toeBalanceBefore));

    // Add 0.5 TIK and 0.5 TOE
    const amountA = ethers.parseEther("0.5");
    const amountB = ethers.parseEther("0.5");

    console.log("Adding 0.5 TIK and 0.5 TOE...");

    // Approve tokens
    console.log("Approving TIK tokens...");
    const tikApproveTx = await tikToken.approve(DEX_ADDRESS, amountA);
    await tikApproveTx.wait();

    console.log("Approving TOE tokens...");
    const toeApproveTx = await toeToken.approve(DEX_ADDRESS, amountB);
    await toeApproveTx.wait();

    // Add liquidity
    console.log("Adding liquidity...");
    const addLiquidityTx = await dex.addLiquidity(
      TOKENS.TIK,
      TOKENS.TOE,
      amountA,
      amountB,
      wallet.address
    );
    const receipt = await addLiquidityTx.wait();

    console.log("✅ Liquidity added successfully!");
    console.log("Transaction hash:", receipt.hash);

    // Check balances after
    const tikBalanceAfter = await tikToken.balanceOf(wallet.address);
    const toeBalanceAfter = await toeToken.balanceOf(wallet.address);
    
    console.log("TIK balance after:", ethers.formatEther(tikBalanceAfter));
    console.log("TOE balance after:", ethers.formatEther(toeBalanceAfter));

    // Get LP token balance
    const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE]));
    const pairData = await dex.pairs(tikToePairKey);
    const lpTokenAddress = pairData[2];
    
    const lpToken = new ethers.Contract(lpTokenAddress, lpAbi, wallet);
    const lpBalance = await lpToken.balanceOf(wallet.address);
    const totalSupply = await lpToken.totalSupply();
    
    console.log("LP token balance:", ethers.formatEther(lpBalance));
    console.log("Total LP supply:", ethers.formatEther(totalSupply));
    console.log("Your share:", (Number(ethers.formatEther(lpBalance)) / Number(ethers.formatEther(totalSupply)) * 100).toFixed(4) + "%");

  } catch (error) {
    console.log("❌ Add liquidity failed:", error.message);
  }

  // Test removing liquidity
  console.log("\n💧 Testing remove liquidity from TIK-TOE pool...");
  try {
    const tikToePairKey = ethers.keccak256(ethers.solidityPacked(["address", "address"], [TOKENS.TIK, TOKENS.TOE]));
    const pairData = await dex.pairs(tikToePairKey);
    const lpTokenAddress = pairData[2];
    
    const lpToken = new ethers.Contract(lpTokenAddress, lpAbi, wallet);
    const lpBalance = await lpToken.balanceOf(wallet.address);
    
    if (lpBalance > 0) {
      // Remove 50% of LP tokens
      const removeAmount = lpBalance / 2n;
      
      console.log(`Removing ${ethers.formatEther(removeAmount)} LP tokens...`);
      
      const removeTx = await dex.removeLiquidity(
        TOKENS.TIK,
        TOKENS.TOE,
        removeAmount,
        wallet.address
      );
      const removeReceipt = await removeTx.wait();
      
      console.log("✅ Liquidity removed successfully!");
      console.log("Transaction hash:", removeReceipt.hash);
      
      // Check final LP balance
      const finalLpBalance = await lpToken.balanceOf(wallet.address);
      console.log("Final LP balance:", ethers.formatEther(finalLpBalance));
    } else {
      console.log("No LP tokens to remove");
    }

  } catch (error) {
    console.log("❌ Remove liquidity failed:", error.message);
  }

  console.log("\n🎉 Liquidity management test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Liquidity test failed:", error);
    process.exit(1);
  });
