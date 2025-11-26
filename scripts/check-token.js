
const { ethers } = require("hardhat");

async function main() {
    const tokenAddress = "0xc93ac9d14a4b011a26053968e6eee7a1666fa2ba";

    console.log("Checking token contract at:", tokenAddress);

    const Token = await ethers.getContractFactory("BondingCurveToken");
    const token = Token.attach(tokenAddress);

    try {
        const name = await token.name();
        const symbol = await token.symbol();
        const curveType = await token.curveType();
        const creator = await token.creator();

        console.log("Token Name:", name);
        console.log("Token Symbol:", symbol);
        console.log("Curve Type:", curveType.toString());
        console.log("Creator:", creator);
    } catch (e) {
        console.error("Failed to read from token contract:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
