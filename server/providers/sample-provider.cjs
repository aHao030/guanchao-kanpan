const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const FIXTURE_FILES = [
  'treemap.js', 'overview.js', 'summary_all.js', 'dashboard.js',
  'limit.js', 'call.js', 'kline_600519.js', 'market_extra.js',
];

// These are trusted, checked-in assignment-only fixtures, never remote scripts.
function createSampleProvider({ dataDirectory = path.resolve(__dirname, '../../public/data') } = {}) {
  let snapshot;
  return {
    loadSnapshot() {
      if (!snapshot) {
        const legacy = {};
        const context = vm.createContext({ window: legacy }, { codeGeneration: { strings: false, wasm: false } });
        for (const name of FIXTURE_FILES) {
          const file = path.join(dataDirectory, name);
          vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: name, timeout: 1000 });
        }
        const { fromLegacyGlobals } = require('../../packages/market-core');
        const normalized = fromLegacyGlobals(legacy);
        snapshot = { ...normalized, meta: { ...normalized.meta, mode: 'sample' } };
      }
      return snapshot;
    },
  };
}

module.exports = { createSampleProvider };
