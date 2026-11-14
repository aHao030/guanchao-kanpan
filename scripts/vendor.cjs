const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules/d3-hierarchy');
const target = path.join(root, 'public/vendor');
fs.mkdirSync(target, { recursive: true });
for (const [from, to] of [['dist/d3-hierarchy.min.js', 'd3-hierarchy.min.js'], ['LICENSE', 'd3-hierarchy.LICENSE']]) {
  fs.copyFileSync(path.join(source, from), path.join(target, to));
}
console.log('Vendored d3-hierarchy 3.1.2 and its ISC license.');
