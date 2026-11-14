const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

// Exercise the renderer's public draw boundary with an actual browser canvas.
async function drawStock(t, { name, width, height, changePct = 1.36 }) {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setContent('<canvas id="labelCanvas" width="400" height="240"></canvas>');
  await page.addScriptTag({ path: path.resolve(__dirname, '../public/market-map.js') });
  return page.evaluate(stock => {
    const canvas = document.getElementById('labelCanvas');
    const ctx = canvas.getContext('2d');
    const calls = [];
    const fill = ctx.fillText.bind(ctx);
    ctx.fillText = function (...args) {
      const metrics = this.measureText(String(args[0]));
      calls.push({ text: String(args[0]), font: this.font, x: args[1], y: args[2], width: metrics.width, squeezed: args.length > 3 });
      return fill(...args);
    };
    const stroke = ctx.strokeText.bind(ctx);
    ctx.strokeText = function (...args) { calls.push({ stroke: true }); return stroke(...args); };
    MarketTreemap.draw(ctx, {
      entries: [{ kind: 'stock', node: { name: stock.name, code6: '600519', changePct: stock.changePct }, rect: { x: 20, y: 20, w: stock.width, h: stock.height } }],
      headers: []
    }, 400, 240, {
      surface: '#fff', display: '"Microsoft YaHei", sans-serif', mono: 'Consolas, monospace'
    }, { color: () => '#ef4444', textColor: () => '#fff', matches: null });
    return { calls, stock };
  }, { name, width, height, changePct });
}

function assertNaturalText(result) {
  assert.equal(result.calls.some(call => call.squeezed || call.stroke), false, 'labels keep their natural glyph width');
  for (const call of result.calls) {
    assert.ok(call.width <= result.stock.width, `${call.text} must fit within its stock tile`);
    assert.ok(call.y >= 20 && call.y <= 20 + result.stock.height, 'text stays vertically inside its stock tile');
  }
}

test('紧凑个股格显示可辨认的名称前缀，而不是留空', async t => {
  const result = await drawStock(t, { name: '海菲曼科技', width: 30, height: 16 });
  assert.ok(result.calls.some(call => /^海菲/.test(call.text)), 'a 30×16 stock tile should retain at least its first two Chinese characters');
  assertNaturalText(result);
});

test('窄而有高度的个股格将完整中文名称分成两行', async t => {
  const name = '中国船舶工业集团';
  const result = await drawStock(t, { name, width: 54, height: 42 });
  const labels = result.calls.filter(call => /[\u4e00-\u9fff]/.test(call.text));
  assert.equal(labels.map(call => call.text).join(''), name, 'two measured lines retain the complete stock name');
  assert.equal(labels.length, 2);
  assert.ok(labels[1].y > labels[0].y, 'wrapped name lines occupy separate rows');
  assertNaturalText(result);
});

test('60×22的中小个股格保留常见四字股名', async t => {
  const result = await drawStock(t, { name: '农业银行', width: 60, height: 22 });
  assert.equal(result.calls.filter(call => /[\u4e00-\u9fff]/.test(call.text)).map(call => call.text).join(''), '农业银行');
  assertNaturalText(result);
});

test('80×45的个股格显示完整名称及涨跌幅', async t => {
  const result = await drawStock(t, { name: '工业富联', width: 80, height: 45, changePct: -5.21 });
  assert.ok(result.calls.some(call => call.text === '工业富联'));
  assert.ok(result.calls.some(call => call.text === '-5.21%'));
  assertNaturalText(result);
});

test('大权重个股使用较大字号显示名称及涨幅', async t => {
  const result = await drawStock(t, { name: '贵州茅台', width: 180, height: 110 });
  const name = result.calls.find(call => call.text === '贵州茅台');
  assert.ok(name);
  assert.ok(parseInt(name.font.match(/(\d+)px/)[1]) >= 20, 'large stocks should have a visibly larger name');
  assert.ok(result.calls.some(call => call.text === '+1.36%'));
  assertNaturalText(result);
});

test('不足以放下两个字的极窄色块不绘制挤压文字', async t => {
  const result = await drawStock(t, { name: '贵州茅台', width: 12, height: 100 });
  assert.deepEqual(result.calls, []);
});
