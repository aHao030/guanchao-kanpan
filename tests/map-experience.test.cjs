// Canvas experience checks use real browser output and user controls.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

async function openMap(t) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => {
    await page.close();
    assert.deepEqual(errors, [], 'market map must not throw script errors');
  });
  await page.addInitScript(() => {
    window.__canvasTextCalls = [];
    const originalFill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      window.__canvasTextCalls.push({ canvas: this.canvas.id, text: String(args[0]), squeezed: args.length > 3 });
      return originalFill.apply(this, args);
    };
    const originalStroke = CanvasRenderingContext2D.prototype.strokeText;
    CanvasRenderingContext2D.prototype.strokeText = function (...args) {
      window.__canvasTextCalls.push({ canvas: this.canvas.id, text: String(args[0]), stroke: true });
      return originalStroke.apply(this, args);
    };
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../public/index.html')).href);
  await page.waitForFunction(() => document.querySelectorAll('#markets .market-chip').length > 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page;
}

test('市场概览移除美股，保留A股观察入口', async t => {
  const page = await openMap(t);
  const markets = await page.locator('#markets').innerText();
  assert.doesNotMatch(markets, /美股/);
  assert.match(markets, /沪深A股/);
});

test('桌面首屏为云图保留可辨认行业的高度', async t => {
  const page = await openMap(t);
  const bounds = await page.locator('#treemap').boundingBox();
  assert.ok(bounds.height >= 480, `map should have at least 480px of reading height, got ${bounds.height}`);
});

test('云图文字使用真实字宽，不横向压缩名称或用描边堆字', async t => {
  const page = await openMap(t);
  const calls = await page.evaluate(() => window.__canvasTextCalls.filter(call => !['timeline', 'spark', 'miniKline'].includes(call.canvas)));
  assert.ok(calls.length > 0, 'market map should have readable labels');
  assert.equal(calls.filter(call => call.squeezed).length, 0, 'map labels must be measured and omitted when they do not fit, not squeezed with maxWidth');
  assert.equal(calls.filter(call => call.stroke).length, 0, 'map labels must not use stroke outlines to pack illegible text into small tiles');
});

test('聚焦银行后可返回全市场，画布和范围标识同步改变', async t => {
  const page = await openMap(t);
  const industry = page.locator('#industrySelect');
  assert.equal(await industry.count(), 1, 'industry focus must be available');
  const bank = industry.locator('option').filter({ hasText: /^银行(?:\s|$)/ }).first();
  assert.equal(await bank.count(), 1, 'banking must be an available industry');
  const before = await page.locator('#treemap').evaluate(canvas => canvas.toDataURL());
  await industry.selectOption(await bank.getAttribute('value'));
  assert.match(await page.locator('#mapTitle').innerText(), /银行/);
  const focused = await page.locator('#treemap').evaluate(canvas => canvas.toDataURL());
  assert.notEqual(focused, before, 'focus must redraw the map, not only change its title');
  await page.locator('#mapBack').click();
  assert.match(await page.locator('#mapTitle').innerText(), /全市场/);
  assert.match(await page.locator('#poolMeta').innerText(), /5566/);
});

test('专注云图扩大绘图区，再次操作恢复观察面板布局', async t => {
  const page = await openMap(t);
  const focus = page.locator('#mapFocus');
  assert.equal(await focus.count(), 1, 'map focus control must be available');
  const before = await page.locator('#treemap').boundingBox();
  await focus.click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const expanded = await page.locator('#treemap').boundingBox();
  assert.ok(expanded.width > before.width + 200, 'focus mode should reclaim the inspector column for the map');
  await focus.click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const restored = await page.locator('#treemap').boundingBox();
  assert.ok(Math.abs(restored.width - before.width) < 1, 'second click should restore the original map width');
  assert.equal(await page.locator('.inspector').isVisible(), true);
});
