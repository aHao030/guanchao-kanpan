/* 观潮 演示原型 — 数据全部来自 2026-11-13 真实抓取样本（静态加载） */
'use strict';

(async function startMarketApp() {

/* ============ 数据与共享业务核心 ============ */
const snapshot = await MarketDataSource.load({ core: MarketCore, clientSdk: MarketClient, source: window,
  config: window.MarketDataConfig, protocol: window.location.protocol, fetchImplementation: window.fetch?.bind(window) });
const market = MarketCore.createMarketModel(snapshot);
window.MarketRuntime = { schemaVersion: snapshot.schemaVersion, ...snapshot.meta };
const DPR = Math.max(window.devicePixelRatio || 1, 2);
const norm = MarketCore.normalizeCode;
const OVERVIEW_MKTS = snapshot.overview.markets || [];
const DASH = snapshot.dashboard.data || snapshot.dashboard || {};
const LIMIT_LIST = Array.isArray(snapshot.limit) ? snapshot.limit : snapshot.limit.data || [];
const CALL_LIST = Array.isArray(snapshot.auction) ? snapshot.auction : snapshot.auction.data || [];
const limitMap = new Map(LIMIT_LIST.map(s => [norm(s.stock_code), s]));
const callMap = new Map(CALL_LIST.map(s => [norm(s.stock_code), s]));
const stocks = market.stocks;
const stockByCode = new Map(stocks.map(s => [s.code6, s]));
const boards = market.boards;
const LIMIT_STOCKS = market.limitStocks;
if (!stocks.length) {
  const note = document.getElementById('mapNote');
  note.textContent = '当前数据没有市场样本，请检查数据来源后刷新。';
  note.hidden = false;
}
const toMin = t => { const match = /^(\d{1,2}):(\d{2})/.exec(t || ''); return match ? (+match[1]) * 60 + (+match[2]) : -1; };
const DAY_START = 9 * 60 + 25, DAY_END = 15 * 60, LUNCH_A = 11 * 60 + 30, LUNCH_B = 13 * 60;
const POOLS = market.pools;
const poolMembers = new Map(POOLS.map(pool => [pool.id, market.queryStocks({ pool: pool.id })]));
let activePool = 'all';

/* ============ 颜色（A股：红涨绿跌） ============ */
// 装饰色与 CSS 共用 tokens；行情三色遵循项目约定，不随主题变化。
function readCanvasTheme() {
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    surface: token('--sheet', '#ffffff'), panel: token('--paper-2', '#edf2f8'),
    ink: token('--ink', '#17263c'), muted: token('--muted', '#67758b'),
    rule: token('--rule', '#dce4ef'), accent: token('--accent', '#245bd7'),
    accentInk: token('--accent-ink', '#ffffff'),
    up: token('--up', '#ef4444'), down: token('--down', '#22c55e'), flat: token('--flat', '#111418'),
    display: token('--font-display', '"Microsoft YaHei",sans-serif'),
    mono: token('--font-outlier', 'Consolas,monospace'),
  };
}
let canvasTheme = readCanvasTheme();
function pctColor(p) {
  const v = p || 0;
  if (Math.abs(v) < 0.1) return canvasTheme.flat;   // 不涨不跌 → 黑
  return v > 0 ? canvasTheme.up : canvasTheme.down;     // 涨红 / 跌绿
}
function fillTextOn(fill) {
  if (fill === canvasTheme.down) return 'rgba(4,17,8,.92)';      // 绿块配墨字（原云图配对）
  return 'rgba(255,255,255,.96)';                          // 红块/黑块配白字
}

function pctText(p) { return MarketCore.formatPct(p); }
function pctCls(p) { return MarketCore.changeClass(p); }

/* ============ 三级市场云图 ============ */
const mapCanvas = document.getElementById('treemap');
const mapWrap = document.getElementById('treemapWrap');
const mctx = mapCanvas.getContext('2d');
const baseCanvas = document.createElement('canvas');
const bctx = baseCanvas.getContext('2d');
let rects = [];
let dimSet = null;
let selectedCode = null;
let hoverListCode = null;
let hoverMapCode = null;
let focusedBoard = '';
const mapBoards = boards.map(b => ({ ...b, children: b.children.map(c => stockByCode.get(norm(c.code))) }));

function matchingSet() {
  const q = searchQuery.trim();
  if (q) {
    const hits = new Set(searchStocks(q).map(s => s.code6));
    return { set: hits, note: hits.size ? '' : '无匹配个股' };
  }
  return { set: new Set(poolMembers.get(activePool).map(s => s.code6)), note: '' };
}

function searchStocks(query) {
  return market.queryStocks({ q: query });
}

function renderBase() {
  const { clientWidth: W, clientHeight: H } = mapWrap;
  if (!W || !H) return;
  for (const cv of [mapCanvas, baseCanvas]) {
    const width = Math.round(W * DPR), height = Math.round(H * DPR);
    if (cv.width !== width) cv.width = width;
    if (cv.height !== height) cv.height = height;
  }
  mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const scope = focusedBoard ? mapBoards.filter(b => b.code === focusedBoard) : mapBoards;
  const scene = MarketTreemap.layout(scope, W, H);
  rects = scene.headers.map(h => ({ ...h, kind: 'board' })).concat(scene.entries);
  MarketTreemap.draw(bctx, scene, W, H, canvasTheme, { matches: dimSet, color: pctColor, textColor: fillTextOn });
  const matched = scope.reduce((n, b) => n + b.children.filter(s => !dimSet || dimSet.has(s.code6)).length, 0);
  const scopeCount = scope.reduce((n, b) => n + b.children.length, 0);
  poolMetaEl.textContent = '范围 ' + scopeCount + ' 只 · 命中 ' + matched + ' 只 · 面积 = 总市值';
}

function drawFrame() {
  const { clientWidth: W, clientHeight: H } = mapWrap;
  mctx.clearRect(0, 0, W, H);
  mctx.drawImage(baseCanvas, 0, 0, W, H);
  for (const entry of rects) {
    if (entry.kind !== 'stock') continue;
    const r = entry.rect, code = entry.node.code6;
    const limit = limitMap.get(code);
    if (limit && (!dimSet || dimSet.has(code)) && r.w > 4 && r.h > 4) {
      mctx.strokeStyle = canvasTheme.accent; mctx.lineWidth = 1.5;
      mctx.strokeRect(r.x + .8, r.y + .8, r.w - 1.6, r.h - 1.6);
      if (+limit.lu_days >= 2 && r.w > 40 && r.h > 50) {
        mctx.fillStyle = canvasTheme.accent; mctx.fillRect(r.x + r.w - 15, r.y + 2, 13, 13);
        mctx.fillStyle = canvasTheme.accentInk; mctx.font = '500 10px ' + canvasTheme.mono;
        mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
        mctx.fillText(limit.lu_days, r.x + r.w - 8.5, r.y + 8.5);
      }
    }
    if (code === selectedCode || code === hoverListCode || code === hoverMapCode) {
      if (r.w < 3 || r.h < 3) continue;
      mctx.strokeStyle = canvasTheme.ink; mctx.lineWidth = 3;
      mctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      mctx.strokeStyle = '#ffffff'; mctx.lineWidth = 1;
      mctx.strokeRect(r.x + 2.5, r.y + 2.5, Math.max(0, r.w - 5), Math.max(0, r.h - 5));
    }
  }
  mctx.textAlign = 'start'; mctx.textBaseline = 'alphabetic';
}

function hitTest(mx, my) {
  // 最后绘制的子块在上层，命中后即可返回。
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const { x, y, w, h } = r.rect;
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) return r;
  }
  return null;
}

