function sendJson(req, res, status, value, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function sendError(req, res, status, code, message, headers) {
  sendJson(req, res, status, { error: { code, message } }, headers);
}

function snapshotMeta(snapshot) {
  return { ...snapshot.meta, schemaVersion: snapshot.schemaVersion, apiVersion: 'v1' };
}

function stockQuery(req, model) {
  const marker = req.url.indexOf('?');
  const params = new URLSearchParams(marker < 0 ? '' : req.url.slice(marker + 1));
  const allowed = new Set(['pool', 'industry', 'q', 'sort', 'limit', 'offset']);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) throw new RangeError('Unknown or repeated query parameter');
  }
  const pool = params.get('pool') || 'all';
  const industry = params.get('industry') || '';
  const q = (params.get('q') || '').trim();
  const sort = params.get('sort') || 'rank';
  if (!model.pools.some(item => item.id === pool)) throw new RangeError('Unknown stock pool');
  if (!['rank', 'marketCap', 'changePct'].includes(sort)) throw new RangeError('Unknown stock sort');
  if (industry && !model.boards.some(board => String(board.code) === industry || board.name === industry)) throw new RangeError('Unknown industry');
  if (q.length > 100) throw new RangeError('Search query must be at most 100 characters');
  const integers = {};
  for (const [name, fallback, min, max] of [['limit', '50', 1, 200], ['offset', '0', 0, Number.MAX_SAFE_INTEGER]]) {
    const value = params.get(name) ?? fallback;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      throw new RangeError(name + ' is outside its allowed integer range');
    }
    integers[name] = Number(value);
  }
  return { pool, industry, q, sort, ...integers };
}

function createApi({ provider, version }) {
  let snapshotPromise;
  let model;
  function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = Promise.resolve().then(() => provider.loadSnapshot()).then(snapshot => {
        if (!snapshot || snapshot.schemaVersion !== 1) throw new Error('Unsupported market snapshot');
        return snapshot;
      }).catch(error => { snapshotPromise = undefined; throw error; });
    }
    return snapshotPromise;
  }
  return async function handleApi(req, res, pathname) {
    if (pathname === '/api/v1/health') {
      const snapshot = await loadSnapshot();
      sendJson(req, res, 200, {
        data: { status: 'ok', service: 'guanchao-kanpan', version, readOnly: true },
        meta: snapshotMeta(snapshot),
      });
      return;
    }
    if (pathname === '/api/v1/snapshot') {
      const snapshot = await loadSnapshot();
      sendJson(req, res, 200, { data: snapshot, meta: snapshotMeta(snapshot) });
      return;
    }
    const paths = ['/api/v1/markets', '/api/v1/industries', '/api/v1/stocks', '/api/v1/emotion', '/api/v1/timeline'];
    const detailMatch = /^\/api\/v1\/stocks\/([^/]+)$/.exec(pathname);
    if (!paths.includes(pathname) && !detailMatch) {
      sendError(req, res, 404, 'NOT_FOUND', 'API endpoint not found');
      return;
    }
    if (detailMatch && !/^\d{6}$/.test(detailMatch[1])) {
      sendError(req, res, 400, 'INVALID_STOCK_CODE', 'Stock code must contain six digits');
      return;
    }
    const snapshot = await loadSnapshot();
    const meta = snapshotMeta(snapshot);
    if (!model) model = require('../packages/market-core').createMarketModel(snapshot);
    let data;
    if (pathname === '/api/v1/markets') {
      const markets = (snapshot.overview?.markets || []).filter(market => market.market !== 'us');
      const seen = new Set(markets.map(market => market.market));
      data = markets.concat((snapshot.marketExtra || []).filter(market => market.market !== 'us' && !seen.has(market.market))
        .map(market => ({ ...market, changePct: market.pct })));
    } else if (pathname === '/api/v1/industries') {
      data = model.boards.map(board => ({ code: board.code, name: board.name, stockCount: board.stockCount,
        marketCap: board.value, changePct: board.pct }));
    } else if (pathname === '/api/v1/stocks') {
      let query;
      try { query = stockQuery(req, model); }
      catch (error) { sendError(req, res, 400, 'INVALID_QUERY', error.message); return; }
      const { limit, offset, ...filters } = query;
      const items = model.queryStocks(filters);
      data = { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
    } else if (detailMatch) {
      data = model.getStockDetail(detailMatch[1]);
      if (!data) { sendError(req, res, 404, 'STOCK_NOT_FOUND', 'Stock not found'); return; }
    } else if (pathname === '/api/v1/emotion') {
      data = snapshot.dashboard?.data || snapshot.dashboard || {};
    } else {
      data = model.limitStocks;
    }
    sendJson(req, res, 200, { data, meta });
  };
}

module.exports = { createApi, sendError };
