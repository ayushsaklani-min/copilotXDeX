const hre = require("hardhat");
const fs = require("fs");

/**
 * Script to deploy a user's bonding curve token
 * Usage: npx hardhat run scripts/deploy-user-token.js --network amoy
 */

async function main() {
  console.log("🚀 Deploying User Bonding Curve Token...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Token parameters (customize these)
  const TOKEN_NAME = process.env.TOKEN_NAME || "My Token";
  const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || "MTK";
  const INITIAL_SUPPLY = process.env.INITIAL_SUPPLY || "1000000";
  const CURVE_TYPE = process.env.CURVE_TYPE || "0"; // 0=Linear, 1=Exponential, 2=Sigmoid
  const INITIAL_PRICE = process.env.INITIAL_PRICE || "0.001";

  console.log("\n📝 Token Parameters:");
  console.log("Name:", TOKEN_NAME);
  console.log("Symbol:", TOKEN_SYMBOL);
  console.log("Initial Supply:", INITIAL_SUPPLY);
  console.log("Curve Type:", CURVE_TYPE);
  console.log("Initial Price:", INITIAL_PRICE, "MATIC");

  // Deploy BondingCurveToken
  console.log("\n📝 Deploying BondingCurveToken...");
  const BondingCurveToken = await hre.ethers.getContractFactory("BondingCurveToken");
  
  const token = await BondingCurveToken.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    hre.ethers.parseEther(INITIAL_SUPPLY),
    CURVE_TYPE,
    hre.ethers.parseEther(INITIAL_PRICE),
    deployer.address // creator
  );
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ BondingCurveToken deployed to:", tokenAddress);

  // Register with factory
  const FACTORY_ADDRESS = "0x07e76C0667879a069D56cFC9019B63fC6F2DBfa5";
  console.log("\n🔗 Registering with BondingCurveFactory...");
  
  const factory = await hre.ethers.getContractAt("BondingCurveFactoryV2", FACTORY_ADDRESS);
  const creationFee = await factory.creationFee();
  
  const registerTx = await factory.registerToken(
    tokenAddress,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    CURVE_TYPE,
    hre.ethers.parseEther(INITIAL_PRICE),
    { value: creationFee }
  );
  
  await registerTx.wait();
  console.log("✅ Token registered with factory");

  // Save deployment data
  const deploymentData = {
    tokenAddress: tokenAddress,
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    initialSupply: INITIAL_SUPPLY,
    curveType: CURVE_TYPE,
    initialPrice: INITIAL_PRICE,
    creator: deployer.address,
    deployedAt: new Date().toISOString(),
    network: hre.network.name,
  };

  const filename = `token-${TOKEN_SYMBOL}-deployment.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));

  console.log("\n✅ Token Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("Token Address:", tokenAddress);
  console.log("Name:", TOKEN_NAME);
  console.log("Symbol:", TOKEN_SYMBOL);
  console.log("Curve Type:", CURVE_TYPE);
  console.log("\n💾 Deployment data saved to", filename);

  console.log("\n📝 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${tokenAddress} "${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${hre.ethers.parseEther(INITIAL_SUPPLY)}" "${CURVE_TYPE}" "${hre.ethers.parseEther(INITIAL_PRICE)}" "${deployer.address}"`);

  console.log("\n🎉 Your token is now live!");
  console.log("View it at: http://localhost:3000/token/" + tokenAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