const tooltip = document.getElementById('tooltip');
mapCanvas.addEventListener('mousemove', e => {
  const b = mapCanvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - b.left, e.clientY - b.top);
  const hoverCode = hit && hit.kind === 'stock' ? hit.node.code6 : null;
  if (hoverMapCode !== hoverCode) { hoverMapCode = hoverCode; drawFrame(); }
  mapCanvas.style.cursor = hit && hit.kind === 'board' ? 'zoom-in' : 'crosshair';
  if (!hit) { tooltip.hidden = true; return; }
  if (hit.kind === 'stock') {
    const s = hit.node, l = limitMap.get(s.code6);
    tooltip.innerHTML = `<div class="tt-name">${s.name} <span style="color:var(--ink-3)">${s.code}</span></div>`
      + `<div class="tt-row"><span>现价</span><b>${s.price}</b></div>`
      + `<div class="tt-row"><span>涨跌幅</span><b style="color:${s.changePct >= 0 ? 'var(--up-strong)' : 'var(--down-strong)'}">${pctText(s.changePct)}</b></div>`
      + `<div class="tt-row"><span>${s.board} / ${s.subBoardName || '-'}</span><b></b></div>`
      + (l ? `<div class="tt-row"><span>涨停 ${l.lu_status} · ${l.lu_days}板</span><b style="color:var(--gold)">${l.lu_reason ? l.lu_reason.slice(0, 14) : ''}</b></div>` : '');
  } else {
    tooltip.innerHTML = `<div class="tt-name">${hit.node.name}</div><div class="tt-row"><span>${hit.node.stockCount} 只 · 板块涨幅</span><b>${pctText(hit.node.pct)}</b></div>`;
  }
  tooltip.hidden = false;
  tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8) + 'px';
  tooltip.style.top = Math.min(e.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8) + 'px';
});
mapCanvas.addEventListener('mouseleave', () => { tooltip.hidden = true; hoverMapCode = null; drawFrame(); });
mapCanvas.addEventListener('click', e => {
  const b = mapCanvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - b.left, e.clientY - b.top);
  if (!hit) return;
  if (hit.kind === 'stock') selectStock(hit.node.code6);
  else focusIndustry(hit.node.code);
});

