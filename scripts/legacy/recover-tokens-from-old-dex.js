const hre = require("hardhat");

async function main() {
  console.log("💰 Recovering Tokens from OLD DEX\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Wallet:", user.address);
  console.log();

  const OLD_DEX_ADDRESS = "0x7584970caB7A1E79b797Ec5A46679F048c8B330b";

  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc"
  };

  const OLD_PAIRS = [
    {
      name: "TIK-TAK",
      token0: TOKENS.TIK,
      token1: TOKENS.TAK,
      lpToken: "0xa732073DFCFF3AEB05Df4313354b6faa1b90B4A8"
    },
    {
      name: "TIK-TOE",
      token0: TOKENS.TIK,
      token1: TOKENS.TOE,
      lpToken: "0x1a07a5dd6a8851A0b493b1ED6E4269CEE932B693"
    },
    {
      name: "TAK-TOE",
      token0: TOKENS.TAK,
      token1: TOKENS.TOE,
      lpToken: "0xe5B77c5d9Ad7b03499274d3B48BF4DBd19F54e49"
    }
  ];

  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  const dexAbi = ["function removeLiquidity(address token0, address token1, uint256 lpAmount, address to) external returns (uint256, uint256)"];

  const oldDex = new hre.ethers.Contract(OLD_DEX_ADDRESS, dexAbi, user);

  console.log("🔄 Withdrawing from OLD DEX pools...\n");

  for (const pair of OLD_PAIRS) {
    try {
      const lpToken = new hre.ethers.Contract(pair.lpToken, erc20Abi, user);
      const lpBalance = await lpToken.balanceOf(user.address);

      if (lpBalance > 0) {
        console.log(`📤 Withdrawing from ${pair.name} pool...`);
        console.log(`   LP tokens: ${hre.ethers.formatEther(lpBalance)}`);

        const tx = await oldDex.removeLiquidity(
          pair.token0,
          pair.token1,
          lpBalance,
          user.address,
          { gasLimit: 300000 }
        );

        const receipt = await tx.wait();
        console.log(`   ✅ Withdrawn! TX: ${receipt.hash}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("\n✅ RECOVERY COMPLETE!");
  console.log("\n📊 Check your new balances:");
  
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new hre.ethers.Contract(address, erc20Abi, user);
    const balance = await token.balanceOf(user.address);
    console.log(`   ${symbol}: ${hre.ethers.formatEther(balance)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
