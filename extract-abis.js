const fs = require('fs');

const contracts = ['Coinflip', 'Mines', 'XPRewards'];

contracts.forEach(name => {
  const artifact = JSON.parse(
    fs.readFileSync(`artifacts/contracts/games/${name}.sol/${name}.json`, 'utf8')
  );
  fs.writeFileSync(
    `src/config/abis/${name}.json`,
    JSON.stringify(artifact.abi, null, 2)
  );
  console.log(`✅ Extracted ${name} ABI`);
});

console.log('\n✅ All ABIs extracted successfully!');