/* ============ 池 Tab / 搜索 ============ */
const poolTabsEl = document.getElementById('poolTabs');
const poolMetaEl = document.getElementById('poolMeta');
POOLS.forEach(p => {
  const b = document.createElement('button');
  b.className = 'pool-tab'; b.role = 'tab';
  b.setAttribute('aria-selected', p.id === activePool);
  b.tabIndex = p.id === activePool ? 0 : -1;
  b.innerHTML = `${p.label}<span class="pt-count">${p.count}</span>`;
  b.addEventListener('click', () => {
    activePool = p.id;
    poolTabsEl.querySelectorAll('.pool-tab').forEach((el, i) => {
      const active = POOLS[i].id === activePool;
      el.setAttribute('aria-selected', active);
      el.tabIndex = active ? 0 : -1;
    });
    applyFilter();
  });
  poolTabsEl.appendChild(b);
});
poolTabsEl.addEventListener('keydown', e => {
  const tabs = Array.from(poolTabsEl.querySelectorAll('.pool-tab'));
  const current = tabs.indexOf(e.target);
  if (current < 0) return;
  let next;
  if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') next = (current + tabs.length - 1) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  else return;
  e.preventDefault(); tabs[next].click(); tabs[next].focus();
});
function applyFilter() {
  const { set, note } = matchingSet();
  dimSet = activePool === 'all' && !searchQuery.trim() ? null : set;
  const noteEl = document.getElementById('mapNote');
  if (note) { noteEl.textContent = note; noteEl.hidden = false; } else noteEl.hidden = true;

  renderBase();
  drawFrame();
  if (activePool !== 'all') renderPoolDrawer(activePool);
  else if (drawerMode === 'pool') { drawerMode = 'empty'; renderEmptyDrawer(); }
}

const searchInput = document.getElementById('searchInput');
let searchQuery = '';
searchInput.addEventListener('input', () => { searchQuery = searchInput.value.trim(); applyFilter(); });
searchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const q = searchQuery.trim();
  if (!q) return;
  const hits = searchStocks(q);
  if (hits.length) selectStock(hits[0].code6);
});

/* ============ 按需打开的列表与详情 ============ */
const drawer = document.getElementById('drawer');
const detailDialog = document.getElementById('detailDialog');
const detailTitle = document.getElementById('detailTitle');
function showDetails() {
  tooltip.hidden = true;
  if (!detailDialog.open) detailDialog.showModal();
}
function renderCurrentList() {
  const board = boards.find(b => b.code === focusedBoard);
  if (activePool !== 'all') renderPoolDrawer(activePool);
  else if (board) renderBoardDrawer(board);
  else renderEmptyDrawer();
}
document.getElementById('poolListBtn').addEventListener('click', () => {
  renderCurrentList();
  showDetails();
});
document.getElementById('closeDetails').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('close', () => { hoverListCode = null; drawFrame(); });
detailDialog.addEventListener('click', e => {
  if (e.target !== detailDialog) return;
  const r = detailDialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) detailDialog.close();
});
const fmtYi = n => n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(0) + '万' : n;
function kv(k, v, cls) { return `<div class="kv"><i>${k}</i><b class="${cls || ''}">${v}</b></div>`; }

let drawerMode = 'empty'; // 'empty' | 'pool' | 'stock'
let poolSort = 'rank';
function bindStockRows() {
  drawer.querySelectorAll('li[data-code]').forEach(li => {
    li.tabIndex = 0; li.setAttribute('role', 'button');
    li.addEventListener('click', () => selectStock(li.dataset.code));
    li.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); selectStock(li.dataset.code);
    });
    li.addEventListener('mouseenter', () => { hoverListCode = li.dataset.code; drawFrame(); });
    li.addEventListener('mouseleave', () => { hoverListCode = null; drawFrame(); });
    li.addEventListener('focus', () => { hoverListCode = li.dataset.code; drawFrame(); });
    li.addEventListener('blur', () => { hoverListCode = null; drawFrame(); });
  });
}
function poolStocks(pid) {
  return market.queryStocks({ pool: pid });
}

