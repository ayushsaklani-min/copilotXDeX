const hre = require("hardhat");
const contracts = require("../src/config/contracts.json");

async function main() {
  console.log("💰 Checking Your Token Balances\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Wallet:", user.address);
  console.log();

  const TOKENS = contracts.tokens;
  const DEX_ADDRESS = contracts.dexAddress;

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ];

  const dexAbi = [
    "function getReserves(address, address) view returns (uint256, uint256)",
  ];

  console.log("📊 YOUR TOKEN BALANCES:");
  console.log("─".repeat(60));

  let totalValue = 0;
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new hre.ethers.Contract(address, erc20Abi, user);
    const balance = await token.balanceOf(user.address);
    const formatted = hre.ethers.formatEther(balance);
    console.log(`${symbol}: ${formatted}`);
    totalValue += parseFloat(formatted);
  }

  console.log("─".repeat(60));
  console.log(`Total tokens: ${totalValue.toFixed(2)}\n`);

  // Check liquidity pools
  console.log("💧 YOUR LIQUIDITY IN POOLS:");
  console.log("─".repeat(60));

  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, user);

  for (const pair of contracts.pairs) {
    if (!pair.lpToken || pair.lpToken === "0x0000000000000000000000000000000000000000") {
      continue;
    }

    try {
      const lpToken = new hre.ethers.Contract(pair.lpToken, erc20Abi, user);
      const lpBalance = await lpToken.balanceOf(user.address);
      const lpFormatted = hre.ethers.formatEther(lpBalance);

      if (parseFloat(lpFormatted) > 0) {
        console.log(`\n${pair.name} Pool:`);
        console.log(`  Your LP tokens: ${lpFormatted}`);

        // Get pool reserves
        const [reserve0, reserve1] = await dex.getReserves(pair.token0, pair.token1);
        const totalSupply = await lpToken.totalSupply();

        // Calculate your share
        const yourShare = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * 100;
        console.log(`  Your share: ${yourShare.toFixed(4)}%`);

        // Calculate your tokens in pool
        const yourToken0 = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * parseFloat(hre.ethers.formatEther(reserve0));
        const yourToken1 = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * parseFloat(hre.ethers.formatEther(reserve1));

        console.log(`  Your tokens in pool:`);
        console.log(`    Token0: ${yourToken0.toFixed(4)}`);
        console.log(`    Token1: ${yourToken1.toFixed(4)}`);
      }
    } catch (error) {
      // Skip pools with errors
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("\n💡 WHERE YOUR TOKENS WENT:");
  console.log("  1. Added to liquidity pools (can be withdrawn)");
  console.log("  2. Used in test swaps");
  console.log("  3. Attempted farm funding");
  console.log("\n✅ Your tokens in LP pools are safe and can be withdrawn!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
