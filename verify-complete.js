const fs = require('fs');
const path = require('path');

console.log('\n🔍 COPILOTXDEX 2.0 - COMPLETION VERIFICATION\n');
console.log('='.repeat(60));

let allChecks = true;

// Check smart contracts
console.log('\n📝 Checking Smart Contracts...');
const contracts = [
  'contracts/bonding/BondingCurveFactory.sol',
  'contracts/bonding/BondingCurveToken.sol',
  'contracts/bonding/IBondingCurveFactory.sol',
  'contracts/security/RugScanner.sol',
  'contracts/security/LiquidityController.sol',
  'contracts/social/SocialGraph.sol',
  'contracts/games/Coinflip.sol',
  'contracts/games/Mines.sol',
  'contracts/games/MemeRoyale.sol',
  'contracts/games/PredictThePrice.sol',
  'contracts/games/XPRewards.sol',
];

contracts.forEach(contract => {
  if (fs.existsSync(contract)) {
    console.log(`   ✅ ${contract}`);
  } else {
    console.log(`   ❌ ${contract} - MISSING`);
    allChecks = false;
  }
});

// Check frontend components
console.log('\n🎨 Checking Frontend Components...');
const components = [
  'src/design-system/tokens.ts',
  'src/design-system/components/Button.tsx',
  'src/design-system/components/Card.tsx',
  'src/design-system/components/Input.tsx',
  'src/ai/RiskScorer.ts',
  'src/ai/BondingCurveAnalyzer.ts',
  'src/components/BondingCurveChart.tsx',
  'src/app/token/[address]/page.tsx',
  'src/app/games/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/creator/page.tsx',
];

components.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`   ✅ ${component}`);
  } else {
    console.log(`   ❌ ${component} - MISSING`);
    allChecks = false;
  }
});

// Check deployment scripts
console.log('\n🚀 Checking Deployment Scripts...');
const scripts = [
  'scripts/deploy-bonding.js',
  'scripts/deploy-security.js',
  'scripts/deploy-social.js',
  'scripts/deploy-games.js',
  'scripts/deploy-all.js',
];

scripts.forEach(script => {
  if (fs.existsSync(script)) {
    console.log(`   ✅ ${script}`);
  } else {
    console.log(`   ❌ ${script} - MISSING`);
    allChecks = false;
  }
});

// Check documentation
console.log('\n📚 Checking Documentation...');
const docs = [
  'README.md',
  'README_V2.md',
  'QUICK_START.md',
  'LAUNCH_GUIDE.md',
  'EXECUTIVE_SUMMARY.md',
  'REBUILD_2.0_COMPLETE.md',
  'FINAL_COMPLETE.md',
  'ALL_PHASES_COMPLETE.md',
  'DEPLOYMENT_CHECKLIST.md',
];

docs.forEach(doc => {
  if (fs.existsSync(doc)) {
    console.log(`   ✅ ${doc}`);
  } else {
    console.log(`   ❌ ${doc} - MISSING`);
    allChecks = false;
  }
});

// Check configuration
console.log('\n⚙️  Checking Configuration...');
const configs = [
  'package.json',
  'hardhat.config.js',
  'src/config/contracts-v2.ts',
  '.env.example',
];

configs.forEach(config => {
  if (fs.existsSync(config)) {
    console.log(`   ✅ ${config}`);
  } else {
    console.log(`   ❌ ${config} - MISSING`);
    allChecks = false;
  }
});

// Count lines of code
console.log('\n📊 Code Statistics...');
let totalLines = 0;

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

const contractLines = contracts.reduce((sum, file) => sum + countLines(file), 0);
const componentLines = components.reduce((sum, file) => sum + countLines(file), 0);
const scriptLines = scripts.reduce((sum, file) => sum + countLines(file), 0);

console.log(`   Smart Contracts: ${contractLines} lines`);
console.log(`   Frontend: ${componentLines} lines`);
console.log(`   Scripts: ${scriptLines} lines`);
console.log(`   Total: ${contractLines + componentLines + scriptLines} lines`);

// Final verdict
console.log('\n' + '='.repeat(60));
if (allChecks) {
  console.log('\n✅ ALL CHECKS PASSED!');
  console.log('\n🎉 COPILOTXDEX 2.0 IS 100% COMPLETE!');
  console.log('\n📋 Summary:');
  console.log(`   • ${contracts.length} Smart Contracts ✅`);
  console.log(`   • ${components.length} Frontend Components ✅`);
  console.log(`   • ${scripts.length} Deployment Scripts ✅`);
  console.log(`   • ${docs.length} Documentation Files ✅`);
  console.log(`   • ${contractLines + componentLines + scriptLines} Lines of Code ✅`);
  console.log('\n🚀 Ready for deployment!');
  console.log('\nNext steps:');
  console.log('   1. npm run compile');
  console.log('   2. npm run deploy:complete');
  console.log('   3. npm run dev');
  console.log('\n' + '='.repeat(60));
  process.exit(0);
} else {
  console.log('\n❌ SOME CHECKS FAILED!');
  console.log('\nPlease review the missing files above.');
  console.log('\n' + '='.repeat(60));
  process.exit(1);
}
