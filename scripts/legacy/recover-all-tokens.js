const hre = require("hardhat");

async function main() {
  console.log("💰 RECOVERING ALL YOUR TOKENS\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Wallet:", user.address);
  console.log();

  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc"
  };

  // ALL DEX contracts
  const ALL_DEXES = [
    {
      name: "ORIGINAL DEX",
      address: "0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3",
      pairs: [
        { name: "TIK-TAK", token0: TOKENS.TIK, token1: TOKENS.TAK, lpToken: "0xa732073DFCFF3AEB05Df4313354b6faa1b90B4A8" },
        { name: "TIK-TOE", token0: TOKENS.TIK, token1: TOKENS.TOE, lpToken: "0x1a07a5dd6a8851A0b493b1ED6E4269CEE932B693" },
        { name: "TAK-TOE", token0: TOKENS.TAK, token1: TOKENS.TOE, lpToken: "0xe5B77c5d9Ad7b03499274d3B48BF4DBd19F54e49" }
      ]
    },
    {
      name: "NEW DEX",
      address: "0x9a6A686aC845E1E81b8a1866DA079Fe4e83214DE",
      pairs: [
        { name: "TIK-TAK", token0: TOKENS.TIK, token1: TOKENS.TAK, lpToken: "0xba8d4ED158efD4A02E4779E88DBdF248c7364BF8" },
        { name: "TIK-TOE", token0: TOKENS.TIK, token1: TOKENS.TOE, lpToken: "0x372de4a620eB67E6D55964308faB77A4639aA8CB" },
        { name: "TAK-TOE", token0: TOKENS.TAK, token1: TOKENS.TOE, lpToken: "0xADdCeD0666A295FaaeAB25649b926d94E4b63F56" }
      ]
    }
  ];

  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  const dexAbi = ["function removeLiquidity(address, address, uint256, address) returns (uint256, uint256)"];

  let totalRecovered = 0;

  for (const dex of ALL_DEXES) {
    console.log(`\n🔄 Checking ${dex.name}...`);
    const dexContract = new hre.ethers.Contract(dex.address, dexAbi, user);

    for (const pair of dex.pairs) {
      try {
        if (!pair.lpToken || pair.lpToken === "0x0000000000000000000000000000000000000000") {
          continue;
        }

        const lpToken = new hre.ethers.Contract(pair.lpToken, erc20Abi, user);
        const lpBalance = await lpToken.balanceOf(user.address);

        if (lpBalance > 0) {
          console.log(`\n  📤 Withdrawing from ${pair.name}...`);
          console.log(`     LP tokens: ${hre.ethers.formatEther(lpBalance)}`);

          const tx = await dexContract.removeLiquidity(
            pair.token0,
            pair.token1,
            lpBalance,
            user.address,
            { gasLimit: 300000 }
          );

          const receipt = await tx.wait();
          console.log(`     ✅ Withdrawn! TX: ${receipt.hash.slice(0, 20)}...`);
          
          totalRecovered += parseFloat(hre.ethers.formatEther(lpBalance));
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("\n✅ RECOVERY COMPLETE!\n");

  // Check final balances
  console.log("📊 YOUR FINAL BALANCES:");
  console.log("─".repeat(60));
  
  let finalTotal = 0;
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new hre.ethers.Contract(address, erc20Abi, user);
    const balance = await token.balanceOf(user.address);
    const formatted = hre.ethers.formatEther(balance);
    console.log(`${symbol}: ${formatted}`);
    finalTotal += parseFloat(formatted);
  }
  
  console.log("─".repeat(60));
  console.log(`TOTAL: ${finalTotal.toFixed(2)} tokens`);
  
  console.log("\n🎉 All your tokens have been recovered!");
  console.log(`   Recovered: ~${totalRecovered.toFixed(2)} LP tokens`);
  console.log(`   Final balance: ${finalTotal.toFixed(2)} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
