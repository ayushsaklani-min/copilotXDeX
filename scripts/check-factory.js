
const { ethers } = require("hardhat");

async function main() {
  const factoryAddress = "0x07e76C0667879a069D56cFC9019B63fC6F2DBfa5";
  const userAddress = "0x48E802B095aE54D620021df91033796d36150bd9"; // From screenshot (inferred, need to be careful)
  // Actually, I can't infer the full address from 0x48E8...0bd9. 
  // But I can check the token address directly.
  const tokenAddress = "0xc93ac9d14a4b011a26053968e6eee7a1666fa2ba";

  console.log("Checking factory at:", factoryAddress);
  console.log("Checking token:", tokenAddress);

  const Factory = await ethers.getContractFactory("BondingCurveFactoryV2");
  const factory = Factory.attach(factoryAddress);

  // Check if token is in allTokens
  const totalTokens = await factory.getTotalTokens();
  console.log("Total tokens:", totalTokens.toString());

  // Check token info
  const tokenInfo = await factory.getTokenInfo(tokenAddress);
  console.log("Token Info:", tokenInfo);

  if (tokenInfo.tokenAddress === "0x0000000000000000000000000000000000000000") {
    console.log("Token is NOT registered in factory.");
  } else {
    console.log("Token IS registered in factory.");
    console.log("Creator:", tokenInfo.creator);
  }

  // Check creator tokens if we had the full address
  // const creatorTokens = await factory.getCreatorTokens(userAddress);
  // console.log("Creator tokens:", creatorTokens);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
