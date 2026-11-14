const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../packages/market-core');

function sample() {
  return {
    schemaVersion: 1,
    meta: { mode: 'sample', asOf: '2026-11-13', sources: ['fixture'] },
    treemap: { nodes: [
      { name: '科技', code: 'TECH', value: 1000, stockCount: 4, children: [
        { code: 'sz000003', name: '丙科技', value: 100, changePct: 4 },
        { code: 'sz000001', name: '甲科技', value: 500, changePct: 1 },
        { code: 'sz000002', name: '乙科技', value: 300, changePct: -2 },
        { code: 'sz000004', name: '丁科技', value: 100, changePct: 0 }
      ] },
      { name: '银行', code: 'BANK', value: 600, stockCount: 1, children: [
        { code: 'sh600001', name: '戊银行', value: 600, changePct: 2 }
      ] }
    ] },
    limit: { data: [
      { stock_code: '000003', lu_days: 1, first_lu_time: '09:31:00', lu_reason: '首板样本' },
      { stock_code: '000001', lu_days: 2, first_lu_time: '09:40:00' },
      { stock_code: '600001', lu_days: 3, first_lu_time: '09:29:00' }
    ] },
    auction: { data: [{ stock_code: '000001', na_amount: 99 }] },
    klineByCode: { '000001': { data: { daily_details: [{ date: '11-13', close: 10 }] } } }
  };
}

test('共享模型归一化代码和行业，同时保留原始市值及输入快照', () => {
  const snapshot = sample();
  const before = JSON.stringify(snapshot);
  const model = Core.createMarketModel(snapshot);
  const stock = model.stocks.find(item => item.code6 === '000001');
  assert.equal(stock.board, '科技');
  assert.equal(stock.boardCode, 'TECH');
  assert.equal(stock.value, 500);
  assert.deepEqual(model.boards[0].children.map(item => item.code6), ['000001', '000002', '000003', '000004']);
  assert.equal(model.boards[0].pct, 0.3);
  assert.equal(JSON.stringify(snapshot), before);
});

test('首板、连板和涨停池按同一份涨停记录分类并排序', () => {
  const model = Core.createMarketModel(sample());
  assert.deepEqual(model.pools.map(pool => [pool.id, pool.count]), [
    ['all', 5], ['limit', 3], ['lianban', 2], ['first', 1], ['big', 5]
  ]);
  assert.deepEqual(model.queryStocks({ pool: 'limit' }).map(stock => stock.code6), ['600001', '000001', '000003']);
  assert.deepEqual(model.queryStocks({ pool: 'first' }).map(stock => stock.code6), ['000003']);
  assert.deepEqual(model.queryStocks({ pool: 'lianban' }).map(stock => stock.code6), ['600001', '000001']);
});

test('查询组合标的池、行业、名称或代码，并支持市值和涨幅排序', () => {
  const model = Core.createMarketModel(sample());
  assert.deepEqual(model.queryStocks({ pool: 'limit', industry: 'TECH', q: '科技', sort: 'changePct' }).map(stock => stock.code6), ['000003', '000001']);
  assert.deepEqual(model.queryStocks({ industry: '银行', q: '600' }).map(stock => stock.code6), ['600001']);
  assert.deepEqual(model.queryStocks({ q: 'sz000002' }).map(stock => stock.code6), ['000002']);
  assert.deepEqual(model.queryStocks({ sort: 'marketCap' }).map(stock => stock.code6), ['600001', '000001', '000002', '000003', '000004']);
  assert.deepEqual(model.queryStocks({ industry: '不存在' }), []);
  assert.throws(() => model.queryStocks({ pool: 'missing' }), RangeError);
  assert.throws(() => model.queryStocks({ sort: 'missing' }), RangeError);
});

test('个股详情连接行情、涨停、竞价及K线，并明确缺失数据', () => {
  const model = Core.createMarketModel(sample());
  const detail = model.getStockDetail('SZ000001');
  assert.equal(detail.stock.name, '甲科技');
  assert.equal(detail.limitUp.lu_days, 2);
  assert.equal(detail.auction.na_amount, 99);
  assert.deepEqual(detail.kline.daily_details, [{ date: '11-13', close: 10 }]);
  const missingSeries = model.getStockDetail('000002');
  assert.equal(missingSeries.limitUp, null);
  assert.equal(missingSeries.auction, null);
  assert.equal(missingSeries.kline, null);
  assert.equal(model.getStockDetail('999999'), null);
});

