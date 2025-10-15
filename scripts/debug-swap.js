const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const cfgPath = path.join(__dirname, "..", "src", "config", "contracts.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));

  const dexAddress = cfg.dexAddress;
  const TOKENS = cfg.tokens;
  if (!dexAddress || !TOKENS?.TIK || !TOKENS?.TOE) throw new Error("Missing dexAddress or tokens in config");

  const [signer] = await ethers.getSigners();
  const user = await signer.getAddress();
  console.log("Using:", user);

  const dexAbi = [
    "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256)",
    "function getReserves(address token0, address token1) view returns (uint256 reserve0, uint256 reserve1)",
    "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, address to) returns (uint256)",
  ];
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function decimals() view returns (uint8)",
  ];

  const dex = new ethers.Contract(dexAddress, dexAbi, signer);
  const tik = new ethers.Contract(TOKENS.TIK, erc20Abi, signer);
  const toe = new ethers.Contract(TOKENS.TOE, erc20Abi, signer);

  // Check balances
  const tikBal = await tik.balanceOf(user);
  const toeBal = await toe.balanceOf(user);
  console.log("TIK balance:", ethers.formatEther(tikBal));
  console.log("TOE balance:", ethers.formatEther(toeBal));

  // Check reserves
  try {
    const [r0, r1] = await dex.getReserves(TOKENS.TIK, TOKENS.TOE);
    console.log("Reserves TIK-TOE:", ethers.formatEther(r0), ethers.formatEther(r1));
  } catch (e) {
    console.log("getReserves failed:", e.message);
  }

  // Allowance
  const allowance = await tik.allowance(user, dexAddress);
  console.log("Allowance TIK->DEX:", ethers.formatEther(allowance));

  const amountIn = ethers.parseEther("1");
  if (allowance < amountIn) {
    console.log("Approving 1 TIK...");
    const txa = await tik.approve(dexAddress, amountIn);
    await txa.wait();
  }

  // Quote
  try {
    const out = await dex.getAmountOut(amountIn, TOKENS.TIK, TOKENS.TOE);
    console.log("Quote out TOE:", ethers.formatEther(out));
  } catch (e) {
    console.log("getAmountOut failed:", e.message);
  }

  // Try static call to catch revert reason
  try {
    const out = await dex.callStatic.swapExactTokensForTokens(TOKENS.TIK, TOKENS.TOE, amountIn, user);
    console.log("Static swap would out:", ethers.formatEther(out));
  } catch (e) {
    console.log("Static swap revert:", e?.reason || e?.data || e?.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



