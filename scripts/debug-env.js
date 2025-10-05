require("dotenv").config();

console.log("RPC_URL:", JSON.stringify(process.env.RPC_URL));
console.log("PRIVATE_KEY length:", process.env.PRIVATE_KEY?.length);
console.log("PRIVATE_KEY first 10 chars:", process.env.PRIVATE_KEY?.substring(0, 10));
console.log("PRIVATE_KEY last 10 chars:", process.env.PRIVATE_KEY?.substring(process.env.PRIVATE_KEY.length - 10));

// Test if it's a valid private key
try {
  const { ethers } = require("ethers");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log("✅ Private key is valid, address:", wallet.address);
} catch (error) {
  console.log("❌ Private key is invalid:", error.message);
}
