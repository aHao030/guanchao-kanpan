const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMarketClient } = require('../packages/market-client');
const http = require('node:http');

test('跨端客户端保留接口元数据并正确传递中文搜索与分页', async () => {
  let request;
  const expected = { data: { items: [{ code6: '600519', name: '贵州茅台' }], total: 1, limit: 20, offset: 0 }, meta: { mode: 'sample', asOf: '2026-11-13' } };
  const client = createMarketClient({ baseUrl: 'https://market.example/', transport: { request: async value => { request = value; return { status: 200, data: expected }; } } });
  assert.deepEqual(await client.getStocks({ q: '贵州', pool: 'all', limit: 20, offset: 0 }), expected);
  const url = new URL(request.url);
  assert.equal(url.pathname, '/api/v1/stocks');
  assert.equal(url.searchParams.get('q'), '贵州');
  assert.equal(url.searchParams.get('limit'), '20');
  assert.equal(url.searchParams.get('offset'), '0');
  assert.equal(request.method, 'GET');
});

test('同一客户端可通过标准Fetch读取真实HTTP服务', async t => {
  const server = http.createServer((req, res) => {
    assert.equal(req.url, '/api/v1/health');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: { ok: true }, meta: { mode: 'sample' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const sdk = require('../packages/market-client');
  const client = sdk.createMarketClient({ baseUrl: 'http://127.0.0.1:' + server.address().port, transport: sdk.createFetchTransport(fetch) });
  assert.equal((await client.getHealth()).data.ok, true);
});

test('微信请求适配将回调结果转换成相同的客户端接口', async () => {
  let request;
  const wx = { request(options) { request = options; options.success({ statusCode: 200, data: { data: { stock: { code6: '600519' } }, meta: { mode: 'sample' } } }); } };
  const sdk = require('../packages/market-client');
  const client = sdk.createMarketClient({ baseUrl: 'https://market.example', transport: sdk.createWechatTransport(wx), timeoutMs: 3000 });
  assert.equal((await client.getStock('600519')).data.stock.code6, '600519');
  assert.equal(request.url, 'https://market.example/api/v1/stocks/600519');
  assert.equal(request.dataType, 'json');
  assert.equal(request.timeout, 3000);
});

test('服务端错误在不同客户端中保留状态和错误码', async () => {
  const client = createMarketClient({ transport: { request: async () => ({ status: 404, data: { error: { code: 'STOCK_NOT_FOUND', message: '未找到股票' } } }) } });
  await assert.rejects(client.getStock('000000'), error => error.status === 404 && error.code === 'STOCK_NOT_FOUND');
});

test('非协议数据与微信网络失败不会被当作成功行情', async () => {
  const sdk = require('../packages/market-client');
  const invalid = createMarketClient({ transport: { request: async () => ({ status: 200, data: { rows: [] } }) } });
  await assert.rejects(invalid.getSnapshot(), error => error.code === 'INVALID_RESPONSE');
  const offline = createMarketClient({ transport: sdk.createWechatTransport({ request: options => options.fail({ errMsg: 'request:fail timeout' }) }) });
  await assert.rejects(offline.getMarkets(), error => error.code === 'REQUEST_TIMEOUT');
});
