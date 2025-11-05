const hre = require("hardhat");
const contracts = require("../src/config/contracts.json");

async function main() {
  console.log("🔍 Verifying Pool Status and Testing Swap\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Testing with account:", user.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(user.address)), "MATIC\n");

  const TOKENS = contracts.tokens;
  const DEX_ADDRESS = contracts.dexAddress;
  const REPUTATION_ADDRESS = contracts.reputationAddress;

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
  ];

  const dexAbi = [
    "function swapExactTokensForTokens(address, address, uint256, address) returns (uint256)",
    "function getReserves(address, address) view returns (uint256, uint256)",
    "function getAmountOut(uint256, address, address) view returns (uint256)",
    "function pairs(bytes32) view returns (address, address, address, uint256, uint256, uint256, uint256)",
    "function getPairKey(address, address) pure returns (bytes32)"
  ];

  const reputationAbi = [
    "function getScore(address) view returns (uint256)",
  ];

  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, user);
  const reputation = new hre.ethers.Contract(REPUTATION_ADDRESS, reputationAbi, user);

  // Check all pools
  console.log("═══════════════════════════════════════════════════════════");
  console.log("📊 CHECKING ALL POOL RESERVES\n");

  const pools = [
    { name: "TIK-TAK", token0: TOKENS.TIK, token1: TOKENS.TAK },
    { name: "TIK-TOE", token0: TOKENS.TIK, token1: TOKENS.TOE },
    { name: "TAK-TOE", token0: TOKENS.TAK, token1: TOKENS.TOE }
  ];

  for (const pool of pools) {
    try {
      const [reserve0, reserve1] = await dex.getReserves(pool.token0, pool.token1);
      console.log(`${pool.name} Pool:`);
      console.log(`  Reserve 0: ${hre.ethers.formatEther(reserve0)}`);
      console.log(`  Reserve 1: ${hre.ethers.formatEther(reserve1)}`);
      console.log(`  Status: ${reserve0 > 0 && reserve1 > 0 ? "✅ Has Liquidity" : "❌ No Liquidity"}`);
      console.log();
    } catch (error) {
      console.log(`${pool.name} Pool: ❌ Error -`, error.message);
      console.log();
    }
  }

  // Check token balances
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💰 YOUR TOKEN BALANCES\n");

  const tikToken = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, user);
  const takToken = new hre.ethers.Contract(TOKENS.TAK, erc20Abi, user);
  const toeToken = new hre.ethers.Contract(TOKENS.TOE, erc20Abi, user);

  const tikBalance = await tikToken.balanceOf(user.address);
  const takBalance = await takToken.balanceOf(user.address);
  const toeBalance = await toeToken.balanceOf(user.address);

  console.log("TIK:", hre.ethers.formatEther(tikBalance));
  console.log("TAK:", hre.ethers.formatEther(takBalance));
  console.log("TOE:", hre.ethers.formatEther(toeBalance));
  console.log();

  // Check initial reputation
  const repBefore = await reputation.getScore(user.address);
  console.log("Current Reputation Score:", repBefore.toString());
  console.log();

  // Test swap if we have tokens and liquidity
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🔄 TESTING SWAP: TIK → TOE\n");

  try {
    const [tikReserve, toeReserve] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    
    if (tikReserve === 0n || toeReserve === 0n) {
      console.log("❌ Cannot swap - TIK-TOE pool has no liquidity");
      console.log("   TIK Reserve:", hre.ethers.formatEther(tikReserve));
      console.log("   TOE Reserve:", hre.ethers.formatEther(toeReserve));
      return;
    }

    if (tikBalance === 0n) {
      console.log("❌ Cannot swap - you have no TIK tokens");
      return;
    }

    const swapAmount = hre.ethers.parseEther("1");
    
    if (tikBalance < swapAmount) {
      console.log("⚠️  Insufficient TIK balance for 1 TIK swap");
      console.log("   Your balance:", hre.ethers.formatEther(tikBalance));
      return;
    }

    // Estimate output
    console.log("Swapping: 1 TIK");
    const estimatedOut = await dex.getAmountOut(swapAmount, TOKENS.TIK, TOKENS.TOE);
    console.log("Estimated output:", hre.ethers.formatEther(estimatedOut), "TOE");
    console.log();

    // Approve
    console.log("Approving TIK...");
    const approveTx = await tikToken.approve(DEX_ADDRESS, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    // Get balances before
    const toeBalanceBefore = await toeToken.balanceOf(user.address);
    console.log("TOE balance before:", hre.ethers.formatEther(toeBalanceBefore));

    // Execute swap
    console.log("\nExecuting swap...");
    const swapTx = await dex.swapExactTokensForTokens(
      TOKENS.TIK,
      TOKENS.TOE,
      swapAmount,
      user.address,
      { gasLimit: 300000 }
    );
    const receipt = await swapTx.wait();
    console.log("✅ Swap successful!");
    console.log("TX:", receipt.hash);

    // Check balances after
    const toeBalanceAfter = await toeToken.balanceOf(user.address);
    console.log("\nTOE balance after:", hre.ethers.formatEther(toeBalanceAfter));
    console.log("TOE received:", hre.ethers.formatEther(toeBalanceAfter - toeBalanceBefore));

    // Check reputation after
    const repAfter = await reputation.getScore(user.address);
    console.log("\nReputation before:", repBefore.toString());
    console.log("Reputation after:", repAfter.toString());
    
    if (repAfter > repBefore) {
      console.log("✅ Reputation increased by", (repAfter - repBefore).toString(), "(Expected: +1)");
    } else {
      console.log("❌ Reputation did NOT increase");
    }

    console.log("\n🎉 SWAP TEST PASSED!");

  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
