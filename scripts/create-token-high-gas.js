const hre = require("hardhat");
const { ethers } = require("hardhat");

const BONDING_CURVE_FACTORY = "0x07e76C0667879a069D56cFC9019B63fC6F2DBfa5";

async function main() {
  console.log("🚀 Creating Test Token with High Gas Limit...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  const factory = await ethers.getContractAt("BondingCurveFactory", BONDING_CURVE_FACTORY);
  
  const tokenName = "MegaCoin";
  const tokenSymbol = "MEGA";
  const curveType = 0; // LINEAR
  const initialPrice = ethers.parseEther("0.001");
  const creatorRoyalty = 2;
  const metadata = "";
  const creationFee = ethers.parseEther("0.01");
  
  console.log("Creating token with 10M gas limit...\n");
  
  try {
    // Estimate gas first
    console.log("Estimating gas...");
    const gasEstimate = await factory.createToken.estimateGas(
      tokenName,
      tokenSymbol,
      curveType,
      initialPrice,
      creatorRoyalty,
      metadata,
      { value: creationFee }
    );
    console.log("Gas estimate:", gasEstimate.toString());
    
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
    
    // Try to call statically to get revert reason
    try {
      await factory.createToken.staticCall(
        tokenName,
        tokenSymbol,
        curveType,
        initialPrice,
        creatorRoyalty,
        metadata,
        { value: creationFee }
      );
    } catch (staticError) {
      console.log("Static call error:", staticError.message);
      if (staticError.data) {
        console.log("Error data:", staticError.data);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