function renderPoolDrawer(pid) {
  drawerMode = 'pool'; hoverListCode = null;
  const pool = POOLS.find(x => x.id === pid);
  detailTitle.textContent = pool.label + '列表';
  let list = poolStocks(pid);
  const isLimitPool = pid === 'limit' || pid === 'lianban' || pid === 'first';
  if (isLimitPool && poolSort === 'pct') list = market.queryStocks({ pool: pid, sort: 'changePct' });
  const sortBtns = isLimitPool ? `<div class="d-sort"><button class="${poolSort === 'rank' ? 'on' : ''}" data-s="rank">板数</button><button class="${poolSort === 'pct' ? 'on' : ''}" data-s="pct">涨幅</button></div>` : '';
  drawer.innerHTML = `
    <h3>${pool.label}<span class="d-code">${list.length} 只</span></h3>
    <div class="d-hint" style="margin:2px 0 10px">${isLimitPool ? '点击行看详情 · 悬停行在树图定位' : '按市值权重排序'}${sortBtns}</div>
    <ul class="d-pool-list">${list.map(sk => {
      const l = limitMap.get(sk.code6), c2 = callMap.get(sk.code6);
      const pctHtml = `<span class="bl-pct ${pctCls(sk.changePct)}">${pctText(sk.changePct)}</span>`;
      if (l) {
        return `<li data-code="${sk.code6}"><span>
          <span class="bl-name">${sk.name}</span><span class="bl-sub"> ${l.lu_days}板 · ${(l.lu_reason || '').slice(0, 12)}</span><br>
          <span class="bl-sub">封比 ${l.sealed_rate} · 首封 ${l.first_lu_time}${+l.open_times > 0 ? ' · 炸' + l.open_times + '次' : ''}${c2 ? ' · 竞价' + c2.na_chg + '%' : ''}</span>
        </span>${pctHtml}</li>`;
      }
      return `<li data-code="${sk.code6}"><span><span class="bl-name">${sk.name}</span>
        <span class="bl-sub"> ${fmtYi(sk.totalMarketCap)}</span></span>${pctHtml}</li>`;
    }).join('')}</ul>`;
  bindStockRows();
  drawer.querySelectorAll('.d-sort button').forEach(b => b.addEventListener('click', () => {
    poolSort = b.dataset.s; renderPoolDrawer(activePool);
  }));
}
function renderEmptyDrawer() {
  drawerMode = 'empty'; hoverListCode = null;
  detailTitle.textContent = '股票列表';
  const list = poolStocks('big').slice(0, 8);
  drawer.innerHTML = '<h3>市值前列<span class="d-code">沪深 A 股</span></h3>' +
    '<p class="d-hint">先看结构，再检视个股。点击云图或下方列表查看行情快照。</p>' +
    '<ul class="d-board-list">' + list.map(s => '<li data-code="' + s.code6 + '"><span><span class="bl-name">' + s.name + '</span><span class="bl-sub">' + s.code6 + ' · ' + s.board + '</span></span><span class="bl-pct ' + pctCls(s.changePct) + '">' + pctText(s.changePct) + '</span></li>').join('') + '</ul>' +
    '<p class="d-hint list-guide">行业标题可点击放大；「全部行业」可随时返回。图中面积表示总市值，红涨、绿跌、黑平盘。</p>';
  bindStockRows();
}

function drawKline(cv, series) {
  const ctx = cv.getContext('2d');
  const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
  const dpr = DPR;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const dd = series?.daily_details || [];
  if (!dd.length) return;
  const hi = Math.max(...dd.map(d => d.high)), lo = Math.min(...dd.map(d => d.low));
  const px = i => 14 + i * ((W - 28) / Math.max(1, dd.length - 1));
  const py = v => 8 + (hi - v) / (hi - lo || 1) * (H - 18);
  // 网格 + 价格
  ctx.strokeStyle = canvasTheme.rule; ctx.fillStyle = canvasTheme.muted; ctx.font = `10px ${canvasTheme.mono}`;
  for (const v of [hi, (hi + lo) / 2, lo]) {
    ctx.beginPath(); ctx.moveTo(0, py(v)); ctx.lineTo(W, py(v)); ctx.stroke();
    ctx.fillText(v.toFixed(0), 3, py(v) - 2);
  }
  dd.forEach((d, i) => {
    const x = px(i), upC = d.close >= d.open;
    ctx.strokeStyle = upC ? canvasTheme.up : canvasTheme.down; ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(x, py(d.high)); ctx.lineTo(x, py(d.low)); ctx.stroke();
    const bw = Math.max(2, (W - 28) / dd.length * 0.5);
    const yo = py(d.open), yc = py(d.close);
    ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
  });
}

