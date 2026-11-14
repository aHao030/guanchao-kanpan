const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const entries = ['server.js', 'server', 'packages', 'public', 'scripts', 'examples'];
const files = [];
function collect(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) return;
  if (fs.statSync(target).isDirectory()) {
    if (['public/data', 'public/vendor', 'public/shared'].includes(relative.replace(/\\/g, '/'))) return;
    for (const name of fs.readdirSync(target)) collect(path.join(relative, name));
  } else if (/\.(c?js)$/.test(relative)) files.push(target);
}
entries.forEach(collect);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) { process.stderr.write(result.stderr || 'Syntax check failed: ' + file); process.exit(1); }
}
const artifacts = spawnSync(process.execPath, [path.join(__dirname, 'build.cjs'), '--check'], { encoding: 'utf8', windowsHide: true });
process.stdout.write(artifacts.stdout);
if (artifacts.status !== 0) { process.stderr.write(artifacts.stderr); process.exit(1); }
console.log('Checked ' + files.length + ' source files.');
