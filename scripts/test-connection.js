const hre = require("hardhat");

async function main() {
  console.log("🔍 Testing network connection...");
  
  try {
    // Get the provider
    const provider = hre.ethers.provider;
    console.log("✅ Provider created");
    
    // Get network info
    const network = await provider.getNetwork();
    console.log("✅ Network:", network.name, "Chain ID:", network.chainId.toString());
    
    // Get signers
    const signers = await hre.ethers.getSigners();
    console.log("✅ Signers found:", signers.length);
    
    if (signers.length > 0) {
      const signer = signers[0];
      console.log("✅ Signer address:", await signer.getAddress());
      
      // Get balance
      const balance = await provider.getBalance(await signer.getAddress());
      console.log("✅ Balance:", hre.ethers.formatEther(balance), "MATIC");
      
      if (balance > 0) {
        console.log("✅ Ready to deploy!");
        return true;
      } else {
        console.log("❌ No MATIC balance for gas fees");
        return false;
      }
    } else {
      console.log("❌ No signers found");
      return false;
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    return false;
  }
}

main()
  .then((success) => {
    if (success) {
      console.log("\n🚀 Proceeding with deployment...");
      process.exit(0);
    } else {
      console.log("\n❌ Cannot proceed with deployment");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