function selectStock(code6) {
  const detail = market.getStockDetail(code6);
  if (!detail) return;
  const s = detail.stock;
  if (focusedBoard && s.boardCode !== focusedBoard) focusIndustry(s.boardCode);
  selectedCode = code6;
  const l = detail.limitUp, c = detail.auction;
  detailTitle.textContent = '个股详情';
  const listName = activePool !== 'all' ? POOLS.find(x => x.id === activePool).label : (boards.find(b => b.code === focusedBoard)?.name || '股票');
  const backBtn = `<button class="d-back" id="dBack">← 返回${listName}列表</button>`;
  let html = `${backBtn}<h3>${s.name}<span class="d-code">${s.code}</span></h3>
    <div style="font-size:11px;color:var(--ink-3)">${s.board} / ${s.subBoardName || '-'} · 总市值 ${fmtYi(s.totalMarketCap)}</div>
    <div class="d-price-line"><span class="d-price">${s.price}</span>
      <span class="d-pct ${pctCls(s.changePct)}">${pctText(s.changePct)}</span></div>`;
  if (l) {
    html += `<div class="d-sec"><h4>涨停信息</h4>
      <div style="margin-bottom:8px"><span class="d-badge gold">${l.lu_days} 板</span><span class="d-badge gold">${l.lu_status || ''}</span><span class="d-badge">${l.lu_tag || ''}</span>
      ${+l.open_times > 0 ? `<span class="d-badge red">炸板 ${l.open_times} 次</span>` : ''}</div>
      <div class="d-kv">${kv('涨停原因', '')}</div>
      <div class="d-reason">${l.lu_reason || '-'}</div>
      <div class="d-kv" style="margin-top:8px">
        ${kv('封成比', l.sealed_rate)}${kv('封单额', l.lu_amount + ' 万')}
        ${kv('首次封板', l.first_lu_time)}${kv('最后封板', l.last_lu_time)}
        ${kv('流通盘', l.free_float + ' 亿')}${kv('换手率', l.turnover_rate + '%')}
      </div></div>`;
  }
  if (c) {
    html += `<div class="d-sec"><h4>竞价数据</h4><div class="d-kv">
      ${kv('竞价涨幅', c.na_chg + '%', pctCls(+c.na_chg))}${kv('竞价额', c.na_amount + ' 万')}
      ${kv('竞价量比', c.na_jlb)}${kv('竞价净额', c.na_j_net_amount + ' 万')}
    </div><div class="d-hint">单位按源站口径（万）</div></div>`;
  }
  html += `<div class="d-sec"><h4>K 线（近 5 日）</h4>`;
  if (detail.kline) {
    html += `<canvas class="d-kline" id="miniKline"></canvas>`;
  } else {
    html += `<div class="d-hint">当前数据未包含该股 K 线</div>`;
  }
  html += `</div>`;
  drawer.innerHTML = html;
  const bk = document.getElementById('dBack');
  if (bk) bk.addEventListener('click', renderCurrentList);
  showDetails();
  if (detail.kline) drawKline(document.getElementById('miniKline'), detail.kline);
  drawFrame();
}

function renderBoardDrawer(b) {
  drawerMode = 'board';
  detailTitle.textContent = b.name + '成分';
  const kids = stocks.filter(s => s.board === b.name).sort((x, y) => (y.value || 0) - (x.value || 0)).slice(0, 20);
  drawer.innerHTML = `<h3>${b.name}<span class="d-code">板块 · ${b.stockCount} 只</span></h3>
    <div class="d-price-line"><span class="d-pct ${pctCls(b.pct)}" style="font-size:18px">${pctText(b.pct)}</span>
    <span style="font-size:12px;color:var(--ink-3)">市值权重排序 · 前 20</span></div>
    <div class="d-sec"><ul class="d-board-list">${kids.map(k => {
      const l = limitMap.get(k.code6);
      return `<li data-code="${k.code6}"><span><span class="bl-name">${k.name}</span>
        <span class="bl-sub">${l ? ' · ' + l.lu_days + '板 ' + (l.lu_reason || '').slice(0, 10) : ' · ' + (k.subBoardName || '')}</span></span>
        <span class="bl-pct ${pctCls(k.changePct)}">${pctText(k.changePct)}</span></li>`;
    }).join('')}</ul></div>`;
  bindStockRows();
}

renderEmptyDrawer();

