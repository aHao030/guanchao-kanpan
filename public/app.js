/* 观潮 演示原型 — 数据全部来自 2026-11-13 真实抓取样本（静态加载） */
'use strict';

/* ============ 数据归一化 ============ */
// 画布超采样：至少 2x，保证 Windows 显示缩放下不模糊
const DPR = Math.max(window.devicePixelRatio || 1, 2);
const norm = c => String(c == null ? '' : c).replace(/\D/g, '').slice(-6);

const TREES = (window.TREEMAP && window.TREEMAP.nodes) || [];
const OVERVIEW_MKTS = (window.OVERVIEW && window.OVERVIEW.markets) || [];
const DASH = (window.DASHBOARD && window.DASHBOARD.data) || {};
const LIMIT_LIST = Array.isArray(window.LIMIT) ? window.LIMIT : (window.LIMIT && window.LIMIT.data) || [];
const CALL_LIST = Array.isArray(window.CALL) ? window.CALL : (window.CALL && window.CALL.data) || [];
const KLINE_DEMO = (window.KLINE_600519 && window.KLINE_600519.data) || null;

const limitMap = new Map(); LIMIT_LIST.forEach(s => limitMap.set(norm(s.stock_code), s));
const callMap = new Map();  CALL_LIST.forEach(s => callMap.set(norm(s.stock_code), s));

// 扁平化：板块 → 个股
const stocks = [];
TREES.forEach(b => (b.children || []).forEach(c => stocks.push({
  ...c, code6: norm(c.code), board: b.name, boardCode: b.code,
})));
const stockByCode = new Map(stocks.map(s => [s.code6, s]));
const boards = TREES.map(b => ({
  name: b.name, code: b.code, value: b.value, stockCount: b.stockCount,
  children: b.children || [],
  pct: (b.children || []).reduce((s, c) => s + (c.changePct || 0) * (c.value || 1), 0) / (b.value || 1),
}));

const LIMIT_STOCKS = LIMIT_LIST.slice().sort((a, b) => (a.first_lu_time || '').localeCompare(b.first_lu_time || ''));
const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
const DAY_START = 9 * 60 + 25, DAY_END = 15 * 60, LUNCH_A = 11 * 60 + 30, LUNCH_B = 13 * 60;

/* ============ 池（Tab） ============ */
const POOLS = [
  { id: 'all', label: '全部', match: () => true, count: stocks.length },
  { id: 'limit', label: '涨停', match: s => limitMap.has(s.code6), count: LIMIT_STOCKS.length },
  { id: 'lianban', label: '连板', match: s => { const l = limitMap.get(s.code6); return !!l && +l.lu_days >= 2; },
    count: LIMIT_STOCKS.filter(s => +s.lu_days >= 2).length },
  { id: 'first', label: '首板', match: s => { const l = limitMap.get(s.code6); return !!l && +s.lu_days === 1; },
    count: LIMIT_STOCKS.filter(s => +s.lu_days === 1).length },
  { id: 'big', label: '大市值', match: null, count: 50 },
];
const big50 = new Set(stocks.slice().sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 50).map(s => s.code6));
POOLS.find(p => p.id === 'big').match = s => big50.has(s.code6);
let activePool = 'all';

