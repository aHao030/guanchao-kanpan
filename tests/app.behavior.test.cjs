// Run: node --test tests/app.behavior.test.cjs (requires Playwright and Chrome).
// These tests drive the page as a user; production remains dependency-free.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

async function openPage(t) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, [], 'page must not throw script errors'); });
  await page.route('https://fonts.**', route => route.abort());
  await page.goto(pathToFileURL(path.resolve(__dirname, '../public/index.html')).href);
  return page;
}

test('首板池显示样本中的 30 只首板股票', async t => {
  const page = await openPage(t);
  await page.getByRole('tab', { name: /^首板/ }).click();
  assert.equal(await page.locator('#drawer li[data-code]').count(), 30);
  assert.match(await page.locator('#drawer').innerText(), /1板/);
});

test('初始云图无遮罩，搜索无结果时给出提示，清空后恢复', async t => {
  const page = await openPage(t);
  assert.equal(await page.locator('#mapNote').isVisible(), false);
  await page.locator('#searchInput').fill('不存在的股票');
  assert.equal(await page.locator('#mapNote').isVisible(), true);
  assert.match(await page.locator('#mapNote').innerText(), /无匹配个股/);
  await page.locator('#searchInput').fill('');
  assert.equal(await page.locator('#mapNote').isVisible(), false);
});

test('行情云图保留项目约定的红涨、绿跌、黑平三色', async t => {
  const page = await openPage(t);
  const colors = await page.locator('#treemap').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const counts = { red: 0, green: 0, flat: 0 };
    for (let i = 0; i < data.length; i += 4) {
      const rgb = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      if (rgb === '239,68,68') counts.red++;
      if (rgb === '34,197,94') counts.green++;
      if (rgb === '17,20,24') counts.flat++;
    }
    return counts;
  });
  assert.ok(colors.red > 100 && colors.green > 100 && colors.flat > 100);
});

test('涨停股票详情可以返回池列表', async t => {
  const page = await openPage(t);
  await page.getByRole('tab', { name: /^涨停/ }).click();
  const first = page.locator('#drawer li[data-code]').first();
  const stockName = await first.locator('.bl-name').innerText();
  await first.click();
  assert.match(await page.locator('#drawer h3').innerText(), new RegExp(stockName));
  await page.locator('#drawer').getByRole('button', { name: /返回涨停列表/ }).click();
  assert.equal(await page.locator('#drawer li[data-code]').count(), 37);
});

test('涨停池可切换涨幅排序且没有脚本错误', async t => {
  const page = await openPage(t);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('tab', { name: /^涨停/ }).click();
  await page.locator('#drawer').getByRole('button', { name: '涨幅', exact: true }).click();
  assert.deepEqual(errors, []);
  assert.equal(await page.locator('#drawer li[data-code]').count(), 37);
  const changes = (await page.locator('#drawer .bl-pct').allTextContents()).map(parseFloat);
  assert.ok(changes.every((value, i) => !i || changes[i - 1] >= value));
});

test('大市值池按市值顺序显示样本中的前 50 只股票', async t => {
  const page = await openPage(t);
  await page.getByRole('tab', { name: /^大市值/ }).click();
  assert.equal(await page.locator('#drawer li[data-code]').count(), 50);
  assert.deepEqual(await page.locator('#drawer li[data-code]').evaluateAll(rows => rows.slice(0, 3).map(row => row.dataset.code)),
    ['601288', '601398', '601857']);
});

test('搜索后回车打开详情，并立即在云图标出所选股票', async t => {
  const page = await openPage(t);
  const search = page.locator('#searchInput');
  await search.fill('600519');
  const before = await page.locator('#treemap').evaluate(canvas => canvas.toDataURL());
  await search.press('Enter');
  assert.match(await page.locator('#drawer h3').innerText(), /贵州茅台/);
  const selected = await page.locator('#treemap').evaluate(canvas => canvas.toDataURL());
  assert.ok(selected !== before, 'selection must redraw the canvas without waiting for resize');
});

test('调整窗口后，时间轴悬停与点击仍指向同一只股票', async t => {
  const page = await openPage(t);
  await page.setViewportSize({ width: 1180, height: 900 });
  const timeline = page.locator('#timeline');
  await timeline.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await timeline.scrollIntoViewIfNeeded();
  // Find a rendered blue marker, then interact with those visible pixels.
  const point = await timeline.evaluate(canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (data[i] === 36 && data[i + 1] === 91 && data[i + 2] === 215) {
          return { x: x * canvas.clientWidth / canvas.width, y: y * canvas.clientHeight / canvas.height };
        }
      }
    }
  });
  assert.ok(point, 'timeline must show a 3+ board marker');
  const bounds = await timeline.boundingBox();
  await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
  assert.equal(await page.locator('#tooltip').isVisible(), true);
  const name = (await page.locator('#tooltip .tt-name').innerText()).split(/\s/)[0];
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
  assert.ok((await page.locator('#drawer h3').innerText()).includes(name));
});

test('键盘可切换标的池并打开股票详情', async t => {
  const page = await openPage(t);
  await page.getByRole('tab', { name: /^全部/ }).focus();
  await page.keyboard.press('ArrowRight');
  const limitTab = page.getByRole('tab', { name: /^涨停/ });
  assert.equal(await limitTab.getAttribute('aria-selected'), 'true');
  assert.equal(await limitTab.getAttribute('tabindex'), '0');
  const first = page.locator('#drawer li[data-code]').first();
  const name = await first.locator('.bl-name').innerText();
  await first.focus();
  await page.keyboard.press('Enter');
  assert.ok((await page.locator('#drawer h3').innerText()).includes(name));
});
