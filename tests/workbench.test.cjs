const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server/create-server.cjs');
let browser, server, base;
before(async () => { server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + server.address().port; browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); await new Promise(r => server.close(r)); });
async function pageFor(t, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.goto(base); await page.waitForSelector('.cloud-canvas canvas'); return page;
}
test('homepage shows sector Top30 cloud before honestly scoped funds', async t => {
  const p = await pageFor(t);
  assert.match(await p.locator('.cloud-caption').innerText(), /5,566/);
  assert.match(await p.locator('.cloud-caption').innerText(), /921/);
  assert.match(await p.locator('.cloud-section').innerText(), /每板块市值前 30/);
  assert.match(await p.locator('.fund-summary').innerText(), /61\.07/);
  assert.match(await p.locator('.fund-summary').innerText(), /仅覆盖 37/);
  assert.match(await p.locator('.session-strip').innerText(), /非实时行情/);
  const cloud = await p.locator('.cloud-section').boundingBox(), funds = await p.locator('.fund-section').boundingBox();
  assert.ok(funds.y >= cloud.y + cloud.height);
  await p.getByText('首板 30', { exact: true }).click();
  await p.getByRole('button', { name: '股票列表', exact: true }).click();
  await p.getByRole('dialog').waitFor();
  assert.match(await p.getByRole('dialog').innerText(), /股票列表 · 30 只/);
});

test('sector focus keeps Top30 while the full list and search retain omitted stocks', async t => {
  const p = await pageFor(t);
  await p.getByRole('button', { name: '股票列表', exact: true }).click();
  await p.getByRole('dialog').waitFor();
  assert.match(await p.getByRole('dialog').innerText(), /股票列表 · 5566 只/);
  await p.keyboard.press('Escape');
  await p.getByRole('combobox', { name: '选择行业', exact: true }).click();
  await p.locator('.ant-select-item-option-content').getByText('电子', { exact: true }).click();
  await p.getByRole('heading', { name: '电子云图', exact: true }).waitFor();
  assert.match(await p.locator('.cloud-caption').innerText(), /30/);
  assert.match(await p.locator('.cloud-caption').innerText(), /530/);
  await p.getByRole('button', { name: '股票列表', exact: true }).click();
  await p.getByRole('dialog').waitFor();
  assert.match(await p.getByRole('dialog').innerText(), /股票列表 · 530 只/);
  await p.keyboard.press('Escape');
  // 芯原股份 is outside the 电子 Top30 and is absent from the default cloud.
  await p.getByRole('combobox', { name: '搜索股票 / 代码' }).fill('688521');
  await p.getByText('芯原股份  688521', { exact: true }).click();
  await p.getByRole('heading', { name: '芯原股份', exact: true }).waitFor();
  await p.getByRole('button', { name: '加入自选', exact: true }).click();
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: '全市场', exact: true }).click();
  assert.match(await p.locator('.cloud-caption').innerText(), /921/);
  await p.getByRole('link', { name: '自选股', exact: true }).click();
  assert.match(await p.locator('.watch-table').innerText(), /芯原股份/);
});

test('per-sector quantity persists and restoring defaults returns to 30', async t => {
  const p = await pageFor(t);
  await p.getByRole('button', { name: '外观设置', exact: true }).click();
  const quantity = p.getByRole('spinbutton', { name: '每板块显示数量', exact: true });
  assert.equal(await quantity.inputValue(), '30');
  await quantity.fill('10');
  await quantity.press('Tab');
  await p.keyboard.press('Escape');
  assert.match(await p.locator('.cloud-caption').innerText(), /311/);
  await p.reload(); await p.waitForSelector('.cloud-canvas canvas');
  assert.match(await p.locator('.cloud-section').innerText(), /每板块市值前 10/);
  assert.match(await p.locator('.cloud-caption').innerText(), /311/);
  await p.getByRole('button', { name: '外观设置', exact: true }).click();
  assert.equal(await quantity.inputValue(), '10');
  await p.getByRole('button', { name: '恢复默认', exact: true }).click();
  assert.equal(await quantity.inputValue(), '30');
  await p.keyboard.press('Escape');
  assert.match(await p.locator('.cloud-caption').innerText(), /921/);
});
test('global search opens real K-line details and watchlist survives reload', async t => {
  const p = await pageFor(t);
  await p.getByRole('combobox', { name: '搜索股票 / 代码' }).fill('600519');
  await p.getByText('贵州茅台  600519', { exact: true }).click();
  await p.getByRole('heading', { name: '贵州茅台' }).waitFor();
  assert.equal(await p.getByRole('img', { name: '个股日K线', exact: true }).count(), 1);
  await p.getByRole('button', { name: '加入自选', exact: true }).click();
  await p.keyboard.press('Escape'); await p.getByRole('link', { name: '自选股', exact: true }).click();
  await p.reload(); await p.getByRole('heading', { name: '自选股', exact: true }).waitFor();
  assert.match(await p.locator('.watch-table').innerText(), /贵州茅台/);
  await p.getByRole('button', { name: '移出自选 贵州茅台', exact: true }).click();
  assert.match(await p.locator('.watch-table').innerText(), /还没有自选股/);
});
test('theme settings persist and empty search can recover on a small screen', async t => {
  const p = await pageFor(t, 320);
  await p.getByRole('button', { name: '切换深色', exact: true }).click();
  await p.reload(); await p.waitForSelector('.cloud-canvas canvas');
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'dark');
  await p.getByRole('combobox', { name: '搜索股票 / 代码' }).fill('不存在的股票');
  await p.getByText('没有匹配的股票，请清空搜索或调整筛选').waitFor();
  await p.getByRole('combobox', { name: '搜索股票 / 代码' }).fill('');
  await p.waitForSelector('.cloud-canvas canvas');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.getByRole('button', { name: '外观设置', exact: true }).click();
  await p.getByText('即时预览，自动保存在当前浏览器。修改源码默认值可使用 public/ui.config.js。').waitFor();
  await p.getByRole('button', { name: '恢复默认', exact: true }).click();
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'light');
});

test('old dark preference adopts the light surface without losing custom quote colors', async t => {
  const p = await browser.newPage();
  t.after(() => p.close());
  await p.addInitScript(() => {
    localStorage.setItem('guanchao.workbench.preferences.v1', JSON.stringify({ mode: 'dark', up: '#c23d55', down: '#16825a', accent: '#5b8de8', labelSize: 15, mapHeight: 550 }));
  });
  await p.goto(base); await p.waitForSelector('.cloud-canvas canvas');
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'light');
  const migrated = await p.evaluate(() => JSON.parse(localStorage.getItem('guanchao.workbench.preferences.v2')));
  assert.equal(migrated.up, '#c23d55'); assert.equal(migrated.down, '#16825a');
  assert.equal(migrated.mapHeight, 550); assert.equal(migrated.labelSize, 15);
  await p.getByRole('button', { name: '切换深色', exact: true }).click();
  await p.reload(); await p.waitForSelector('.cloud-canvas canvas');
  assert.equal(await p.locator('html').getAttribute('data-theme'), 'dark', 'migration runs only once');
});