test('旧样本入口保留原始数据封装，生成带日期和模式的统一快照', () => {
  const fixture = sample();
  const legacy = {
    TREEMAP: fixture.treemap,
    OVERVIEW: { markets: [{ market: 'all', changePct: -1 }] },
    SUMMARY_ALL: { market: 'all', summary: { advanceCount: 2 } },
    DASHBOARD: { data: { latest_date: '20261113', current: { total_score: 32 } } },
    LIMIT: fixture.limit,
    CALL: fixture.auction,
    KLINE_600519: { data: { daily_details: [{ date: '11-13', close: 100 }] } },
    MARKET_EXTRA: [{ market: 'hk', pct: -1 }]
  };
  const snapshot = Core.fromLegacyGlobals(legacy);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.meta.mode, 'sample');
  assert.equal(snapshot.meta.asOf, '2026-11-13');
  assert.deepEqual(snapshot.summary, legacy.SUMMARY_ALL);
  assert.deepEqual(snapshot.dashboard, legacy.DASHBOARD);
  assert.deepEqual(snapshot.limit, legacy.LIMIT);
  assert.deepEqual(snapshot.auction, legacy.CALL);
  assert.deepEqual(snapshot.klineByCode['600519'], legacy.KLINE_600519);
  assert.deepEqual(snapshot.marketExtra, legacy.MARKET_EXTRA);
});

test('各端共享涨幅文本、涨跌分类和情绪阶段阈值', () => {
  assert.equal(Core.normalizeCode('SH600519'), '600519');
  assert.equal(Core.normalizeCode(null), '');
  assert.equal(Core.formatPct(1.236), '+1.24%');
  assert.equal(Core.formatPct(-1.236), '-1.24%');
  assert.equal(Core.formatPct(0), '+0.00%');
  assert.deepEqual([-0.006, -0.005, 0, 0.005, 0.006].map(Core.changeClass), ['down', '', '', '', 'up']);
  assert.deepEqual([24, 25, 44, 45, 59, 60, 77, 78].map(Core.emotionStage), ['冰点', '退潮', '退潮', '修复', '修复', '活跃', '活跃', '高潮']);
});

test('拒绝不支持的快照结构，空样本不伪造股票或日期', () => {
  assert.throws(() => Core.createMarketModel({ ...sample(), schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => Core.createMarketModel({ schemaVersion: 1, treemap: { nodes: {} } }), TypeError);
  const snapshot = Core.fromLegacyGlobals({});
  assert.equal(snapshot.meta.asOf, null);
  const model = Core.createMarketModel(snapshot);
  assert.deepEqual(model.queryStocks(), []);
  assert.deepEqual(model.pools.map(pool => pool.count), [0, 0, 0, 0, 0]);
  assert.equal(model.getStockDetail('600519'), null);
});

test('真实样本在共享核心中保留5566只股票及既有五个标的池口径', () => {
  const context = vm.createContext({ window: {} });
  for (const name of ['treemap', 'overview', 'summary_all', 'dashboard', 'limit', 'call', 'kline_600519', 'market_extra']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/data', name + '.js'), 'utf8'), context);
  }
  const snapshot = Core.fromLegacyGlobals(context.window);
  const model = Core.createMarketModel(snapshot);
  assert.equal(snapshot.meta.asOf, '2026-11-13');
  assert.equal(model.stocks.length, 5566);
  assert.deepEqual(model.pools.map(pool => [pool.id, pool.count]), [
    ['all', 5566], ['limit', 37], ['lianban', 7], ['first', 30], ['big', 50]
  ]);
  assert.deepEqual(model.queryStocks({ pool: 'big' }).slice(0, 3).map(stock => stock.code6), ['601288', '601398', '601857']);
  assert.equal(model.queryStocks({ q: '贵州茅台' })[0].code6, '600519');
  assert.equal(model.getStockDetail('600519').stock.name, '贵州茅台');
  assert.ok(model.getStockDetail('600519').kline.daily_details.length > 0);
  assert.equal(model.getStockDetail('601288').kline, null);
});

test('同一业务源码可在没有DOM和Node模块的脚本环境运行', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../packages/market-core/index.js'), 'utf8'), context);
  const core = context.MarketCore;
  assert.equal(core.formatPct(1.25), '+1.25%');
  const model = core.createMarketModel(sample());
  assert.equal(model.queryStocks({ pool: 'first' })[0].name, '丙科技');
  assert.equal(model.getStockDetail('000001').auction.na_amount, 99);
});
