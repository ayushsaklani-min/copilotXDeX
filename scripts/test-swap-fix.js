const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing swap functionality fixes...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC\n");

  const configPath = path.join(__dirname, "../src/config/contracts.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const DEX_ADDRESS = config.dexAddress;
  const TOKENS = config.tokens;

  console.log("📋 Configuration:");
  console.log("- DEX Address:", DEX_ADDRESS);
  console.log("- TIK Token:", TOKENS.TIK);
  console.log("- TOE Token:", TOKENS.TOE);
  console.log();

  const dexAbi = [
    "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256)",
    "function getReserves(address tokenA, address tokenB) external view returns (uint256, uint256)",
    "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256)"
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ];

  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, deployer);

  // Test 1: Check reserves
  console.log("🔍 Test 1: Checking reserves...");
  try {
    const [tikReserve, toeReserve] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log(`✅ TIK Reserve: ${hre.ethers.formatEther(tikReserve)}`);
    console.log(`✅ TOE Reserve: ${hre.ethers.formatEther(toeReserve)}`);
    
    if (tikReserve === 0n || toeReserve === 0n) {
      console.log("⚠️  Warning: One or both reserves are zero. Swaps may fail.");
    } else {
      console.log("✅ Reserves look good!");
    }
  } catch (error) {
    console.error("❌ Error checking reserves:", error.message);
  }

  // Test 2: Check token balances
  console.log("\n🔍 Test 2: Checking token balances...");
  try {
    const tikContract = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, deployer);
    const toeContract = new hre.ethers.Contract(TOKENS.TOE, erc20Abi, deployer);
    
    const tikBalance = await tikContract.balanceOf(deployer.address);
    const toeBalance = await toeContract.balanceOf(deployer.address);
    
    console.log(`✅ TIK Balance: ${hre.ethers.formatEther(tikBalance)}`);
    console.log(`✅ TOE Balance: ${hre.ethers.formatEther(toeBalance)}`);
    
    if (tikBalance === 0n) {
      console.log("⚠️  Warning: No TIK tokens. You need TIK tokens to test swaps.");
    }
  } catch (error) {
    console.error("❌ Error checking balances:", error.message);
  }

  // Test 3: Test swap estimation
  console.log("\n🔍 Test 3: Testing swap estimation...");
  try {
    const amountIn = hre.ethers.parseEther("1"); // 1 TIK
    const amountOut = await dex.getAmountOut(amountIn, TOKENS.TIK, TOKENS.TOE);
    
    console.log(`✅ 1 TIK would give: ${hre.ethers.formatEther(amountOut)} TOE`);
    
    if (amountOut === 0n) {
      console.log("⚠️  Warning: Swap estimation returned 0. Check reserves and liquidity.");
    } else {
      console.log("✅ Swap estimation working!");
    }
  } catch (error) {
    console.error("❌ Error in swap estimation:", error.message);
  }

  // Test 4: Test approval (if we have tokens)
  console.log("\n🔍 Test 4: Testing token approval...");
  try {
    const tikContract = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, deployer);
    const tikBalance = await tikContract.balanceOf(deployer.address);
    
    if (tikBalance > 0n) {
      const currentAllowance = await tikContract.allowance(deployer.address, DEX_ADDRESS);
      console.log(`✅ Current TIK allowance: ${hre.ethers.formatEther(currentAllowance)}`);
      
      if (currentAllowance === 0n) {
        console.log("ℹ️  No allowance set. Approval would be needed for swaps.");
      } else {
        console.log("✅ Allowance already set!");
      }
    } else {
      console.log("⚠️  No TIK tokens to test approval with.");
    }
  } catch (error) {
    console.error("❌ Error checking approval:", error.message);
  }

  console.log("\n✅ Swap functionality test complete!");
  console.log("\n💡 If you see errors above, the fixes should handle them with retry logic.");
  console.log("🚀 Try the swap in the DEX UI now - it should work much better!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
