const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const { before, after, test } = require('node:test');

let processHandle;
let port;
before(async () => {
  processHandle = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  port = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => reject(new Error('API preview did not start')), 5000);
    processHandle.stdout.on('data', chunk => {
      output += chunk;
      const address = /http:\/\/127\.0\.0\.1:(\d+)/.exec(output);
      if (address) { clearTimeout(timer); resolve(Number(address[1])); }
    });
    processHandle.stderr.on('data', chunk => { errors += chunk; });
    processHandle.once('error', error => { clearTimeout(timer); reject(error); });
    processHandle.once('exit', code => { clearTimeout(timer); reject(new Error(`API preview exited (${code}): ${errors}`)); });
  });
});
after(async () => {
  if (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) return;
  const exited = once(processHandle, 'exit');
  processHandle.kill();
  await exited;
});

function request(requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: requestPath, method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body,
        json: body && res.headers['content-type']?.includes('application/json') ? JSON.parse(body) : null }));
    });
    req.once('error', reject);
    req.end();
  });
}

test('health identifies the read-only sample service and its dated data mode', async () => {
  const response = await request('/api/v1/health');
  assert.equal(response.status, 200);
  assert.equal(response.json.data.status, 'ok');
  assert.equal(response.json.data.readOnly, true);
  assert.equal(response.json.meta.mode, 'sample');
  assert.equal(response.json.meta.asOf, '2026-11-13');
  assert.equal(response.json.meta.schemaVersion, 1);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('snapshot exposes the complete portable sample with its source date', async () => {
  const response = await request('/api/v1/snapshot');
  assert.equal(response.status, 200);
  const snapshot = response.json.data;
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.meta.mode, 'sample');
  assert.equal(snapshot.meta.asOf, '2026-11-13');
  assert.equal(snapshot.treemap.nodes.reduce((count, board) => count + board.children.length, 0), 5566);
  assert.ok(snapshot.klineByCode['600519']);
  assert.ok(snapshot.summary, 'the sample summary must remain available to future clients');
  assert.equal(response.json.meta.apiVersion, 'v1');
});

test('stock collection supports stable paging, a named pool and a stock search', async () => {
  const page = await request('/api/v1/stocks?pool=big&sort=marketCap&limit=2&offset=1');
  assert.equal(page.status, 200);
  assert.equal(page.json.data.total, 50);
  assert.equal(page.json.data.limit, 2);
  assert.equal(page.json.data.offset, 1);
  assert.deepEqual(page.json.data.items.map(stock => stock.code6), ['601398', '601857']);
  const first = await request('/api/v1/stocks?pool=first&limit=2');
  assert.equal(first.json.data.total, 30);
  assert.equal(first.json.data.items.length, 2);
  const search = await request('/api/v1/stocks?q=600519');
  assert.equal(search.json.data.total, 1);
  assert.equal(search.json.data.items[0].name, '贵州茅台');
});

test('industry and percentage filters return the requested subset in descending change order', async () => {
  const industries = await request('/api/v1/industries');
  assert.equal(industries.status, 200);
  const bank = industries.json.data.find(industry => industry.name === '银行');
  assert.ok(bank);
  assert.ok(bank.marketCap > 0);
  const stocks = await request('/api/v1/stocks?industry=' + encodeURIComponent(bank.code) + '&sort=changePct&limit=200');
  assert.equal(stocks.status, 200);
  assert.ok(stocks.json.data.items.length > 1);
  assert.ok(stocks.json.data.items.every(stock => stock.board === '银行'));
  const changes = stocks.json.data.items.map(stock => stock.changePct);
  assert.ok(changes.every((value, index) => !index || changes[index - 1] >= value));
});

test('stock details preserve the demo K-line boundary and distinguish an absent stock', async () => {
  const moutai = await request('/api/v1/stocks/600519');
  assert.equal(moutai.status, 200);
  assert.equal(moutai.json.data.stock.name, '贵州茅台');
  assert.ok(moutai.json.data.kline.daily_details.length > 0);
  const bank = await request('/api/v1/stocks/601288');
  assert.equal(bank.status, 200);
  assert.equal(bank.json.data.kline, null);
  assert.equal(bank.json.meta.mode, 'sample');
  const missing = await request('/api/v1/stocks/999999');
  assert.equal(missing.status, 404);
  assert.equal(missing.json.error.code, 'STOCK_NOT_FOUND');
  const malformed = await request('/api/v1/stocks/not-a-code');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.error.code, 'INVALID_STOCK_CODE');
});

test('invalid paging, filtering and repeated parameters receive JSON bad-request responses', async () => {
  for (const query of ['limit=0', 'limit=201', 'limit=1.5', 'offset=-1', 'offset=9007199254740992',
    'pool=unknown', 'sort=random', 'industry=unknown', 'limit=2&limit=3', 'other=1']) {
    const response = await request('/api/v1/stocks?' + query);
    assert.equal(response.status, 400, query);
    assert.equal(response.json.error.code, 'INVALID_QUERY', query);
    assert.equal('data' in response.json, false);
  }
  assert.equal((await request('/api/v1/stocks?limit=1')).status, 200, 'invalid requests must not affect later requests');
});

test('market, emotion and timeline endpoints expose existing sample facts without US quotes', async () => {
  const markets = await request('/api/v1/markets');
  assert.equal(markets.status, 200);
  assert.ok(markets.json.data.some(market => market.market === 'all' && market.stockCount === 5566));
  assert.equal(markets.json.data.some(market => market.market === 'us'), false);
  const emotion = await request('/api/v1/emotion');
  assert.equal(emotion.status, 200);
  assert.equal(emotion.json.data.current.total_score, 32);
  const timeline = await request('/api/v1/timeline');
  assert.equal(timeline.status, 200);
  assert.equal(timeline.json.data.length, 37);
  assert.ok(timeline.json.data.every(event => event.stock_code && event.first_lu_time));
  assert.equal(timeline.json.meta.asOf, '2026-11-13');
});

test('API HEAD, unsupported methods, unknown routes and malformed URLs use the public HTTP contract', async () => {
  const get = await request('/api/v1/stocks?limit=1');
  const head = await request('/api/v1/stocks?limit=1', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-type'], get.headers['content-type']);
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength(get.body));
  const post = await request('/api/v1/stocks', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
  assert.equal(post.json.error.code, 'METHOD_NOT_ALLOWED');
  const missing = await request('/api/v1/unknown');
  assert.equal(missing.status, 404);
  assert.equal(missing.json.error.code, 'NOT_FOUND');
  const invalid = await request('/api/v1/%E0%A4%A');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.error.code, 'INVALID_URL');
});
