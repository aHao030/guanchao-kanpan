const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { normalize } = require('../public/ui-settings.js');

test('UI 修改入口忽略不支持的字段，为无效值保留稳定默认', () => {
  const config = normalize({
    theme: { tokens: { up: 'url(javascript:invalid)', unknown: '#000000' } },
    layout: { mapMinHeight: 'large', desktopGutter: -20, unlisted: 5 },
    labels: { minFontSize: -1, maxFontSize: 1000 },
    modules: { emotion: 'false', history: false, unknown: false },
    apiToken: 'not-ui-data'
  });
  assert.equal(config.theme.tokens.up, '#ef4444');
  assert.equal(config.layout.mapMinHeight, 640);
  assert.equal(config.layout.desktopGutter, 16);
  assert.equal(config.labels.minFontSize, 10);
  assert.equal(config.labels.maxFontSize, 32);
  assert.equal(config.modules.emotion, true);
  assert.equal(config.modules.history, false);
  assert.equal('apiToken' in config, false);
  assert.equal('unknown' in config.theme.tokens, false);
  assert.equal('unlisted' in config.layout, false);
});

test('修改 UI 配置后真实页面应用主题、布局、标签参数和模块开关', async t => {
  const publicRoot = path.resolve(__dirname, '../public');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = path.join(publicRoot, pathname === '/' ? 'index.html' : pathname);
    fs.readFile(file, (error, body) => {
      res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });
      res.end(error ? 'Not Found' : body);
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/ui.config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.MarketUIConfig = ' + JSON.stringify({
      theme: { tokens: { accent: '#345678', up: '#cc2233' } },
      layout: { mapMinHeight: 720, desktopGutter: 28 },
      labels: { minFontSize: 12, maxFontSize: 30 },
      modules: { emotion: false, history: false }
    }) + ';'
  }));
  await page.route('**/theme-overrides.css', route => route.fulfill({
    contentType: 'text/css', body: '.brand strong { font-size: 24px; }'
  }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#markets .market-chip').first().waitFor();
  const values = await page.evaluate(() => ({
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    up: getComputedStyle(document.documentElement).getPropertyValue('--up').trim(),
    mapMinHeight: getComputedStyle(document.getElementById('workspace')).minHeight,
    mapMargin: getComputedStyle(document.getElementById('workspace')).marginLeft,
    minFontSize: window.MarketUI && window.MarketUI.labels.minFontSize,
    columns: getComputedStyle(document.querySelector('.bottom')).gridTemplateColumns,
    brandSize: getComputedStyle(document.querySelector('.brand strong')).fontSize
  }));
  assert.equal(values.accent, '#345678');
  assert.equal(values.up, '#cc2233');
  assert.equal(values.mapMinHeight, '720px');
  assert.equal(values.mapMargin, '28px');
  assert.equal(values.minFontSize, 12);
  assert.equal(values.brandSize, '24px');
  assert.equal(values.columns.trim().split(/\s+/).length, 1);
  assert.equal(await page.locator('.emotion-section').isVisible(), false);
  assert.equal(await page.locator('.spark-pane').isVisible(), false);
  assert.equal(await page.locator('.timeline-pane').isVisible(), true);
  const updated = await page.evaluate(() => {
    let changed = 0;
    window.addEventListener('market-ui-change', () => changed++, { once: true });
    window.MarketUISettings.apply({ modules: { timeline: false, history: false } });
    return { changed, footerHidden: document.querySelector('.bottom').hidden };
  });
  assert.deepEqual(updated, { changed: 1, footerHidden: true });
  assert.equal(await page.locator('.bottom').isVisible(), false);
});
