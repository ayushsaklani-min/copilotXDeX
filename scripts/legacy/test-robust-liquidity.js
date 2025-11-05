const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("💧 Testing robust liquidity addition...");

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
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Insufficient MATIC for gas fees");
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
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
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

    // Add 0.1 TIK and 0.1 TOE (smaller amounts)
    const amountA = ethers.parseEther("0.1");
    const amountB = ethers.parseEther("0.1");

    console.log("Adding 0.1 TIK and 0.1 TOE...");

    // Check current allowances
    const tikAllowance = await tikToken.allowance(wallet.address, DEX_ADDRESS);
    const toeAllowance = await toeToken.allowance(wallet.address, DEX_ADDRESS);
    
    console.log("Current TIK allowance:", ethers.formatEther(tikAllowance));
    console.log("Current TOE allowance:", ethers.formatEther(toeAllowance));

    // Approve tokens with higher gas limit
    if (tikAllowance < amountA) {
      console.log("Approving TIK tokens...");
      const tikApproveTx = await tikToken.approve(DEX_ADDRESS, amountA, {
        gasLimit: 100000, // Set explicit gas limit
        gasPrice: ethers.parseUnits("20", "gwei") // Set gas price
      });
      await tikApproveTx.wait();
      console.log("TIK approval successful");
    }

    if (toeAllowance < amountB) {
      console.log("Approving TOE tokens...");
      const toeApproveTx = await toeToken.approve(DEX_ADDRESS, amountB, {
        gasLimit: 100000, // Set explicit gas limit
        gasPrice: ethers.parseUnits("20", "gwei") // Set gas price
      });
      await toeApproveTx.wait();
      console.log("TOE approval successful");
    }

    // Add liquidity with explicit gas settings
    console.log("Adding liquidity...");
    const addLiquidityTx = await dex.addLiquidity(
      TOKENS.TIK,
      TOKENS.TOE,
      amountA,
      amountB,
      wallet.address,
      {
        gasLimit: 300000, // Higher gas limit for complex operation
        gasPrice: ethers.parseUnits("20", "gwei") // Set gas price
      }
    );
    
    console.log("Transaction submitted:", addLiquidityTx.hash);
    const receipt = await addLiquidityTx.wait();

    console.log("✅ Liquidity added successfully!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check balances after
    const tikBalanceAfter = await tikToken.balanceOf(wallet.address);
    const toeBalanceAfter = await toeToken.balanceOf(wallet.address);
    
    console.log("TIK balance after:", ethers.formatEther(tikBalanceAfter));
    console.log("TOE balance after:", ethers.formatEther(toeBalanceAfter));

  } catch (error) {
    console.log("❌ Add liquidity failed:", error.message);
    
    // Try to get more specific error information
    if (error.code) {
      console.log("Error code:", error.code);
    }
    if (error.reason) {
      console.log("Error reason:", error.reason);
    }
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }

  console.log("\n🎉 Liquidity test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Liquidity test failed:", error);
    process.exit(1);
  });
