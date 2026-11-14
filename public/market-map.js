/* Canvas renderer for market → industry → subindustry → stock.
   Geometry uses the locally bundled d3-hierarchy (ISC, see vendor license). */
'use strict';
window.MarketTreemap = (() => {
  function layout(boards, width, height) {
    const tree = { kind: 'root', children: boards.map(board => {
      const groups = new Map();
      for (const stock of board.children) {
        const name = stock.subBoardName || board.name;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(stock);
      }
      return { kind: 'board', board, name: board.name, children: [...groups].map(([name, children]) => ({
        kind: 'subboard', board, name,
        children: children.map(stock => ({ kind: 'stock', stock, value: Math.max(0, stock.value || 0) }))
      })) };
    }) };
    const root = d3.hierarchy(tree).sum(d => d.kind === 'stock' ? d.value : 0).sort((a, b) => b.value - a.value);
    d3.treemap().tile(d3.treemapSquarify.ratio(1.25)).size([width, height])
      .paddingInner(node => node.depth === 0 ? 3 : node.depth === 1 ? 2 : 1)
      .paddingTop(node => {
        if (!node.children) return 0;
        const w = node.x1 - node.x0, h = node.y1 - node.y0;
        if (node.depth === 1) return w > 48 && h > 45 ? 22 : 0;
        if (node.depth === 2) return w > 78 && h > 65 ? 16 : 0;
        return 0;
      })(root);
    const entries = [], headers = [];
    root.eachBefore(node => {
      if (!node.depth) return;
      const rect = { x: node.x0, y: node.y0, w: node.x1 - node.x0, h: node.y1 - node.y0 };
      if (rect.w <= 0 || rect.h <= 0) return;
      const d = node.data;
      if (d.kind === 'stock') {
        entries.push({ kind: 'stock', node: d.stock, rect });
      } else {
        const headerHeight = d.kind === 'board' ? (rect.w > 48 && rect.h > 45 ? 22 : 0) : (rect.w > 78 && rect.h > 65 ? 16 : 0);
        if (headerHeight) headers.push({ kind: d.kind, name: d.name, node: d.board, rect: { ...rect, h: headerHeight } });
      }
    });
    return { entries, headers, stockCount: root.leaves().length };
  }

  function drawLabel(ctx, stock, rect, theme, color) {
    const { x, y, w, h } = rect;
    if (w < 40 || h < 18) return;
    let size = Math.min(32, Math.floor(Math.sqrt(w * h) / 7));
    size = Math.max(12, size);
    while (size >= 12) {
      ctx.font = `600 ${size}px ${theme.display}`;
      if (ctx.measureText(stock.name).width <= w - 9 && size + 5 <= h) break;
      size--;
    }
    if (size < 12) return;
    const figureSize = Math.max(11, Math.round(size * .72));
    const figure = (stock.changePct >= 0 ? '+' : '') + Number(stock.changePct || 0).toFixed(2) + '%';
    const twoLines = h >= size + figureSize + 13;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(stock.name, x + w / 2, y + h / 2 - (twoLines ? figureSize / 2 + 2 : 0));
    if (twoLines) {
      ctx.font = `500 ${figureSize}px ${theme.mono}`;
      if (ctx.measureText(figure).width <= w - 8) ctx.fillText(figure, x + w / 2, y + h / 2 + size / 2 + 2);
    }
    ctx.restore();
  }

  function draw(ctx, scene, width, height, theme, options) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.surface; ctx.fillRect(0, 0, width, height);
    for (const entry of scene.entries) {
      const stock = entry.node, r = entry.rect;
      const hit = !options.matches || options.matches.has(stock.code6);
      const fill = options.color(stock.changePct);
      ctx.globalAlpha = hit ? 1 : .12;
      ctx.fillStyle = fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (hit) drawLabel(ctx, stock, r, theme, options.textColor(fill));
    }
    ctx.globalAlpha = 1;
    for (const header of scene.headers) {
      const r = header.rect;
      ctx.fillStyle = header.kind === 'board' ? theme.surface : theme.panel;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const size = header.kind === 'board' ? 12 : 10;
      ctx.font = `${header.kind === 'board' ? 650 : 400} ${size}px ${theme.display}`;
      ctx.fillStyle = header.kind === 'board' ? theme.ink : theme.muted;
      ctx.textAlign = 'start'; ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(header.name).width;
      if (textWidth <= r.w - 8) ctx.fillText(header.name, r.x + 4, r.y + r.h / 2);
      if (header.kind === 'board' && r.w > textWidth + 65) {
        const pct = (header.node.pct >= 0 ? '+' : '') + header.node.pct.toFixed(2) + '%';
        ctx.font = `500 10px ${theme.mono}`;
        ctx.fillStyle = header.node.pct >= 0 ? '#b72d3a' : '#127548';
        ctx.textAlign = 'end'; ctx.fillText(pct, r.x + r.w - 4, r.y + r.h / 2);
      }
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }
  return { layout, draw };
})();