/* ============ 顶部概览 + 温度计 ============ */
const industrySelect = document.getElementById('industrySelect');
for (const board of boards) {
  const option = document.createElement('option');
  option.value = board.code;
  option.textContent = board.name;
  industrySelect.appendChild(option);
}
function focusIndustry(code) {
  focusedBoard = code;
  industrySelect.value = code;
  selectedCode = null;
  hoverMapCode = null;
  hoverListCode = null;
  tooltip.hidden = true;
  const board = boards.find(b => b.code === code);
  document.getElementById('mapTitle').textContent = board ? board.name : '全市场云图';
  document.getElementById('mapBack').hidden = !board;
  renderBase();
  drawFrame();
  if (board) renderBoardDrawer(board); else renderEmptyDrawer();
}
industrySelect.addEventListener('change', () => focusIndustry(industrySelect.value));
document.getElementById('mapBack').addEventListener('click', () => focusIndustry(''));
const mktsEl = document.getElementById('markets');
const MKT_NAMES = { all: '沪深A股', sse: '上证', szse: '深证', hs300: '沪深300', zza50: 'A50', zza500: '中证500', main: '主板', cyb: '创业板', kcb: '科创', bj: '北交', etf: 'ETF', cb: '转债', hk: '港股' };
const MKT_ORDER = ['all', 'sse', 'szse', 'cyb', 'etf', 'cb', 'hk'];
const mktSeen = new Set();
OVERVIEW_MKTS.filter(m => MKT_ORDER.includes(m.market) && !mktSeen.has(m.market)).slice(0, 8).forEach(m => {
  mktSeen.add(m.market);
  const el = document.createElement('div');
  el.className = 'market-chip' + (m.market === 'all' ? ' active' : '');
  el.title = '演示原型：市场/指数切换待接实时数据';
  el.innerHTML = `<span class="m-name">${MKT_NAMES[m.market]}</span>
    <span class="m-pct ${pctCls(m.changePct)}">${pctText(m.changePct)}</span>
    <span class="m-count">${m.stockCount}</span>`;
  mktsEl.appendChild(el);
});
(snapshot.marketExtra || []).filter(m => MKT_ORDER.includes(m.market)).forEach(m => {
  const el = document.createElement('div');
  el.className = 'market-chip static';
  el.title = '演示原型：该市场仅含概览数据';
  el.title = `上涨 ${m.advance} / 下跌 ${m.decline}`;
  el.innerHTML = `<span class="m-name">${MKT_NAMES[m.market]}</span>
    <span class="m-pct ${pctCls(m.pct)}">${pctText(m.pct)}</span>`;
  mktsEl.appendChild(el);
});

const cur = DASH.current || {}, prev = DASH.previous_score || {};
const score = cur.total_score, delta = score - prev.total_score;
function stageOf(v) { return MarketCore.emotionStage(v); }
const ld = DASH.latest_date || '';
const ldShort = ld.length >= 8 ? ld.slice(4, 6) + '-' + ld.slice(6, 8) : '—';
document.getElementById('dataChip').textContent = '数据 · ' + ldShort + ' 收盘';
document.getElementById('dataChip').title = snapshot.meta.fallback ? '数据服务暂不可用，当前使用内置样本' : '样本日期 ' + snapshot.meta.asOf;

const thermo = document.getElementById('thermo');
thermo.title = `情绪评分 ${score}/100（满分口径见盘见）· ${stageOf(score)}期 · 较昨日 ${delta >= 0 ? '+' : ''}${delta} · 数据源 盘见 · 演示口径`;

thermo.innerHTML = `<span class="t-score" style="color:${delta >= 0 ? 'var(--up-strong)' : 'var(--down-strong)'}">${score}</span>
  <div><div class="t-track"><i class="t-pointer" style="left:${score}%"></i></div></div>
  <span class="t-stage">${stageOf(score)}期</span>
  <span class="t-delta ${pctCls(delta)}">${delta >= 0 ? '+' : ''}${delta}</span>
  <span class="t-tag" title="演示口径，非数据源官方阶段">演示</span>`;

const toast = document.getElementById('toast');
toast.textContent = `演示数据 · 2026-11-13 收盘快照 · 涨停 ${LIMIT_STOCKS.length} 只 · 炸板率 ${(DASH.limits || {}).broken_rate || '-'}%`;
toast.hidden = false;
setTimeout(() => { toast.hidden = true; }, 5200);

