const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pairs = [
  ['packages/market-core/index.js', 'public/shared/market-core.js'],
  ['packages/market-client/index.js', 'public/shared/market-client.js'],
  ['packages/market-core/index.js', 'dist/sdk/market-core.js'],
  ['packages/market-client/index.js', 'dist/sdk/market-client.js'],
  ['public/ui.config.js', 'dist/sdk/ui.config.js']
];
const checking = process.argv.includes('--check');
for (const [source, target] of pairs) {
  const from = path.join(root, source), to = path.join(root, target);
  const content = fs.readFileSync(from);
  if (checking) {
    if (!fs.existsSync(to) || !content.equals(fs.readFileSync(to))) {
      throw new Error('Build artifact differs: ' + target + '. Run npm run build.');
    }
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, content);
  }
}
console.log(checking ? 'Shared source artifacts are current.' : 'Built browser modules and portable SDK.');
