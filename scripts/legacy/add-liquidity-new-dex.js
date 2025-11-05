const hre = require("hardhat");
const contracts = require("../src/config/contracts.json");

async function main() {
  console.log("💧 Adding Liquidity to NEW DEX\n");

  const [user] = await hre.ethers.getSigners();
  const DEX_ADDRESS = contracts.dexAddress;
  const TOKENS = contracts.tokens;

  console.log("NEW DEX Address:", DEX_ADDRESS);
  console.log("Account:", user.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(user.address)), "MATIC\n");

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
  ];

  const dexAbi = [
    "function addLiquidity(address, address, uint256, uint256, address) returns (uint256)",
    "function getReserves(address, address) view returns (uint256, uint256)",
  ];

  const dex = new hre.ethers.Contract(DEX_ADDRESS, dexAbi, user);

  // Check balances
  console.log("📊 Token Balances:");
  const tikToken = new hre.ethers.Contract(TOKENS.TIK, erc20Abi, user);
  const takToken = new hre.ethers.Contract(TOKENS.TAK, erc20Abi, user);
  const toeToken = new hre.ethers.Contract(TOKENS.TOE, erc20Abi, user);

  const tikBal = await tikToken.balanceOf(user.address);
  const takBal = await takToken.balanceOf(user.address);
  const toeBal = await toeToken.balanceOf(user.address);

  console.log("TIK:", hre.ethers.formatEther(tikBal));
  console.log("TAK:", hre.ethers.formatEther(takBal));
  console.log("TOE:", hre.ethers.formatEther(toeBal));
  console.log();

  if (tikBal === 0n || takBal === 0n || toeBal === 0n) {
    console.log("❌ Insufficient token balances");
    return;
  }

  // Add to TIK-TOE
  console.log("═══ Adding to TIK-TOE Pool ═══");
  try {
    const tikAmount = hre.ethers.parseEther("2");
    const toeAmount = hre.ethers.parseEther("4");

    console.log(`Adding ${hre.ethers.formatEther(tikAmount)} TIK and ${hre.ethers.formatEther(toeAmount)} TOE`);

    const approveTik = await tikToken.approve(DEX_ADDRESS, tikAmount);
    await approveTik.wait();
    console.log("✅ TIK approved");

    const approveToe = await toeToken.approve(DEX_ADDRESS, toeAmount);
    await approveToe.wait();
    console.log("✅ TOE approved");

    const tx = await dex.addLiquidity(TOKENS.TIK, TOKENS.TOE, tikAmount, toeAmount, user.address, {
      gasLimit: 300000
    });
    const receipt = await tx.wait();
    console.log("✅ Liquidity added! TX:", receipt.hash);

    const [r0, r1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log("Reserves:", hre.ethers.formatEther(r0), "TIK,", hre.ethers.formatEther(r1), "TOE");
    console.log();
  } catch (error) {
    console.log("❌ Failed:", error.message);
    console.log();
  }

  // Add to TAK-TOE
  console.log("═══ Adding to TAK-TOE Pool ═══");
  try {
    const takAmount = hre.ethers.parseEther("2");
    const toeAmount = hre.ethers.parseEther("2");

    console.log(`Adding ${hre.ethers.formatEther(takAmount)} TAK and ${hre.ethers.formatEther(toeAmount)} TOE`);

    const approveTak = await takToken.approve(DEX_ADDRESS, takAmount);
    await approveTak.wait();
    console.log("✅ TAK approved");

    const approveToe = await toeToken.approve(DEX_ADDRESS, toeAmount);
    await approveToe.wait();
    console.log("✅ TOE approved");

    const tx = await dex.addLiquidity(TOKENS.TAK, TOKENS.TOE, takAmount, toeAmount, user.address, {
      gasLimit: 300000
    });
    const receipt = await tx.wait();
    console.log("✅ Liquidity added! TX:", receipt.hash);

    const [r0, r1] = await dex.getReserves(TOKENS.TAK, TOKENS.TOE);
    console.log("Reserves:", hre.ethers.formatEther(r0), "TAK,", hre.ethers.formatEther(r1), "TOE");
    console.log();
  } catch (error) {
    console.log("❌ Failed:", error.message);
    console.log();
  }

  console.log("🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
