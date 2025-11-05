const hre = require("hardhat");
const contracts = require("../src/config/contracts.json");

async function main() {
  console.log("🔍 Checking Reserves Directly\n");

  const [user] = await hre.ethers.getSigners();
  const DEX_ADDRESS = contracts.dexAddress;
  const TOKENS = contracts.tokens;

  console.log("DEX Address:", DEX_ADDRESS);
  console.log("Account:", user.address);
  console.log();

  const dexAbi = [
    "function getReserves(address, address) view returns (uint256, uint256)",
    "function pairs(bytes32) view returns (address, address, address, uint256, uint256, uint256, uint256)",
    "function getPairKey(address, address) pure returns (bytes32)"
  ];

  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, user);

  // Check TIK-TOE
  console.log("═══ TIK-TOE Pool ═══");
  try {
    const pairKey = await dex.getPairKey(TOKENS.TIK, TOKENS.TOE);
    console.log("Pair Key:", pairKey);
    
    const pair = await dex.pairs(pairKey);
    console.log("Token0:", pair[0]);
    console.log("Token1:", pair[1]);
    console.log("LP Token:", pair[2]);
    console.log("Reserve0:", hre.ethers.formatEther(pair[3]));
    console.log("Reserve1:", hre.ethers.formatEther(pair[4]));
    console.log("Total Supply:", hre.ethers.formatEther(pair[5]));
    
    const [r0, r1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log("\ngetReserves() call:");
    console.log("Reserve0:", hre.ethers.formatEther(r0));
    console.log("Reserve1:", hre.ethers.formatEther(r1));
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n═══ TIK-TAK Pool ═══");
  try {
    const pairKey = await dex.getPairKey(TOKENS.TIK, TOKENS.TAK);
    console.log("Pair Key:", pairKey);
    
    const pair = await dex.pairs(pairKey);
    console.log("Token0:", pair[0]);
    console.log("Token1:", pair[1]);
    console.log("LP Token:", pair[2]);
    console.log("Reserve0:", hre.ethers.formatEther(pair[3]));
    console.log("Reserve1:", hre.ethers.formatEther(pair[4]));
    console.log("Total Supply:", hre.ethers.formatEther(pair[5]));
    
    const [r0, r1] = await dex.getReserves(TOKENS.TIK, TOKENS.TAK);
    console.log("\ngetReserves() call:");
    console.log("Reserve0:", hre.ethers.formatEther(r0));
    console.log("Reserve1:", hre.ethers.formatEther(r1));
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n═══ TAK-TOE Pool ═══");
  try {
    const pairKey = await dex.getPairKey(TOKENS.TAK, TOKENS.TOE);
    console.log("Pair Key:", pairKey);
    
    const pair = await dex.pairs(pairKey);
    console.log("Token0:", pair[0]);
    console.log("Token1:", pair[1]);
    console.log("LP Token:", pair[2]);
    console.log("Reserve0:", hre.ethers.formatEther(pair[3]));
    console.log("Reserve1:", hre.ethers.formatEther(pair[4]));
    console.log("Total Supply:", hre.ethers.formatEther(pair[5]));
    
    const [r0, r1] = await dex.getReserves(TOKENS.TAK, TOKENS.TOE);
    console.log("\ngetReserves() call:");
    console.log("Reserve0:", hre.ethers.formatEther(r0));
    console.log("Reserve1:", hre.ethers.formatEther(r1));
  } catch (error) {
    console.log("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
