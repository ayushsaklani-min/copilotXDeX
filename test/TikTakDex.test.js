const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TikTakDex", function () {
  let tikTakDex;
  let tikTakLP;
  let owner;
  let user1;
  let user2;
  let token0;
  let token1;

  // Mock ERC20 tokens for testing
  const MockERC20 = {
    name: "MockToken",
    symbol: "MOCK",
    decimals: 18,
    totalSupply: ethers.parseEther("1000000"),
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    token0 = await ERC20Factory.deploy("Token0", "TK0", ethers.parseEther("1000000"));
    token1 = await ERC20Factory.deploy("Token1", "TK1", ethers.parseEther("1000000"));

    // Deploy TikTakDex
    const TikTakDexFactory = await ethers.getContractFactory("TikTakDex");
    tikTakDex = await TikTakDexFactory.deploy();

    // Add supported tokens
    await tikTakDex.addSupportedTokens([await token0.getAddress(), await token1.getAddress()]);

    // Create pair
    await tikTakDex.createPair(await token0.getAddress(), await token1.getAddress());

    // Transfer tokens to users for testing
    await token0.transfer(user1.address, ethers.parseEther("10000"));
    await token1.transfer(user1.address, ethers.parseEther("10000"));
    await token0.transfer(user2.address, ethers.parseEther("10000"));
    await token1.transfer(user2.address, ethers.parseEther("10000"));
  });

  describe("Pair Creation", function () {
    it("Should create a pair successfully", async function () {
      const pairKey = await tikTakDex.getPairKey(await token0.getAddress(), await token1.getAddress());
      const pair = await tikTakDex.getPair(pairKey);
      
      expect(pair.token0).to.equal(await token0.getAddress());
      expect(pair.token1).to.equal(await token1.getAddress());
      expect(pair.reserve0).to.equal(0);
      expect(pair.reserve1).to.equal(0);
    });

    it("Should not allow creating duplicate pairs", async function () {
      await expect(
        tikTakDex.createPair(await token0.getAddress(), await token1.getAddress())
      ).to.be.revertedWith("TikTakDex: PAIR_EXISTS");
    });
  });

  describe("Liquidity Management", function () {
    it("Should add liquidity successfully", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");

      // Approve tokens
      await token0.connect(user1).approve(await tikTakDex.getAddress(), amount0);
      await token1.connect(user1).approve(await tikTakDex.getAddress(), amount1);

      // Add liquidity
      await tikTakDex.connect(user1).addLiquidity(
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        user1.address
      );

      // Check reserves
      const [reserve0, reserve1] = await tikTakDex.getReserves(
        await token0.getAddress(),
        await token1.getAddress()
      );

      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);
    });

    it("Should remove liquidity successfully", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");

      // Add liquidity first
      await token0.connect(user1).approve(await tikTakDex.getAddress(), amount0);
      await token1.connect(user1).approve(await tikTakDex.getAddress(), amount1);
      await tikTakDex.connect(user1).addLiquidity(
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        user1.address
      );

      // Get LP token address
      const pairKey = await tikTakDex.getPairKey(await token0.getAddress(), await token1.getAddress());
      const pair = await tikTakDex.getPair(pairKey);
      const lpToken = await ethers.getContractAt("TikTakLP", pair.lpToken);

      // Get LP balance
      const lpBalance = await lpToken.balanceOf(user1.address);

      // Remove liquidity
      await tikTakDex.connect(user1).removeLiquidity(
        await token0.getAddress(),
        await token1.getAddress(),
        lpBalance,
        user1.address
      );

      // Check reserves are back to 0
      const [reserve0, reserve1] = await tikTakDex.getReserves(
        await token0.getAddress(),
        await token1.getAddress()
      );

      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);
    });
  });

  describe("Swapping", function () {
    beforeEach(async function () {
      // Add initial liquidity
      const amount0 = ethers.parseEther("10000");
      const amount1 = ethers.parseEther("20000");

      await token0.connect(user1).approve(await tikTakDex.getAddress(), amount0);
      await token1.connect(user1).approve(await tikTakDex.getAddress(), amount1);
      await tikTakDex.connect(user1).addLiquidity(
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        user1.address
      );
    });

    it("Should calculate correct amount out", async function () {
      const amountIn = ethers.parseEther("100");
      const amountOut = await tikTakDex.getAmountOut(
        amountIn,
        await token0.getAddress(),
        await token1.getAddress()
      );

      expect(amountOut).to.be.gt(0);
      expect(amountOut).to.be.lt(amountIn * 2n); // Should be less than 2x due to fees
    });

    it("Should execute swap successfully", async function () {
      const amountIn = ethers.parseEther("100");
      const expectedAmountOut = await tikTakDex.getAmountOut(
        amountIn,
        await token0.getAddress(),
        await token1.getAddress()
      );

      // Approve token
      await token0.connect(user2).approve(await tikTakDex.getAddress(), amountIn);

      // Execute swap
      await tikTakDex.connect(user2).swapExactTokensForTokens(
        await token0.getAddress(),
        await token1.getAddress(),
        amountIn,
        user2.address
      );

      // Check user2 received tokens
      const user2Token1Balance = await token1.balanceOf(user2.address);
      expect(user2Token1Balance).to.be.gt(ethers.parseEther("10000")); // Original + swapped amount
    });
  });

  describe("Fee Distribution", function () {
    it("Should apply correct fees", async function () {
      const amountIn = ethers.parseEther("1000");
      
      // Get reserves before swap
      const [reserve0Before, reserve1Before] = await tikTakDex.getReserves(
        await token0.getAddress(),
        await token1.getAddress()
      );

      // Execute swap
      await token0.connect(user2).approve(await tikTakDex.getAddress(), amountIn);
      await tikTakDex.connect(user2).swapExactTokensForTokens(
        await token0.getAddress(),
        await token1.getAddress(),
        amountIn,
        user2.address
      );

      // Get reserves after swap
      const [reserve0After, reserve1After] = await tikTakDex.getReserves(
        await token0.getAddress(),
        await token1.getAddress()
      );

      // Check that reserves increased (fees accumulated)
      expect(reserve0After).to.be.gt(reserve0Before);
    });
  });
});

// Mock ERC20 contract for testing
contract("MockERC20", function () {
  let mockToken;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("MockToken", "MOCK", ethers.parseEther("1000000"));
  });

  it("Should have correct initial supply", async function () {
    const totalSupply = await mockToken.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000000"));
  });

  it("Should transfer tokens correctly", async function () {
    const amount = ethers.parseEther("1000");
    await mockToken.transfer(user1.address, amount);
    
    const user1Balance = await mockToken.balanceOf(user1.address);
    expect(user1Balance).to.equal(amount);
  });
});