/* ============ 颜色（A股：红涨绿跌） ============ */
/* 大盘云图 classic dark 主题（自其前端包逆向移植：暗画布 + 高饱和块，与原站一致） */
const BG_TOP = [23, 27, 34], BG_BOT = [16, 20, 27];
const BOARD_FILL = '#20252d', BOARD_HEADER = '#181d24';
const SUB_BORDER = 'rgba(148,163,184,.3)', BOARD_BORDER = 'rgba(148,163,184,.48)';
const PAL = {
  flat: [65, 69, 84],
  posSoft: [165, 66, 74], posStrong: [245, 54, 57],
  negSoft: [53, 117, 78], negStrong: [0, 214, 65],
};
function lerp(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function mixc(a, b, k) { return rgb(lerp(a, b, Math.min(1, Math.max(0, k)))); }
/* RdYlGn 11 阶分档取色（d3-scale-chromatic / ColorBrewer 官方色值，finviz 式离散热力） */
const UP_RAMP = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b'];   // ≥5 / 3~5 / 2~3 / 1~2 / 0.4~1
const DOWN_RAMP = ['#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']; // -0.4~-1 / -1~-2 / -2~-3 / -3~-5 / ≤-5
const FLAT_FILL = '#d9d9d9';
const LIGHT_FILLS = new Set(['#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#e8e8e8', '#f46d43']);
function pctColor(p) {
  const v = p || 0;
  if (Math.abs(v) < 0.1) return '#111418';   // 不涨不跌 → 黑
  return v > 0 ? '#dc2626' : '#15803d';       // 涨红 / 跌绿
}
function fillTextOn(fill) {
  if (fill === '#22c55e') return 'rgba(4,17,8,.92)';      // 绿块配墨字（原云图配对）
  return 'rgba(255,255,255,.96)';                          // 红块/黑块配白字
}
function haloOn(fill) {
  if (fill === '#22c55e') return 'rgba(255,255,255,.5)';
  return 'rgba(24,36,48,.5)';
}
function pctText(p) { return (p >= 0 ? '+' : '') + (Math.round(p * 100) / 100).toFixed(2) + '%'; }
function pctCls(p) { return p > 0.005 ? 'up' : p < -0.005 ? 'down' : ''; }

/* ============ Squarified 树图布局（Bruls et al.） ============ */
function squarify(items, x, y, w, h, out) {
  const total = items.reduce((s, it) => s + it.v, 0);
  if (total <= 0 || w < 2 || h < 2 || !items.length) return;
  let list = items.map(it => ({ d: it, a: Math.max(0, it.v / total * w * h) })).filter(e => e.a >= 1);
  list.sort((p, q) => q.a - p.a);
  let rx = x, ry = y, rw = w, rh = h;
  while (list.length) {
    const widthShort = rw <= rh;
    const long = widthShort ? rh : rw;
    const rowArea = { v: 0 };
    const worst = (row, area) => {
      const s2 = (area / long) ** 2, maxa = Math.max(...row.map(e => e.a)), mina = Math.min(...row.map(e => e.a));
      return Math.max(maxa / s2, s2 / mina);
    };
    let row = [list[0]]; rowArea.v = row[0].a;
    let i = 1;
    while (i < list.length) {
      const r2 = row.concat([list[i]]), a2 = rowArea.v + list[i].a;
      if (worst(r2, a2) > worst(row, rowArea.v)) break;
      row = r2; rowArea.v = a2; i++;
    }
    const thick = Math.max(1, rowArea.v / long);
    let ox = rx, oy = ry;
    for (const e of row) {
      const len = Math.max(1, e.a / thick);
      out.push({ d: e.d, rect: widthShort ? { x: rx, y: oy, w: thick, h: len } : { x: ox, y: ry, w: len, h: thick } });
      if (widthShort) oy += len; else ox += len;
    }
    if (widthShort) { rx += thick; rw -= thick; } else { ry += thick; rh -= thick; }
    list = list.slice(i);
    if (rw < 1 || rh < 1) break;
  }
}

/* ============ 树图画布 ============ */
const mapCanvas = document.getElementById('treemap');
const mapWrap = document.getElementById('treemapWrap');
const mctx = mapCanvas.getContext('2d');
const baseCanvas = document.createElement('canvas');
const bctx = baseCanvas.getContext('2d');
let rects = [];        // {rect, kind, node}
let dimSet = null;     // Set(code6) 当前池/搜索命中的集合；null=全亮
let dimNote = '';
let selectedCode = null;
let pulseT = 0;

function matchingSet() {
  const pool = POOLS.find(p => p.id === activePool);
  const set = new Set(stocks.filter(s => pool.match(s)).map(s => s.code6));
  const q = searchQuery.trim();
  if (q) {
    const hits = new Set(stocks.filter(s =>
      s.name.includes(q) || s.code6.includes(q.replace(/\D/g, '') || '\u0000')
    ).map(s => s.code6));
    return { set: hits, note: hits.size ? '' : '无匹配个股' };
  }
  return { set, note: '' };
}

function renderBase() {
  const { clientWidth: W, clientHeight: H } = mapWrap;
  if (!W || !H) return;
  const dpr = DPR;
  for (const cv of [mapCanvas, baseCanvas]) { cv.width = W * dpr; cv.height = H * dpr; }
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.clearRect(0, 0, W, H);
  bctx.fillStyle = '#eef0f3'; bctx.fillRect(0, 0, W, H);

  /* 按行业总市值比例动态分配各板块显示的个股数量（最大余数法）：大行业多显示、小行业少显示 */
  const BUDGET = 900, MIN_PER_BOARD = 4;
  const totalCap = boards.reduce((acc, b) => acc + (b.value || 0), 0);
  const boardCounts = new Map();
  {
    const metas = boards.map(b => ({ code: b.code, q: (b.value || 0) / (totalCap || 1) * BUDGET, cap: (b.children || []).length }));
    let assigned = 0;
    for (const m of metas) {
      const n = Math.min(m.cap, Math.max(MIN_PER_BOARD, Math.floor(m.q)));
      boardCounts.set(m.code, n); assigned += n;
    }
    let rem = BUDGET - assigned;
    const byRemainder = metas.slice().sort((a2, b2) => (b2.q - Math.floor(b2.q)) - (a2.q - Math.floor(a2.q)));
    let guard = 0;
    while (rem !== 0 && guard++ < 4000) {
      let moved = false;
      if (rem > 0) {
        for (const m of byRemainder) {
          if (rem <= 0) break;
          const cur = boardCounts.get(m.code) || 0;
          if (cur < m.cap) { boardCounts.set(m.code, cur + 1); rem--; moved = true; }
        }
      } else {
        for (const m of byRemainder.slice().reverse()) {
          if (rem >= 0) break;
          const cur = boardCounts.get(m.code) || 0;
          if (cur > MIN_PER_BOARD) { boardCounts.set(m.code, cur - 1); rem++; moved = true; }
        }
      }
      if (!moved) break;
    }
  }

  rects = [];
  const boardItems = boards.map(b => ({ v: Math.max(b.value, 1e8), b }));
  const placed = [];
  squarify(boardItems, 0, 0, W, H, placed);
  const HEAD = 17;

  for (const { d, rect } of placed) {
    const b = d.b;
    const { x, y, w, h } = rect;
    // 板块底色（池过滤时整板压暗，命中的个股块才能跳出来）
    const boardHit = dimSet === null || (b.children || []).some(c => dimSet.has(norm(c.code)));
    bctx.globalAlpha = boardHit ? 1 : 0.35;
    bctx.fillStyle = '#c9ced6';
    bctx.fillRect(x, y, w, h);
    rects.push({ rect, kind: 'board', node: b });
    const bodyY = y + (h > 46 ? HEAD : 0);
    const bodyH = h - (bodyY - y);
    if (bodyH < 3 || w < 8) continue;
    // 按市值比例分配的显示名额；池/搜索命中的额外个股自动补入
    const nShow = boardCounts.get(b.code) || MIN_PER_BOARD;
    const members = (b.children || []).slice().sort((a2, b2) => (b2.value || 0) - (a2.value || 0));
    const shown = members.slice(0, nShow).map(c => c.code);
    const filtering = activePool !== 'all' || searchQuery.trim() !== '';
    if (filtering && dimSet !== null) members.slice(nShow).forEach(c => { if (dimSet.has(norm(c.code))) shown.push(c.code); });
    const kids = members.filter(c => shown.includes(c.code)).map(c => ({ v: Math.max(c.value || 0, 1e7), c }));
    const childRects = [];
    squarify(kids, x, bodyY, w, bodyH, childRects);
    for (const cr of childRects) {
      const s = stockByCode.get(norm(cr.d.c.code)) || { ...cr.d.c, code6: norm(cr.d.c.code) };
      const r = cr.rect;
      rects.push({ rect: r, kind: 'stock', node: s });
      const hit = dimSet === null || dimSet.has(s.code6);
      bctx.globalAlpha = hit ? 1 : 0.18;
      const fill = pctColor(s.changePct);
      bctx.fillStyle = fill;
      bctx.fillRect(r.x + .5, r.y + .5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
      bctx.strokeStyle = 'rgba(255,255,255,.75)';
      bctx.strokeRect(r.x + .5, r.y + .5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
      // 文本（饱和块上白字，浅色块上墨字）
      const fillTxt = fillTextOn(fill);
      const haloTxt = haloOn(fill);
      if (r.w > 34 && r.h > 19) {
        bctx.font = '600 11px "Hanken Grotesk","Microsoft YaHei",sans-serif';
        bctx.textBaseline = 'top';
        const nm = s.name.length > (r.w > 64 ? 7 : 4) ? s.name.slice(0, r.w > 64 ? 7 : 4) : s.name;
        bctx.lineWidth = 2; bctx.strokeStyle = haloTxt; bctx.strokeText(nm, r.x + 4, r.y + 3, r.w - 8);
        bctx.fillStyle = fillTxt;
        bctx.fillText(nm, r.x + 4, r.y + 3, r.w - 8);
        bctx.font = '500 11px "IBM Plex Mono",monospace';
        const pt2 = (r.h > 30) ? pctText(s.changePct) : null;
        if (pt2) {
          bctx.lineWidth = 2; bctx.strokeStyle = haloTxt; bctx.strokeText(pt2, r.x + 4, r.y + 16);
          bctx.fillStyle = fillTxt;
          bctx.fillText(pt2, r.x + 4, r.y + 16);
        }
      } else if (r.w > 19 && r.h > 11) {
        bctx.font = '600 10px "Hanken Grotesk","Microsoft YaHei",sans-serif';
        bctx.textBaseline = 'middle';
        const nm2 = s.name.slice(0, 3);
        bctx.lineWidth = 2; bctx.strokeStyle = haloTxt; bctx.strokeText(nm2, r.x + 2, r.y + r.h / 2, r.w - 4);
        bctx.fillStyle = fillTxt;
        bctx.fillText(nm2, r.x + 2, r.y + r.h / 2, r.w - 4);
      }
      bctx.globalAlpha = 1;
    }
    // 板块标题条
    bctx.globalAlpha = boardHit ? 1 : 0.35;
    if (h > 46) {
      bctx.fillStyle = '#c9ced6';
      bctx.fillRect(x, y, w, HEAD);
      bctx.fillStyle = '#232830';
      bctx.fillRect(x, y + HEAD - 2, w, 2);
      bctx.font = '600 12px "Hanken Grotesk","Microsoft YaHei",sans-serif';
      bctx.textBaseline = 'middle';
      if (w < 110) {
        bctx.fillText(b.name.slice(0, 4), x + 5, y + HEAD / 2, w - 10);
      } else {
        bctx.fillText(b.name, x + 5, y + HEAD / 2, Math.max(20, w - 70));
        bctx.font = '500 11px "IBM Plex Mono",monospace';
        bctx.fillStyle = 'rgba(56,62,72,.75)';
        const pt = pctText(b.pct);
        bctx.fillText(pt, x + w - bctx.measureText(pt).width - 5, y + HEAD / 2);
      }
    }
    bctx.strokeStyle = 'rgba(148,163,184,.48)';
    bctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    bctx.globalAlpha = 1;
  }
}

function drawFrame(ts) {
  const { clientWidth: W, clientHeight: H } = mapWrap;
  mctx.clearRect(0, 0, W, H);
  mctx.drawImage(baseCanvas, 0, 0, W, H);
  // 涨停描边（静态规则线，Almanac：除状态外无动画）
  mctx.lineWidth = 2;
  mctx.strokeStyle = 'rgba(177,45,107,.92)';
  for (const r of rects) {
    if (r.kind !== 'stock') continue;
    if (!limitMap.has(r.node.code6)) continue;
    if (dimSet !== null && !dimSet.has(r.node.code6)) continue;
    mctx.strokeRect(r.rect.x + 1, r.rect.y + 1, r.rect.w - 2, r.rect.h - 2);
    // 池模式下给命中块直接标注名称
    if (dimSet !== null && r.rect.w > 30 && r.rect.h > 13) {
      mctx.font = '700 10px "Microsoft YaHei",sans-serif';
      mctx.textBaseline = 'middle';
      mctx.lineWidth = 2;
      const fill3 = pctColor(r.node.changePct);
      mctx.strokeStyle = haloOn(fill3);
      const nm3 = r.node.name.slice(0, Math.max(2, Math.floor(r.rect.w / 11)));
      mctx.strokeText(nm3, r.rect.x + 3, r.rect.y + r.rect.h / 2 + 1, r.rect.w - 6);
      mctx.fillStyle = fillTextOn(fill3);
      mctx.fillText(nm3, r.rect.x + 3, r.rect.y + r.rect.h / 2 + 1, r.rect.w - 6);
    }
    // 连板角标
    const l = limitMap.get(r.node.code6);
    if (+l.lu_days >= 2 && r.rect.w > 14 && r.rect.h > 14) {
      mctx.fillStyle = '#b12d6b';
      mctx.fillRect(r.rect.x + r.rect.w - 12, r.rect.y + 2, 10, 10);
      mctx.fillStyle = '#f2e9ee';
      mctx.font = '500 9px "IBM Plex Mono",monospace';
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText(l.lu_days, r.rect.x + r.rect.w - 6, r.rect.y + 6.5);
      mctx.textAlign = 'start'; mctx.textBaseline = 'alphabetic';
    }
  }
  // 选中描边
  if (selectedCode) {
    const r = rects.find(x => x.kind === 'stock' && x.node.code6 === selectedCode);
    if (r) {
      mctx.lineWidth = 4; mctx.strokeStyle = 'rgba(15,23,42,.42)';
      mctx.strokeRect(r.rect.x + 2, r.rect.y + 2, r.rect.w - 4, r.rect.h - 4);
      mctx.lineWidth = 1.5; mctx.strokeStyle = '#ffffff';
      mctx.strokeRect(r.rect.x + 1, r.rect.y + 1, r.rect.w - 2, r.rect.h - 2);
    }
  }
}

function hitTest(mx, my) {
  let best = null;
  for (const r of rects) {
    const { x, y, w, h } = r.rect;
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) best = r;
  }
  return best;
}

const tooltip = document.getElementById('tooltip');
mapCanvas.addEventListener('mousemove', e => {
  const b = mapCanvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - b.left, e.clientY - b.top);
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
mapCanvas.addEventListener('mouseleave', () => { tooltip.hidden = true; });
mapCanvas.addEventListener('click', e => {
  const b = mapCanvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - b.left, e.clientY - b.top);
  if (!hit) return;
  if (hit.kind === 'stock') selectStock(hit.node.code6);
  else renderBoardDrawer(hit.node);
});

/* ============ 池 Tab / 搜索 ============ */
const poolTabsEl = document.getElementById('poolTabs');
const poolMetaEl = document.getElementById('poolMeta');
POOLS.forEach(p => {
  const b = document.createElement('button');
  b.className = 'pool-tab'; b.role = 'tab';
  b.setAttribute('aria-selected', p.id === activePool);
  b.innerHTML = `${p.label}<span class="pt-count">${p.count}</span>`;
  b.addEventListener('click', () => {
    activePool = p.id;
    poolTabsEl.querySelectorAll('.pool-tab').forEach((el, i) => el.setAttribute('aria-selected', POOLS[i].id === activePool));
    applyFilter();
  });
  poolTabsEl.appendChild(b);
});
function applyFilter() {
  const { set, note } = matchingSet();
  dimSet = set; dimNote = note;
  const noteEl = document.getElementById('mapNote');
  if (note) { noteEl.textContent = note; noteEl.hidden = false; } else noteEl.hidden = true;
  poolMetaEl.textContent = `显示 ${set.size} / ${stocks.length} 只（按行业市值比例分配 · 大行业多显示） · 金框=涨停 · 角标=连板数`;
  renderBase();
  drawFrame(performance.now());
  if (activePool !== 'all') renderPoolDrawer(activePool);
  else if (drawerMode === 'pool') { drawerMode = 'empty'; renderEmptyDrawer(); }
}

const searchInput = document.getElementById('searchInput');
let searchQuery = '';
searchInput.addEventListener('input', () => { searchQuery = searchInput.value.trim(); applyFilter(); });

/* ============ 详情抽屉 ============ */
const drawer = document.getElementById('drawer');
const fmtYi = n => n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(0) + '万' : n;
function kv(k, v, cls) { return `<div class="kv"><i>${k}</i><b class="${cls || ''}">${v}</b></div>`; }

let drawerMode = 'empty'; // 'empty' | 'pool' | 'stock'
function poolStocks(pid) {
  const pool = POOLS.find(x => x.id === pid);
  const list = stocks.filter(s => pool.match(s));
  if (pid === 'big') return list;
  // 涨停类池：连板数降序 → 首封时间升序
  return list.sort((a, b) => {
    const la = limitMap.get(a.code6), lb = limitMap.get(b.code6);
    const da = la ? +la.lu_days : 0, db = lb ? +lb.lu_days : 0;
    if (db !== da) return db - da;
    return (la ? la.first_lu_time || '' : '').localeCompare(lb ? lb.first_lu_time || '' : '');
  });
}
function renderPoolDrawer(pid) {
  drawerMode = 'pool';
  const pool = POOLS.find(x => x.id === pid);
  const list = poolStocks(pid);
  const isLimitPool = pid === 'limit' || pid === 'lianban' || pid === 'first';
  drawer.innerHTML = `
    <h3>${pool.label}<span class="d-code">${list.length} 只</span></h3>
    <div class="d-hint" style="margin:2px 0 10px">${isLimitPool ? '按连板数 · 首封时间排序' : '按市值权重排序'} · 点击行看详情</div>
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
  drawer.querySelectorAll('li[data-code]').forEach(li =>
    li.addEventListener('click', () => selectStock(li.dataset.code)));
}
function renderEmptyDrawer() {
  drawer.innerHTML = `<div class="d-empty"><b>点击树图任意个股</b><br>查看实时行情 · 涨停原因 · 竞价数据<br><br>点击板块标题条查看板块成分<br><span style="opacity:.7">演示数据 · 2026-11-13 收盘快照</span></div>`;
}

function drawKline(cv) {
  const ctx = cv.getContext('2d');
  const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
  const dpr = DPR;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const dd = KLINE_DEMO.daily_details || [];
  if (!dd.length) return;
  const hi = Math.max(...dd.map(d => d.high)), lo = Math.min(...dd.map(d => d.low));
  const px = i => 14 + i * ((W - 28) / Math.max(1, dd.length - 1));
  const py = v => 8 + (hi - v) / (hi - lo || 1) * (H - 18);
  // 网格 + 价格
  ctx.strokeStyle = '#b3b9c1'; ctx.fillStyle = '#5f6570'; ctx.font = '10px "IBM Plex Mono",monospace';
  for (const v of [hi, (hi + lo) / 2, lo]) {
    ctx.beginPath(); ctx.moveTo(0, py(v)); ctx.lineTo(W, py(v)); ctx.stroke();
    ctx.fillText(v.toFixed(0), 3, py(v) - 2);
  }
  dd.forEach((d, i) => {
    const x = px(i), upC = d.close >= d.open;
    ctx.strokeStyle = upC ? '#b02327' : '#0c6b44'; ctx.fillStyle = upC ? '#b02327' : '#0c6b44';
    ctx.beginPath(); ctx.moveTo(x, py(d.high)); ctx.lineTo(x, py(d.low)); ctx.stroke();
    const bw = Math.max(2, (W - 28) / dd.length * 0.5);
    const yo = py(d.open), yc = py(d.close);
    ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
  });
}

function selectStock(code6) {
  selectedCode = code6;
  const s = stockByCode.get(code6);
  if (!s) return;
  const l = limitMap.get(code6), c = callMap.get(code6);
  const backBtn = (drawerMode === 'pool' && activePool !== 'all') ? `<button class="d-back" id="dBack">← 返回${POOLS.find(x => x.id === activePool).label}列表</button>` : '';
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
  if (code6 === '600519' && KLINE_DEMO) {
    html += `<canvas class="d-kline" id="miniKline"></canvas>`;
  } else {
    html += `<div class="d-hint">演示数据仅含 600519 贵州茅台的 K 线样本；接入盘见（fupanla.top）数据接口后任意个股可用</div>`;
  }
  html += `</div>`;
  drawer.innerHTML = html;
  const bk = document.getElementById('dBack');
  if (bk) bk.addEventListener('click', () => renderPoolDrawer(activePool));
  if (code6 === '600519' && KLINE_DEMO) drawKline(document.getElementById('miniKline'));
}

function renderBoardDrawer(b) {
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
  drawer.querySelectorAll('li[data-code]').forEach(li =>
    li.addEventListener('click', () => selectStock(li.dataset.code)));
}

renderEmptyDrawer();

/* ============ 顶部概览 + 温度计 ============ */
const mktsEl = document.getElementById('markets');
const MKT_NAMES = { all: '沪深A股', sse: '上证', szse: '深证', hs300: '沪深300', zza50: 'A50', zza500: '中证500', main: '主板', cyb: '创业板', kcb: '科创', bj: '北交', etf: 'ETF', cb: '转债', hk: '港股', us: '美股' };
const MKT_ORDER = ['all', 'sse', 'szse', 'cyb', 'etf', 'cb', 'hk', 'us'];
const mktSeen = new Set();
OVERVIEW_MKTS.filter(m => MKT_ORDER.includes(m.market) && !mktSeen.has(m.market)).slice(0, 8).forEach(m => {
  mktSeen.add(m.market);
  const el = document.createElement('button');
  el.className = 'market-chip' + (m.market === 'all' ? ' active' : '');
  el.innerHTML = `<span class="m-name">${MKT_NAMES[m.market]}</span>
    <span class="m-pct ${pctCls(m.changePct)}">${pctText(m.changePct)}</span>
    <span class="m-count">${m.stockCount}</span>`;
  mktsEl.appendChild(el);
});
(window.MARKET_EXTRA || []).forEach(m => {
  const el = document.createElement('button');
  el.className = 'market-chip';
  el.title = `上涨 ${m.advance} / 下跌 ${m.decline}`;
  el.innerHTML = `<span class="m-name">${MKT_NAMES[m.market]}</span>
    <span class="m-pct ${pctCls(m.pct)}">${pctText(m.pct)}</span>`;
  mktsEl.appendChild(el);
});

const cur = DASH.current || {}, prev = DASH.previous_score || {};
const score = cur.total_score, delta = score - prev.total_score;
function stageOf(v) { return v < 25 ? '冰点' : v < 45 ? '退潮' : v < 60 ? '修复' : v < 78 ? '活跃' : '高潮'; }
const thermo = document.getElementById('thermo');
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
function drawTimeline() {
  const W = tlCanvas.clientWidth, H = tlCanvas.clientHeight; if (!W) return;
  const dpr = DPR;
  tlCanvas.width = W * dpr; tlCanvas.height = H * dpr;
  const ctx = tlCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const padL = 44, padR = 12, span = W - padL - padR;
  const px = m => padL + (m - DAY_START) / (DAY_END - DAY_START) * span;
  // 刻度 + 午休带
  ctx.font = '10px "IBM Plex Mono",monospace'; ctx.fillStyle = '#5f6570'; ctx.strokeStyle = '#b3b9c1';
  for (const t of [565, 660, 690, 810, 840, 900]) {
    const x = px(t);
    ctx.fillText(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, x - 14, H - 4);
    ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 16); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(201,206,214,.45)';
  ctx.fillRect(px(LUNCH_A), 4, px(LUNCH_B) - px(LUNCH_A), H - 20);
  // 泳道：连板数越高越靠上
  const lanes = 4;
  LIMIT_STOCKS.forEach(s => {
    const m = toMin(s.first_lu_time); if (m < 0) return;
    const x = px(Math.max(DAY_START, Math.min(DAY_END, m)));
    const lane = Math.min(lanes - 1, Math.max(0, (+s.lu_days || 1) - 1));
    const y = H - 26 - lane * (H - 40) / lanes;
    const r = 3.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = +s.lu_days >= 3 ? '#b12d6b' : pctColor(+s.chg || 9);
    ctx.fill();
    if (+s.lu_days >= 2) { ctx.strokeStyle = 'rgba(177,45,107,.7)'; ctx.stroke(); }
    if (+s.open_times > 0) { ctx.strokeStyle = 'rgba(229,72,77,.9)'; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke(); }
  });
  ctx.fillStyle = '#565c66'; ctx.font = '500 10px "Newsreader","Microsoft YaHei",serif';
  ctx.fillText('①首板', 6, H - 26 - 0 * (H - 40) / lanes + 3);
  ctx.fillText('②连板', 6, H - 26 - 1 * (H - 40) / lanes + 3);
  ctx.fillText('③', 6, H - 26 - 2 * (H - 40) / lanes + 3);
  ctx.fillText('④+', 6, H - 26 - 3 * (H - 40) / lanes + 3);
}
tlCanvas.addEventListener('mousemove', e => {
  const b = tlCanvas.getBoundingClientRect();
  const mx = e.clientX - b.left, my = e.clientY - b.top;
  let best = null, bd = 9;
  for (const s of LIMIT_STOCKS) {
    const m = toMin(s.first_lu_time); if (m < 0) continue;
    const x = parseFloat(tlCanvas.dataset.padL || 44) + (m - DAY_START) / (DAY_END - DAY_START) * (tlCanvas.clientWidth - 56);
    const lane = Math.min(3, Math.max(0, (+s.lu_days || 1) - 1));
    const y = tlCanvas.clientHeight - 26 - lane * (tlCanvas.clientHeight - 40) / 4;
    const d = Math.hypot(mx - x, my - y);
    if (d < bd) { bd = d; best = s; }
  }
  if (best) { tooltip.hidden = false;
    tooltip.innerHTML = `<div class="tt-name">${best.stock_name} <span style="color:var(--ink-3)">${best.lu_days}板</span></div>
      <div class="tt-row"><span>首封 ${best.first_lu_time} · 炸 ${best.open_times} 次</span><b></b></div>`;
    tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8) + 'px';
    tooltip.style.top = Math.min(e.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8) + 'px';
  } else tooltip.hidden = true;
});
tlCanvas.addEventListener('mouseleave', () => { tooltip.hidden = true; });
tlCanvas.addEventListener('click', e => {
  const b = tlCanvas.getBoundingClientRect();
  const mx = e.clientX - b.left, my = e.clientY - b.top;
  for (const s of LIMIT_STOCKS) {
    const m = toMin(s.first_lu_time); if (m < 0) continue;
    const x = 44 + (m - DAY_START) / (DAY_END - DAY_START) * (tlCanvas.clientWidth - 56);
    const lane = Math.min(3, Math.max(0, (+s.lu_days || 1) - 1));
    const y = tlCanvas.clientHeight - 26 - lane * (tlCanvas.clientHeight - 40) / 4;
    if (Math.hypot(mx - x, my - y) < 9) { selectStock(norm(s.stock_code)); return; }
  }
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
  ctx.strokeStyle = '#b3b9c1'; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(8, py(50)); ctx.lineTo(W - 8, py(50)); ctx.stroke();
  ctx.setLineDash([]);
  // 面积 + 线
  ctx.beginPath(); ctx.moveTo(px(0), py(scores[0]));
  scores.forEach((v, i) => ctx.lineTo(px(i), py(v)));
  ctx.strokeStyle = '#b12d6b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineTo(px(scores.length - 1), H - 14); ctx.lineTo(px(0), H - 14); ctx.closePath();
  ctx.fillStyle = 'rgba(177,45,107,.08)'; ctx.fill();
  // 端点标注
  ctx.fillStyle = '#232830'; ctx.font = '500 11px "IBM Plex Mono",monospace';
  const last = scores[scores.length - 1];
  ctx.fillText(String(last), px(scores.length - 1) - 8, py(last) - 6);
  ctx.fillStyle = '#5f6570'; ctx.font = '10px "IBM Plex Mono",monospace';
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

function layoutAll() { renderBase(); drawFrame(performance.now()); drawTimeline(); drawSpark(); renderEmotionStrip(); }
new ResizeObserver(() => layoutAll()).observe(mapWrap);
window.addEventListener('resize', layoutAll);

applyFilter();
layoutAll();
