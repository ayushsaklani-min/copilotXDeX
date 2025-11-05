const hre = require("hardhat");
const contracts = require("../src/config/contracts.json");

async function main() {
  console.log("🧪 Testing All DEX Functionalities\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Testing with account:", user.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(user.address)), "MATIC\n");

  const TOKENS = contracts.tokens;
  const DEX_ADDRESS = contracts.dexAddress;
  const REPUTATION_ADDRESS = contracts.reputationAddress;
  const FACTORY_ADDRESS = contracts.tokenFactoryAddress;

  // Contract ABIs
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)"
  ];

  const dexAbi = [
    "function swapExactTokensForTokens(address, address, uint256, address) returns (uint256)",
    "function addLiquidity(address, address, uint256, uint256, address) returns (uint256)",
    "function removeLiquidity(address, address, uint256, address) returns (uint256, uint256)",
    "function getReserves(address, address) view returns (uint256, uint256)",
    "function getAmountOut(uint256, address, address) view returns (uint256)"
  ];

  const reputationAbi = [
    "function getScore(address) view returns (uint256)",
    "function isUpdater(address) view returns (bool)"
  ];

  const factoryAbi = [
    "function createToken(string, string, uint256) returns (address)",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address owner)"
  ];

  // Get contract instances
  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, user);
  const reputation = new hre.ethers.Contract(REPUTATION_ADDRESS, reputationAbi, user);
  const factory = new hre.ethers.Contract(FACTORY_ADDRESS, factoryAbi, user);

  let testResults = {
    swap: false,
    addLiquidity: false,
    removeLiquidity: false,
    createToken: false,
    reputationSwap: false,
    reputationLiquidity: false,
    reputationToken: false
  };

  console.log("═══════════════════════════════════════════════════════════\n");

  // Test 1: Check Initial Reputation
  console.log("📊 TEST 1: Initial Reputation Score");
  try {
    const initialScore = await reputation.getScore(user.address);
    console.log("✅ Initial reputation score:", initialScore.toString());
    console.log();
  } catch (error) {
    console.log("❌ Failed to get reputation score:", error.message);
    console.log();
  }

  // Test 2: Check if DEX is updater
  console.log("🔐 TEST 2: DEX Updater Status");
  try {
    const isUpdater = await reputation.isUpdater(DEX_ADDRESS);
    console.log(isUpdater ? "✅ DEX is reputation updater" : "❌ DEX is NOT reputation updater");
    console.log();
  } catch (error) {
    console.log("❌ Failed to check updater status:", error.message);
    console.log();
  }

  // Test 3: Check Pool Reserves
  console.log("💧 TEST 3: Pool Reserves");
  try {
    const [reserve0, reserve1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log("TIK-TOE Pool:");
    console.log("  TIK Reserve:", hre.ethers.formatEther(reserve0));
    console.log("  TOE Reserve:", hre.ethers.formatEther(reserve1));
    
    if (reserve0 > 0 && reserve1 > 0) {
      console.log("✅ Pool has liquidity");
    } else {
      console.log("⚠️  Pool has no liquidity - add liquidity first!");
    }
    console.log();
  } catch (error) {
    console.log("❌ Failed to get reserves:", error.message);
    console.log();
  }

  // Test 4: Swap Functionality
  console.log("🔄 TEST 4: Swap Functionality");
  try {
    const tikToken = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, user);
    const toeToken = new hre.ethers.Contract(TOKENS.TOE, erc20Abi, user);
    
    const tikBalance = await tikToken.balanceOf(user.address);
    const toeBalanceBefore = await toeToken.balanceOf(user.address);
    
    console.log("TIK Balance:", hre.ethers.formatEther(tikBalance));
    console.log("TOE Balance Before:", hre.ethers.formatEther(toeBalanceBefore));
    
    if (tikBalance > 0) {
      const swapAmount = hre.ethers.parseEther("1");
      
      // Check reserves
      const [reserve0, reserve1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
      if (reserve0 === 0n || reserve1 === 0n) {
        console.log("⚠️  Cannot test swap - no liquidity in pool");
        console.log();
      } else {
        // Estimate output
        const estimatedOut = await dex.getAmountOut(swapAmount, TOKENS.TIK, TOKENS.TOE);
        console.log("Estimated output:", hre.ethers.formatEther(estimatedOut), "TOE");
        
        // Approve
        const approveTx = await tikToken.approve(DEX_ADDRESS, swapAmount);
        await approveTx.wait();
        console.log("✅ Approved TIK");
        
        // Get reputation before
        const repBefore = await reputation.getScore(user.address);
        
        // Swap
        const swapTx = await dex.swapExactTokensForTokens(TOKENS.TIK, TOKENS.TOE, swapAmount, user.address, {
          gasLimit: 300000
        });
        const receipt = await swapTx.wait();
        console.log("✅ Swap successful! TX:", receipt.hash);
        
        // Check balances after
        const toeBalanceAfter = await toeToken.balanceOf(user.address);
        console.log("TOE Balance After:", hre.ethers.formatEther(toeBalanceAfter));
        console.log("TOE Received:", hre.ethers.formatEther(toeBalanceAfter - toeBalanceBefore));
        
        // Check reputation after
        const repAfter = await reputation.getScore(user.address);
        console.log("Reputation Before:", repBefore.toString());
        console.log("Reputation After:", repAfter.toString());
        
        testResults.swap = true;
        testResults.reputationSwap = (repAfter > repBefore);
        
        if (repAfter > repBefore) {
          console.log("✅ Reputation increased by", (repAfter - repBefore).toString(), "(Expected: +1)");
        } else {
          console.log("❌ Reputation did NOT increase");
        }
      }
    } else {
      console.log("⚠️  No TIK tokens to swap");
    }
    console.log();
  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    console.log();
  }

  // Test 5: Add Liquidity
  console.log("💧 TEST 5: Add Liquidity");
  try {
    const tikToken = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, user);
    const takToken = new hre.ethers.Contract(TOKENS.TAK, erc20Abi, user);
    
    const tikBalance = await tikToken.balanceOf(user.address);
    const takBalance = await takToken.balanceOf(user.address);
    
    console.log("TIK Balance:", hre.ethers.formatEther(tikBalance));
    console.log("TAK Balance:", hre.ethers.formatEther(takBalance));
    
    if (tikBalance > hre.ethers.parseEther("10") && takBalance > hre.ethers.parseEther("10")) {
      const amount0 = hre.ethers.parseEther("5");
      const amount1 = hre.ethers.parseEther("5");
      
      // Approve
      const approve0Tx = await tikToken.approve(DEX_ADDRESS, amount0);
      await approve0Tx.wait();
      const approve1Tx = await takToken.approve(DEX_ADDRESS, amount1);
      await approve1Tx.wait();
      console.log("✅ Approved tokens");
      
      // Get reputation before
      const repBefore = await reputation.getScore(user.address);
      
      // Add liquidity
      const addLiqTx = await dex.addLiquidity(TOKENS.TIK, TOKENS.TAK, amount0, amount1, user.address, {
        gasLimit: 300000
      });
      const receipt = await addLiqTx.wait();
      console.log("✅ Liquidity added! TX:", receipt.hash);
      
      // Check reputation after
      const repAfter = await reputation.getScore(user.address);
      console.log("Reputation Before:", repBefore.toString());
      console.log("Reputation After:", repAfter.toString());
      
      testResults.addLiquidity = true;
      testResults.reputationLiquidity = (repAfter > repBefore);
      
      if (repAfter > repBefore) {
        console.log("✅ Reputation increased by", (repAfter - repBefore).toString(), "(Expected: +2)");
      } else {
        console.log("❌ Reputation did NOT increase");
      }
    } else {
      console.log("⚠️  Insufficient tokens for liquidity test");
    }
    console.log();
  } catch (error) {
    console.log("❌ Add liquidity failed:", error.message);
    console.log();
  }

  // Test 6: Create Token
  console.log("🪙 TEST 6: Create Token");
  try {
    // Get reputation before
    const repBefore = await reputation.getScore(user.address);
    
    // Create token
    const createTx = await factory.createToken("Test Token", "TEST", hre.ethers.parseEther("1000000"), {
      gasLimit: 2000000
    });
    const receipt = await createTx.wait();
    
    // Parse event to get token address
    let tokenAddress = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === "TokenCreated") {
          tokenAddress = parsed.args.tokenAddress;
          break;
        }
      } catch {}
    }
    
    console.log("✅ Token created! Address:", tokenAddress);
    console.log("TX:", receipt.hash);
    
    // Check reputation after
    const repAfter = await reputation.getScore(user.address);
    console.log("Reputation Before:", repBefore.toString());
    console.log("Reputation After:", repAfter.toString());
    
    testResults.createToken = true;
    testResults.reputationToken = (repAfter > repBefore);
    
    if (repAfter > repBefore) {
      console.log("✅ Reputation increased by", (repAfter - repBefore).toString(), "(Expected: +5)");
    } else {
      console.log("❌ Reputation did NOT increase");
    }
    console.log();
  } catch (error) {
    console.log("❌ Create token failed:", error.message);
    console.log();
  }

  // Final Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n📊 TEST RESULTS SUMMARY\n");
  console.log("Functionality Tests:");
  console.log("  1. Swap:", testResults.swap ? "✅ WORKING" : "❌ FAILED");
  console.log("  2. Add Liquidity:", testResults.addLiquidity ? "✅ WORKING" : "❌ FAILED");
  console.log("  3. Remove Liquidity:", "⏭️  SKIPPED (requires LP tokens)");
  console.log("  4. Create Token:", testResults.createToken ? "✅ WORKING" : "❌ FAILED");
  console.log("\nReputation Integration:");
  console.log("  1. Swap (+1 XP):", testResults.reputationSwap ? "✅ WORKING" : "❌ FAILED");
  console.log("  2. Add Liquidity (+2 XP):", testResults.reputationLiquidity ? "✅ WORKING" : "❌ FAILED");
  console.log("  3. Create Token (+5 XP):", testResults.reputationToken ? "✅ WORKING" : "❌ FAILED");
  
  const allWorking = testResults.swap && testResults.addLiquidity && testResults.createToken &&
                     testResults.reputationSwap && testResults.reputationLiquidity && testResults.reputationToken;
  
  console.log("\n" + (allWorking ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED"));
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
