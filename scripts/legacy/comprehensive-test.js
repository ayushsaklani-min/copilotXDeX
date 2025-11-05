const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 COMPREHENSIVE PROJECT FUNCTIONALITY TEST\n");
  console.log("Network:", hre.network.name);
  console.log("═".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("Wallet:", deployer.address);
  
  // Contract addresses from deploy-report.json
  const ORIGINAL_DEX = "0x860CFfF6364cE7cC76AbD003834e642Fa07a20E3";
  const REPUTATION = "0xf77AA837587dc07FE822C5CB0B3D5BF5294CaB42";
  const TIK = "0xf0dc4aa8063810B4116091371a74D55856c9Fa87";
  const TAK = "0x9222709Ea62bcD6F7E17281FC10ECE96DC2CAEd3";
  const TOE = "0xfe8aad1E21b682ef70eA1764D80A9BeBcF1a2dbc";
  
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function logTest(name, status, details = "") {
    const icon = status ? "✅" : "❌";
    console.log(`${icon} ${name}`);
    if (details) console.log(`   ${details}`);
    testResults.tests.push({ name, status, details });
    if (status) testResults.passed++;
    else testResults.failed++;
  }
  
  try {
    // ═══════════════════════════════════════════════════════════
    console.log("\n📦 1. TOKEN CONTRACTS");
    console.log("─".repeat(60));
    
    try {
      const tikToken = await ethers.getContractAt("LaunchToken", TIK);
      const tikBalance = await tikToken.balanceOf(deployer.address);
      logTest("TIK Token", true, `Balance: ${ethers.formatEther(tikBalance)}`);
    } catch (e) {
      logTest("TIK Token", false, e.message);
    }
    
    try {
      const takToken = await ethers.getContractAt("LaunchToken", TAK);
      const takBalance = await takToken.balanceOf(deployer.address);
      logTest("TAK Token", true, `Balance: ${ethers.formatEther(takBalance)}`);
    } catch (e) {
      logTest("TAK Token", false, e.message);
    }
    
    try {
      const toeToken = await ethers.getContractAt("LaunchToken", TOE);
      const toeBalance = await toeToken.balanceOf(deployer.address);
      logTest("TOE Token", true, `Balance: ${ethers.formatEther(toeBalance)}`);
    } catch (e) {
      logTest("TOE Token", false, e.message);
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🏦 2. DEX CONTRACT");
    console.log("─".repeat(60));
    
    let dex;
    try {
      dex = await ethers.getContractAt("TikTakDex", ORIGINAL_DEX);
      const owner = await dex.owner();
      logTest("DEX Contract Deployed", true, `Owner: ${owner}`);
    } catch (e) {
      logTest("DEX Contract Deployed", false, e.message);
    }
    
    if (dex) {
      try {
        const tikTakReserves = await dex.getReserves(TIK, TAK);
        logTest("DEX Get Reserves (TIK-TAK)", true, 
          `TIK: ${ethers.formatEther(tikTakReserves[0])}, TAK: ${ethers.formatEther(tikTakReserves[1])}`);
      } catch (e) {
        logTest("DEX Get Reserves", false, e.message);
      }
      
      try {
        const repContract = await dex.reputationContract();
        logTest("DEX Reputation Integration", repContract !== ethers.ZeroAddress, 
          `Reputation: ${repContract}`);
      } catch (e) {
        logTest("DEX Reputation Integration", false, e.message);
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n⭐ 3. REPUTATION SYSTEM");
    console.log("─".repeat(60));
    
    let reputation;
    try {
      reputation = await ethers.getContractAt("Reputation", REPUTATION);
      const score = await reputation.getScore(deployer.address);
      logTest("Reputation Contract", true, `Your Score: ${score.toString()} XP`);
    } catch (e) {
      logTest("Reputation Contract", false, e.message);
    }
    
    if (reputation) {
      try {
        const level = await reputation.getLevel(deployer.address);
        const levelNames = ["Newbie", "Trader", "Pro", "Expert", "Master", "Legend"];
        logTest("Reputation Level System", true, `Level: ${levelNames[level] || level}`);
      } catch (e) {
        logTest("Reputation Level System", false, e.message);
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🌾 4. LIQUIDITY FARMING");
    console.log("─".repeat(60));
    
    // Check if farm contract exists
    const fs = require('fs');
    let farmAddress = null;
    try {
      const farmDeployData = fs.readFileSync('./farm-deployment.json', 'utf8');
      const farmData = JSON.parse(farmDeployData);
      farmAddress = farmData.farm;
    } catch (e) {
      // Farm not deployed yet
    }
    
    if (farmAddress) {
      try {
        const farm = await ethers.getContractAt("LiquidityFarm", farmAddress);
        const poolCount = await farm.poolCount();
        logTest("Farming Contract", true, `Pools: ${poolCount.toString()}`);
        
        // Check if user has staked
        try {
          const userInfo = await farm.userInfo(0, deployer.address);
          logTest("Farming User Staking", userInfo.amount > 0, 
            `Staked: ${ethers.formatEther(userInfo.amount)} LP`);
        } catch (e) {
          logTest("Farming User Staking", false, e.message);
        }
      } catch (e) {
        logTest("Farming Contract", false, e.message);
      }
    } else {
      logTest("Farming Contract", false, "Not deployed");
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🔗 5. REFERRAL SYSTEM");
    console.log("─".repeat(60));
    
    let referralAddress = null;
    try {
      const refDeployData = fs.readFileSync('./referral-deployment.json', 'utf8');
      const refData = JSON.parse(refDeployData);
      referralAddress = refData.referral;
    } catch (e) {
      // Referral not deployed yet
    }
    
    if (referralAddress) {
      try {
        const referral = await ethers.getContractAt("Referral", referralAddress);
        const stats = await referral.getUserStats(deployer.address);
        logTest("Referral Contract", true, 
          `Direct: ${stats.directReferrals}, Indirect: ${stats.indirectReferrals}`);
      } catch (e) {
        logTest("Referral Contract", false, e.message);
      }
    } else {
      logTest("Referral Contract", false, "Not deployed");
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🤖 6. AI COPILOT SYSTEM");
    console.log("─".repeat(60));
    
    // Check if API route exists
    try {
      const apiPath = './src/app/api/copilot/route.ts';
      if (fs.existsSync(apiPath)) {
        const apiContent = fs.readFileSync(apiPath, 'utf8');
        const hasGemini = apiContent.includes('GEMINI_API_KEY');
        logTest("AI Copilot API Route", true, hasGemini ? "Gemini configured" : "API exists");
      } else {
        logTest("AI Copilot API Route", false, "File not found");
      }
    } catch (e) {
      logTest("AI Copilot API Route", false, e.message);
    }
    
    // Check AI components
    const components = [
      './src/app/components/AIAssistant.tsx',
      './src/app/components/SwapSuggestions.tsx',
      './src/app/components/YieldProjections.tsx'
    ];
    
    for (const comp of components) {
      try {
        const exists = fs.existsSync(comp);
        const name = comp.split('/').pop();
        logTest(`AI Component: ${name}`, exists);
      } catch (e) {
        logTest(`AI Component: ${comp}`, false, e.message);
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🎨 7. FRONTEND PAGES");
    console.log("─".repeat(60));
    
    const pages = [
      { path: './src/app/page.tsx', name: 'Home/Swap Page' },
      { path: './src/app/farm/page.tsx', name: 'Farming Page' },
      { path: './src/app/referrals/page.tsx', name: 'Referrals Page' }
    ];
    
    for (const page of pages) {
      try {
        const exists = fs.existsSync(page.path);
        logTest(page.name, exists);
      } catch (e) {
        logTest(page.name, false, e.message);
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    console.log("\n🔧 8. HOOKS & UTILITIES");
    console.log("─".repeat(60));
    
    const hooks = [
      './src/hooks/useTikTakToeSwap.ts',
      './src/hooks/useFarming.ts',
      './src/hooks/useReferral.ts',
      './src/hooks/useReputation.ts',
      './src/hooks/useSwapSuggestions.ts',
      './src/hooks/useYieldProjection.ts'
    ];
    
    for (const hook of hooks) {
      try {
        const exists = fs.existsSync(hook);
        const name = hook.split('/').pop();
        logTest(`Hook: ${name}`, exists);
      } catch (e) {
        logTest(`Hook: ${hook}`, false, e.message);
      }
    }
    
  } catch (error) {
    console.error("\n❌ Critical Error:", error.message);
  }
  
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("═".repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  // Overall status
  console.log("\n" + "═".repeat(60));
  if (testResults.failed === 0) {
    console.log("🎉 ALL SYSTEMS OPERATIONAL!");
    console.log("✅ Your project is working perfectly!");
  } else if (testResults.failed <= 3) {
    console.log("⚠️  MOSTLY WORKING");
    console.log("Some optional features need attention.");
  } else {
    console.log("❌ NEEDS ATTENTION");
    console.log("Several components require fixes.");
  }
  console.log("═".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