/* ============ 底部：时间轴 + 情绪走势 ============ */
const tlCanvas = document.getElementById('timeline');
let timelinePoints = [];
function drawTimeline() {
  timelinePoints = [];
  const W = tlCanvas.clientWidth, H = tlCanvas.clientHeight; if (!W) return;
  const dpr = DPR;
  tlCanvas.width = W * dpr; tlCanvas.height = H * dpr;
  const ctx = tlCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const padL = 44, padR = 12, span = W - padL - padR;
  const px = m => padL + (m - DAY_START) / (DAY_END - DAY_START) * span;
  // 刻度 + 午休带
  ctx.font = `10px ${canvasTheme.mono}`; ctx.fillStyle = canvasTheme.muted; ctx.strokeStyle = canvasTheme.rule;
  const ticks = W < 500 ? [565, 690, 780, 900] : [565, 660, 690, 810, 840, 900];
  for (const t of ticks) {
    const x = px(t);
    const label = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillText(label, Math.max(0, Math.min(W - textWidth, x - textWidth / 2)), H - 4);
    ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 16); ctx.stroke();
  }
  ctx.fillStyle = canvasTheme.panel;
  ctx.fillRect(px(LUNCH_A), 4, px(LUNCH_B) - px(LUNCH_A), H - 20);
  // 泳道：连板数越高越靠上
  const lanes = 4;
  LIMIT_STOCKS.forEach(s => {
    const m = toMin(s.first_lu_time); if (m < 0) return;
    const x = px(Math.max(DAY_START, Math.min(DAY_END, m)));
    const lane = Math.min(lanes - 1, Math.max(0, (+s.lu_days || 1) - 1));
    const y = H - 26 - lane * (H - 40) / lanes;
    timelinePoints.push({ stock: s, x, y });
    const r = 3.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = +s.lu_days >= 3 ? canvasTheme.accent : pctColor(+s.chg || 9);
    ctx.fill();
    if (+s.lu_days >= 2) { ctx.strokeStyle = canvasTheme.accent; ctx.stroke(); }
    if (+s.open_times > 0) { ctx.strokeStyle = 'rgba(229,72,77,.9)'; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke(); }
  });
  ctx.fillStyle = canvasTheme.muted; ctx.font = `500 10px ${canvasTheme.display}`;
  ctx.fillText('①首板', 6, H - 26 - 0 * (H - 40) / lanes + 3);
  ctx.fillText('②连板', 6, H - 26 - 1 * (H - 40) / lanes + 3);
  ctx.fillText('③', 6, H - 26 - 2 * (H - 40) / lanes + 3);
  ctx.fillText('④+', 6, H - 26 - 3 * (H - 40) / lanes + 3);
}
function timelineHit(e) {
  const b = tlCanvas.getBoundingClientRect();
  const mx = e.clientX - b.left, my = e.clientY - b.top;
  let best = null, bd = 9;
  for (const point of timelinePoints) {
    const d = Math.hypot(mx - point.x, my - point.y);
    if (d < bd) { bd = d; best = point.stock; }
  }
  return best;
}
tlCanvas.addEventListener('mousemove', e => {
  const best = timelineHit(e);
  if (best) { tooltip.hidden = false;
    tooltip.innerHTML = `<div class="tt-name">${best.stock_name} <span style="color:var(--ink-3)">${best.lu_days}板</span></div>
      <div class="tt-row"><span>首封 ${best.first_lu_time} · 炸 ${best.open_times} 次</span><b></b></div>`;
    tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8) + 'px';
    tooltip.style.top = Math.min(e.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8) + 'px';
  } else tooltip.hidden = true;
});
tlCanvas.addEventListener('mouseleave', () => { tooltip.hidden = true; });
tlCanvas.addEventListener('click', e => {
  const best = timelineHit(e);
  if (best) selectStock(norm(best.stock_code));
});

const sparkCanvas = document.getElementById('spark');
function drawSpark() {
  const W = sparkCanvas.clientWidth, H = sparkCanvas.clientHeight; if (!W) return;
  const dpr = DPR;
  sparkCanvas.width = W * dpr; sparkCanvas.height = H * dpr;
  const ctx = sparkCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const hist = DASH.history || [];
  if (hist.length < 2) return;
  const scores = hist.map(h => h.total_score);
  const hi = 100, lo = 0;
  const px = i => 8 + i * ((W - 20) / (hist.length - 1));
  const py = v => 10 + (hi - v) / (hi - lo) * (H - 26);
  // 中线 50
  ctx.strokeStyle = canvasTheme.rule; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(8, py(50)); ctx.lineTo(W - 8, py(50)); ctx.stroke();
  ctx.setLineDash([]);
  // 面积 + 线
  ctx.beginPath(); ctx.moveTo(px(0), py(scores[0]));
  scores.forEach((v, i) => ctx.lineTo(px(i), py(v)));
  ctx.strokeStyle = canvasTheme.accent; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineTo(px(scores.length - 1), H - 14); ctx.lineTo(px(0), H - 14); ctx.closePath();
  ctx.save(); ctx.fillStyle = canvasTheme.accent; ctx.globalAlpha = 0.08; ctx.fill(); ctx.restore();
  // 端点标注
  ctx.fillStyle = canvasTheme.ink; ctx.font = `500 11px ${canvasTheme.mono}`;
  const last = scores[scores.length - 1];
  ctx.fillText(String(last), px(scores.length - 1) - 8, py(last) - 6);
  ctx.fillStyle = canvasTheme.muted; ctx.font = `10px ${canvasTheme.mono}`;
  ctx.fillText('100', 8, 12); ctx.fillText('0', 8, H - 4);
  ctx.fillText(hist[0].trade_date.slice(4, 6) + '/' + hist[0].trade_date.slice(6, 8), 24, H - 4);
  const lt = hist[hist.length - 1].trade_date;
  ctx.fillText(lt.slice(4, 6) + '/' + lt.slice(6, 8), W - 42, H - 4);
}

