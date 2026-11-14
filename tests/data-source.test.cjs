const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../packages/market-core');
const clientSdk = require('../packages/market-client');
const { load } = require('../public/data-source');
const source = { TREEMAP: { nodes: [] }, DASHBOARD: { data: { latest_date: '20261113' } } };

test('直接打开本地页面使用内置样本而不请求HTTP', async () => {
  const snapshot = await load({ core, clientSdk, source, protocol: 'file:', fetchImplementation: () => { throw new Error('must not request'); } });
  assert.equal(snapshot.meta.transport, 'embedded');
  assert.equal(snapshot.meta.fallback, false);
  assert.equal(snapshot.meta.asOf, '2026-11-13');
});

test('HTTP页面读取统一API快照并保留样本日期', async () => {
  const apiSnapshot = core.fromLegacyGlobals(source);
  const snapshot = await load({ core, clientSdk, source: {}, protocol: 'http:', fetchImplementation: async url => {
    assert.equal(url, '/api/v1/snapshot');
    return { status: 200, json: async () => ({ data: apiSnapshot, meta: apiSnapshot.meta }) };
  } });
  assert.equal(snapshot.meta.transport, 'api');
  assert.equal(snapshot.meta.asOf, '2026-11-13');
});

test('服务不可用时显式标记样本兜底，严格API模式可禁用兜底', async () => {
  const offline = async () => { throw new Error('offline'); };
  const fallback = await load({ core, clientSdk, source, protocol: 'http:', fetchImplementation: offline });
  assert.equal(fallback.meta.mode, 'sample');
  assert.equal(fallback.meta.fallback, true);
  await assert.rejects(load({ core, clientSdk, source, protocol: 'http:', config: { mode: 'api', fallbackToSample: false }, fetchImplementation: offline }), error => error.code === 'NETWORK_ERROR');
});
