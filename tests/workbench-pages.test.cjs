const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server/create-server.cjs');
const { STORAGE_KEY, DRAFT_KEY } = require('../web/notes-store.js');
let server, browser, baseUrl;

before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function openPage(t, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await context.close(); assert.deepEqual(errors, []); });
  await page.goto(baseUrl + '/#' + route);
  await page.locator('main').waitFor();
  return page;
}

test('龙虎榜 shows actual U/D/Z pools and supports search, expansion and stock details', async t => {
  const page = await openPage(t, 'limits');
  await page.getByRole('heading', { name: '盘中龙虎榜', exact: true }).waitFor();
  assert.match(await page.getByRole('tab', { name: /^涨停/ }).innerText(), /37/);
  await page.getByRole('tab', { name: /^跌停/ }).click();
  assert.match(await page.getByRole('tab', { name: /^跌停/ }).innerText(), /33/);
  await page.getByRole('textbox', { name: '搜索龙虎榜' }).fill('深物业A');
  await page.getByRole('button', { name: /深物业A/ }).waitFor();
  assert.match(await page.locator('.gcl-data-panel tbody').innerText(), /-10.02%/);
  await page.getByRole('textbox', { name: '搜索龙虎榜' }).fill('');
  await page.getByRole('tab', { name: /^炸板/ }).click();
  assert.match(await page.getByRole('tab', { name: /^炸板/ }).innerText(), /21/);
  await page.getByRole('tab', { name: /^连板/ }).click();
  assert.match(await page.getByRole('tab', { name: /^连板/ }).innerText(), /7/);
  await page.getByRole('tab', { name: /^涨停/ }).click();
  await page.getByRole('textbox', { name: '搜索龙虎榜' }).fill('皮阿诺');
  await page.getByRole('button', { name: /皮阿诺/ }).waitFor();
  await page.locator('.ant-table-row-expand-icon').first().click();
  await page.getByText('定制家居+群核科技酷家乐+定增推进+控股权巩固', { exact: true }).last().waitFor();
  assert.match(await page.locator('.gcl-detail').innerText(), /10:56:51/);
  await page.getByRole('button', { name: /皮阿诺/ }).click();
  await page.locator('.ant-drawer').getByRole('heading', { name: '皮阿诺', exact: true }).waitFor();
  await page.locator('.ant-drawer-close').click();
  await page.getByRole('textbox', { name: '搜索龙虎榜' }).fill('没有这只股票');
  await page.getByText('当前条件下没有股票，可重置筛选后查看。').waitFor();
});

test('复盘 notes save/reload/edit/export/delete/import with validated local persistence', async t => {
  const page = await openPage(t, 'notes');
  await page.getByRole('heading', { name: '复盘笔记', exact: true }).waitFor();
  await page.getByRole('textbox', { name: '市场判断', exact: true }).fill('测试复盘：缩量分歧，记录承接。');
  await page.getByPlaceholder('给今天的判断一个标题').fill('分歧日的复盘');
  await page.getByRole('button', { name: '保存笔记', exact: true }).click();
  await page.locator('.gcn-note-item strong').getByText('分歧日的复盘', { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('textbox', { name: '市场判断', exact: true }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: '市场判断', exact: true }).inputValue(), '测试复盘：缩量分歧，记录承接。');
  await page.getByRole('textbox', { name: '明日计划', exact: true }).fill('观察量能恢复后的板块持续性。');
  await page.getByRole('button', { name: '保存笔记', exact: true }).click();
  await page.getByText('复盘笔记已保存到本机', { exact: true }).waitFor();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  const download = await downloadPromise;
  let backup = '';
  for await (const chunk of await download.createReadStream()) backup += chunk;
  assert.equal(JSON.parse(backup).notes[0].nextPlan, '观察量能恢复后的板块持续性。');
  await page.getByRole('button', { name: '删除笔记' }).click();
  await page.getByRole('button', { name: /^删\s*除$/ }).click();
  await page.getByText('第一篇复盘，从今天开始', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).notes.length, STORAGE_KEY), 0);
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.getByText('请选择观潮导出的 v1 笔记文件。', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).notes.length, STORAGE_KEY), 0);
  await page.locator('input[type=file]').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await page.locator('.gcn-note-item strong').getByText('分歧日的复盘', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).notes[0].nextPlan, STORAGE_KEY), '观察量能恢复后的板块持续性。');
});

test('unsaved review draft survives route changes and refresh', async t => {
  const page = await openPage(t, 'notes');
  await page.getByRole('textbox', { name: '核心题材', exact: true }).fill('尚未完成的草稿');
  await page.getByText('草稿已备份至本机', { exact: true }).waitFor();
  await page.locator('.main-nav a[href="#market"]').click();
  await page.locator('.main-nav a[href="#notes"]').click();
  await page.getByText('已恢复本机草稿', { exact: true }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: '核心题材', exact: true }).inputValue(), '尚未完成的草稿');
  await page.reload();
  await page.getByText('已恢复本机草稿', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).values.coreSector, DRAFT_KEY), '尚未完成的草稿');
});

test('corrupt stored notes are preserved and saving is blocked until explicit recovery', async t => {
  const page = await openPage(t, 'notes');
  await page.evaluate(key => localStorage.setItem(key, '{broken-backup'), STORAGE_KEY);
  await page.reload();
  await page.getByText('本机笔记暂时无法读取', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '保存笔记', exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), '{broken-backup');
});