/* ============ 尺寸自适应 ============ */
/* ============ 情绪仪表盘（数据源：盘见 /api/emotion/daily-dashboard） ============ */
function renderEmotionStrip() {
  const el = document.getElementById('emotionStrip');
  if (!el) return;
  const cur = DASH.current || {}, lim = DASH.limits || {}, boards = lim.boards || {}, prom = lim.promotions || {};
  const up = cur.all_red_count || 0, down = cur.all_green_count || 0, flat = Math.max(0, 5666 - up - down);
  const total = up + down || 1;
  const upPct = (up / total * 100).toFixed(1);
  const amt = cur.total_amount ? Number(cur.total_amount).toFixed(0) : '—';
  const amtR = cur.amount_change_ratio;
  const amtCls = pctCls(Number(amtR) || 0);
  const hn = (lim.highest_names && lim.highest_names[0]) || '—';
  const fund = cur.main_fund_net_inflow;
  const prevScore = DASH.previous_score || {};
  const stage = prevScore.emotion_stage || '—';
  const cell = (h, body) => `<div class="em-cell"><h4>${h}</h4>${body}</div>`;
  el.innerHTML = [
    cell('涨跌家数', `
      <div class="em-main">${up} <span style="font-size:13px;color:var(--ink-3)">涨</span> · ${down} <span style="font-size:13px;color:var(--ink-3)">跌</span></div>
      <div class="em-bar"><span class="b-up" style="width:${upPct}%"></span><span class="b-flat" style="flex:1"></span><span class="b-down" style="width:${(100 - upPct).toFixed(1)}%"></span></div>
      <div class="em-sub">上涨占比 <b>${upPct}%</b>（沪深全部 ${stocks.length} 只，剔除无成交）</div>`),
    cell('量能', `
      <div class="em-main">${amt}<span style="font-size:13px;color:var(--ink-3)"> 亿</span></div>
      <div class="em-sub">较昨日 <b class="${amtCls}">${amtR >= 0 ? '+' : ''}${amtR}%</b></div>
      <div class="em-sub">主力净流入 <b>${fund != null ? Number(fund).toFixed(0) + ' 亿' : '—'}</b></div>`),
    cell('涨停梯队', `
      <div class="em-ladder">
        <span class="lg"><b>${boards.first ?? '—'}</b><i>首板</i></span>
        <span class="lg"><b>${boards.second ?? '—'}</b><i>2板</i></span>
        <span class="lg"><b>${boards.third ?? '—'}</b><i>3板</i></span>
        <span class="lg"><b class="gold">${boards.higher ?? '—'}</b><i>4板+</i></span>
      </div>
      <div class="em-sub">晋级率 <b>1→2 ${prom[1] ?? '—'}%</b> · <b>2→3 ${prom[2] ?? '—'}%</b> · <b>3→4 ${prom[3] ?? '—'}%</b></div>
      <div class="em-sub">最高板 <b>${hn}</b></div>`),
    cell('炸板 / 赚钱效应', `
      <div class="em-main">${lim.broken_rate ?? '—'}<span style="font-size:13px;color:var(--ink-3)">% 炸板率</span></div>
      <div class="em-sub">涨停 <b>${(lim.counts || {}).U ?? '—'}</b> · 炸板 <b>${(lim.counts || {}).Z ?? '—'}</b> · 跌停 <b>${(lim.counts || {}).D ?? '—'}</b></div>
      <div class="em-sub">${prevScore.money_effect_grade ? '赚钱效应 <b>' + prevScore.money_effect_grade + '</b>（' + prevScore.money_effect_score + ' 分）' : ''}</div>`),
    cell('情绪阶段 / 策略', `
      <div class="em-main" style="font-size:16px">${stage}</div>
      <div class="em-sub">${prevScore.strategy_advice || '—'}</div>
      <div class="em-sub">昨日评分 <b>${prevScore.total_score ?? '—'}</b> · 今日 <b>${cur.total_score ?? '—'}</b></div>`)
  ].join('');
}

function layoutAll() {
  canvasTheme = readCanvasTheme();
  renderBase(); drawFrame(); drawTimeline(); drawSpark();
  const miniKline = document.getElementById('miniKline');
  if (miniKline) drawKline(miniKline, market.getStockDetail(selectedCode)?.kline);
}
// ResizeObserver 与 window.resize 可同时触发，一帧最多完成一次昂贵的画布布局。
let layoutPending = false;
function scheduleLayout() {
  if (layoutPending) return;
  layoutPending = true;
  requestAnimationFrame(() => { layoutPending = false; layoutAll(); });
}
new ResizeObserver(scheduleLayout).observe(mapWrap);
window.addEventListener('resize', scheduleLayout);
window.addEventListener('market-ui-change', scheduleLayout);
if (document.fonts) document.fonts.ready.then(scheduleLayout);

renderEmotionStrip();
applyFilter();
drawTimeline();
drawSpark();

})().catch(error => {
  const note = document.getElementById('mapNote');
  note.textContent = '市场数据未能加载，请刷新页面或检查数据来源。';
  note.hidden = false;
  console.error('Market startup failed', error);
});
