const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking OLD DEX for Your Tokens\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Wallet:", user.address);
  console.log();

  // OLD DEX ADDRESS (before we redeployed)
  const OLD_DEX_ADDRESS = "0x7584970caB7A1E79b797Ec5A46679F048c8B330b";
  const NEW_DEX_ADDRESS = "0x9a6A686aC845E1E81b8a1866DA079Fe4e83214DE";

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

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ];

  const dexAbi = [
    "function getReserves(address, address) view returns (uint256, uint256)",
  ];

  console.log("📊 CHECKING OLD DEX LIQUIDITY POOLS:");
  console.log("Old DEX:", OLD_DEX_ADDRESS);
  console.log("─".repeat(60));

  const oldDex = new hre.ethers.Contract(OLD_DEX_ADDRESS, dexAbi, user);
  let totalTokensInOldPools = 0;

  for (const pair of OLD_PAIRS) {
    try {
      const lpToken = new hre.ethers.Contract(pair.lpToken, erc20Abi, user);
      const lpBalance = await lpToken.balanceOf(user.address);
      const lpFormatted = hre.ethers.formatEther(lpBalance);

      if (parseFloat(lpFormatted) > 0) {
        console.log(`\n🔴 ${pair.name} Pool (OLD DEX):`);
        console.log(`  Your LP tokens: ${lpFormatted}`);

        // Get pool reserves
        const [reserve0, reserve1] = await oldDex.getReserves(pair.token0, pair.token1);
        const totalSupply = await lpToken.totalSupply();

        // Calculate your share
        const yourShare = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * 100;
        console.log(`  Your share: ${yourShare.toFixed(4)}%`);

        // Calculate your tokens in pool
        const yourToken0 = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * parseFloat(hre.ethers.formatEther(reserve0));
        const yourToken1 = (parseFloat(lpFormatted) / parseFloat(hre.ethers.formatEther(totalSupply))) * parseFloat(hre.ethers.formatEther(reserve1));

        console.log(`  Your tokens locked in OLD pool:`);
        console.log(`    Token0: ${yourToken0.toFixed(4)}`);
        console.log(`    Token1: ${yourToken1.toFixed(4)}`);

        totalTokensInOldPools += yourToken0 + yourToken1;
      }
    } catch (error) {
      console.log(`  ❌ Error checking ${pair.name}:`, error.message);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`\n💰 TOTAL TOKENS IN OLD DEX POOLS: ~${totalTokensInOldPools.toFixed(2)}`);

  if (totalTokensInOldPools > 0) {
    console.log("\n⚠️  YOUR TOKENS ARE IN THE OLD DEX!");
    console.log("\n📋 TO RECOVER YOUR TOKENS:");
    console.log("  1. We need to withdraw from OLD DEX contract");
    console.log("  2. Old DEX address:", OLD_DEX_ADDRESS);
    console.log("  3. I can create a script to withdraw them");
    console.log("\n✅ Don't worry - your tokens are safe and recoverable!");
  } else {
    console.log("\n✅ No tokens found in old DEX pools");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
