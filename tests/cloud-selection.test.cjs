const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../packages/market-core');
const { selectCloudStocks, stockMarketCap, normalizeCloudLimit } = require('../web/cloud-selection');

test('云图按各板块总市值选取，保留不足限额的板块和原始对象', () => {
  const input = Object.freeze([
    { board: '电子', code6: '000003', value: 10 },
    { board: '银行', code6: '600003', value: 200 },
    { board: '电子', code6: '000001', value: 100 },
    { board: '综合', code6: '600009', value: 1 },
    { board: '银行', code6: '600001', value: 400 },
    { board: '电子', code6: '000002', value: 50 },
    { board: '银行', code6: '600002', value: 300 }
  ].map(Object.freeze));
  const before = JSON.stringify(input);
  const selected = selectCloudStocks(input, 2);
  assert.deepEqual(selected.filter(s => s.board === '电子').map(s => s.code6), ['000001', '000002']);
  assert.deepEqual(selected.filter(s => s.board === '银行').map(s => s.code6), ['600001', '600002']);
  assert.equal(selected.find(s => s.board === '综合'), input[3]);
  assert.equal(selected.length, 5, 'limit applies to each sector, not the entire market');
  assert.ok(selected.every(stock => input.includes(stock)), 'prices, names and market caps are not synthesized');
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(selectCloudStocks([], 30), []);
});

test('同市值股票按代码稳定选择，不受查询输入顺序影响', () => {
  const input = ['000003', '000001', '000002'].map(code6 => ({ board: '电子', code6, value: 100 }));
  const left = selectCloudStocks(input, 2).map(s => s.code6);
  const right = selectCloudStocks([...input].reverse(), 2).map(s => s.code6);
  assert.deepEqual(left, ['000001', '000002']);
  assert.deepEqual(right, left);
});

test('总市值优先于原始面积权重，缺失总市值时回退并校验可编辑数量', () => {
  const input = [
    { board: '电子', code6: '000001', value: 900, totalMarketCap: 100 },
    { board: '电子', code6: '000002', value: 20, totalMarketCap: 800 },
    { board: '电子', code6: '000003', value: 500 }
  ];
  assert.deepEqual(selectCloudStocks(input, 2).map(s => s.code6), ['000002', '000003']);
  assert.equal(stockMarketCap(input[0]), 100);
  assert.equal(stockMarketCap(input[2]), 500);
  assert.equal(stockMarketCap({ value: 8, totalMarketCap: 0 }), 0);
  assert.equal(stockMarketCap({ value: 8, totalMarketCap: null }), 8);
  assert.equal(stockMarketCap({ value: 8, totalMarketCap: NaN }), 8);
  assert.equal(stockMarketCap({ value: -8 }), 0);
  assert.deepEqual([undefined, NaN, Infinity, 0, -1, 2.7, 101].map(v => normalizeCloudLimit(v)), [30, 30, 30, 1, 1, 3, 100]);
});

test('先筛选涨停池再选板块前列，不丢失低市值的涨停标的', () => {
  const children = Array.from({ length: 35 }, (_, i) => ({ code: String(i + 1).padStart(6, '0'), name: `样本${i + 1}`, value: 1000 - i }));
  const model = Core.createMarketModel({ schemaVersion: 1, treemap: { nodes: [{ name: '电子', children }] }, limit: [{ stock_code: '000035', lu_days: 1 }] });
  assert.equal(selectCloudStocks(model.queryStocks()).length, 30);
  assert.ok(!selectCloudStocks(model.queryStocks()).some(s => s.code6 === '000035'));
  assert.deepEqual(selectCloudStocks(model.queryStocks({ pool: 'limit' })).map(s => s.code6), ['000035']);
  assert.deepEqual(selectCloudStocks(model.queryStocks({ q: '000035' })).map(s => s.code6), ['000035']);
  assert.equal(model.stocks.length, 35);
});

test('真实样本默认展示921只，完整查询仍有5566只且行业聚焦沿用前30', () => {
  const context = vm.createContext({ window: {} });
  for (const name of ['treemap', 'limit']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/data', name + '.js'), 'utf8'), context);
  }
  const model = Core.createMarketModel(Core.fromLegacyGlobals(context.window));
  const all = model.queryStocks(), selected = selectCloudStocks(all);
  assert.equal(all.length, 5566);
  assert.equal(selected.length, 921);
  assert.equal(selectCloudStocks(all, 10).length, 311);
  assert.equal(selected.filter(s => s.board === '综合').length, 20);
  assert.equal(selected.filter(s => s.board === '').length, 1);
  const electronic = selectCloudStocks(model.queryStocks({ industry: '电子' }));
  assert.equal(electronic.length, 30);
  assert.ok(electronic.some(s => s.code6 === '001399'), '惠科股份 is rank30 by total market cap, despite a small original area weight');
  assert.ok(!electronic.some(s => s.code6 === '688082'), '盛美上海 is rank31 by total market cap');
  assert.ok(!selected.some(s => s.code6 === '688521'));
  assert.equal(model.queryStocks({ q: '688521' })[0].name, '芯原股份');
  for (const pool of ['limit', 'lianban', 'first', 'big']) {
    const source = model.queryStocks({ pool });
    assert.equal(selectCloudStocks(source).length, source.length, `${pool} remains complete because no sector exceeds 30`);
  }
});
