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
  await page.goto(pathToFileURL(path.resolve(__dirname, '../public/legacy.html')).href);
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
  assert.equal(await page.locator('#detailDialog').isVisible(), false, 'industry focus should keep the map unobstructed');
  await page.locator('#poolListBtn').click();
  assert.equal(await page.locator('#detailDialog').isVisible(), true);
  assert.match(await page.locator('#drawer h3').innerText(), /银行/);
  await page.locator('#closeDetails').click();
  assert.equal(await page.locator('#detailDialog').isVisible(), false);
  await page.locator('#mapBack').click();
  assert.match(await page.locator('#mapTitle').innerText(), /全市场/);
  assert.match(await page.locator('#poolMeta').innerText(), /5566/);
});

test('云图默认占满主区，不再保留观察面板或专注切换', async t => {
  const page = await openMap(t);
  assert.equal(await page.locator('.inspector').count(), 0, 'the persistent inspector must be removed');
  assert.equal(await page.locator('#mapFocus').count(), 0, 'the full-width map no longer needs a focus toggle');
  assert.doesNotMatch(await page.locator('body').innerText(), /观察面板/);
  const bounds = await page.locator('#treemap').boundingBox();
  assert.ok(bounds.width > 1350, `map should use the available viewport width, got ${bounds.width}`);
});

test('详情列表只在请求时弹出，Escape关闭后云图保持全宽', async t => {
  const page = await openMap(t);
  const details = page.locator('#detailDialog');
  assert.equal(await details.count(), 1, 'stock details remain available on demand');
  assert.equal(await details.isVisible(), false);
  const before = await page.locator('#treemap').boundingBox();
  await page.locator('#poolListBtn').click();
  assert.equal(await details.isVisible(), true);
  assert.equal(await page.locator('#drawer li[data-code]').count(), 8, 'the default list must remain available');
  await page.keyboard.press('Escape');
  assert.equal(await details.isVisible(), false);
  const after = await page.locator('#treemap').boundingBox();
  assert.ok(Math.abs(after.width - before.width) < 1, 'opening details must not steal space from the map');
});
