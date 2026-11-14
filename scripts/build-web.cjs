const esbuild = require('esbuild');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const result = esbuild.buildSync({
  absWorkingDir: root, entryPoints: ['web/main.jsx'], bundle: true, minify: true,
  outfile: 'public/workbench.js', format: 'iife', target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked', write: false
});
for (const file of result.outputFiles) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file.path) || !fs.readFileSync(file.path).equals(Buffer.from(file.contents))) throw new Error('Web build is stale: ' + file.path);
  } else fs.writeFileSync(file.path, file.contents);
}
console.log(process.argv.includes('--check') ? 'React application build is current.' : 'Built Ant Design + ECharts application.');
