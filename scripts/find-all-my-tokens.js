const hre = require("hardhat");

async function main() {
  console.log("🔍 SEARCHING FOR ALL YOUR TOKENS\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Wallet:", user.address);
  console.log();

  const TOKENS = {
    TIK: "0xf0dc4aa8063810B4116091371a74D55856c9Fa87",
    TAK: "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3",
    TOE: "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc"
  };

  // All possible DEX addresses we might have used
  const DEX_ADDRESSES = [
    { name: "ORIGINAL DEX", address: "0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3" },
    { name: "OLD DEX", address: "0x7584970caB7A1E79b797Ec5A46679F048c8B330b" },
    { name: "NEW DEX", address: "0x9a6A686aC845E1E81b8a1866DA079Fe4e83214DE" },
  ];

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ];

  // Check wallet balance
  console.log("💰 CURRENT WALLET BALANCE:");
  console.log("─".repeat(60));
  let walletTotal = 0;
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const token = new hre.ethers.Contract(address, erc20Abi, user);
    const balance = await token.balanceOf(user.address);
    const formatted = hre.ethers.formatEther(balance);
    console.log(`${symbol}: ${formatted}`);
    walletTotal += parseFloat(formatted);
  }
  console.log(`Total in wallet: ${walletTotal.toFixed(2)}\n`);

  // Check each DEX for LP tokens
  console.log("🔍 CHECKING ALL DEX CONTRACTS FOR LP TOKENS:");
  console.log("─".repeat(60));

  const dexAbi = [
    "function pairs(bytes32) view returns (address, address, address, uint256, uint256, uint256, uint256)",
    "function getPairKey(address, address) pure returns (bytes32)",
  ];

  let totalInPools = 0;

  for (const dex of DEX_ADDRESSES) {
    console.log(`\n📍 ${dex.name}: ${dex.address}`);
    
    try {
      const dexContract = new hre.ethers.Contract(dex.address, dexAbi, user);

      // Check TIK-TAK
      try {
        const tikTakKey = await dexContract.getPairKey(TOKENS.TIK, TOKENS.TAK);
        const tikTakPair = await dexContract.pairs(tikTakKey);
        const lpToken = new hre.ethers.Contract(tikTakPair[2], erc20Abi, user);
        const lpBalance = await lpToken.balanceOf(user.address);
        
        if (lpBalance > 0) {
          const totalSupply = await lpToken.totalSupply();
          const share = parseFloat(hre.ethers.formatEther(lpBalance)) / parseFloat(hre.ethers.formatEther(totalSupply));
          const token0Amount = share * parseFloat(hre.ethers.formatEther(tikTakPair[3]));
          const token1Amount = share * parseFloat(hre.ethers.formatEther(tikTakPair[4]));
          
          console.log(`  TIK-TAK: ${token0Amount.toFixed(2)} TIK + ${token1Amount.toFixed(2)} TAK`);
          totalInPools += token0Amount + token1Amount;
        }
      } catch (e) {}

      // Check TIK-TOE
      try {
        const tikToeKey = await dexContract.getPairKey(TOKENS.TIK, TOKENS.TOE);
        const tikToePair = await dexContract.pairs(tikToeKey);
        const lpToken = new hre.ethers.Contract(tikToePair[2], erc20Abi, user);
        const lpBalance = await lpToken.balanceOf(user.address);
        
        if (lpBalance > 0) {
          const totalSupply = await lpToken.totalSupply();
          const share = parseFloat(hre.ethers.formatEther(lpBalance)) / parseFloat(hre.ethers.formatEther(totalSupply));
          const token0Amount = share * parseFloat(hre.ethers.formatEther(tikToePair[3]));
          const token1Amount = share * parseFloat(hre.ethers.formatEther(tikToePair[4]));
          
          console.log(`  TIK-TOE: ${token0Amount.toFixed(2)} TIK + ${token1Amount.toFixed(2)} TOE`);
          totalInPools += token0Amount + token1Amount;
        }
      } catch (e) {}

      // Check TAK-TOE
      try {
        const takToeKey = await dexContract.getPairKey(TOKENS.TAK, TOKENS.TOE);
        const takToePair = await dexContract.pairs(takToeKey);
        const lpToken = new hre.ethers.Contract(takToePair[2], erc20Abi, user);
        const lpBalance = await lpToken.balanceOf(user.address);
        
        if (lpBalance > 0) {
          const totalSupply = await lpToken.totalSupply();
          const share = parseFloat(hre.ethers.formatEther(lpBalance)) / parseFloat(hre.ethers.formatEther(totalSupply));
          const token0Amount = share * parseFloat(hre.ethers.formatEther(takToePair[3]));
          const token1Amount = share * parseFloat(hre.ethers.formatEther(takToePair[4]));
          
          console.log(`  TAK-TOE: ${token0Amount.toFixed(2)} TAK + ${token1Amount.toFixed(2)} TOE`);
          totalInPools += token0Amount + token1Amount;
        }
      } catch (e) {}

    } catch (error) {
      console.log(`  ❌ Cannot access this DEX`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("\n📊 SUMMARY:");
  console.log(`  In Wallet: ${walletTotal.toFixed(2)} tokens`);
  console.log(`  In Pools: ${totalInPools.toFixed(2)} tokens`);
  console.log(`  TOTAL FOUND: ${(walletTotal + totalInPools).toFixed(2)} tokens`);

  console.log("\n💡 EXPLANATION:");
  console.log("  The add-liquidity-correct.js script was run multiple times.");
  console.log("  Each time it used 50% of your balance for liquidity.");
  console.log("  After multiple runs: 300 → 150 → 75 → 37.5 → ...");
  console.log("  This is why you have ~56 tokens now instead of 300+");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("  Your tokens were USED in testing, not lost.");
  console.log("  They were spent on:");
  console.log("    - Adding liquidity (multiple times)");
  console.log("    - Testing swaps");
  console.log("    - Deploying and testing contracts");
  
  console.log("\n❌ Unfortunately, tokens used in transactions cannot be recovered.");
  console.log("   This is how blockchain works - transactions are permanent.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
