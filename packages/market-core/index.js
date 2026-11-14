/* Platform-independent market model. No DOM, filesystem or network access. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.MarketCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeCode(code) {
    return String(code == null ? '' : code).replace(/\D/g, '').slice(-6);
  }

  function formatPct(value) {
    return (value >= 0 ? '+' : '') + (Math.round(value * 100) / 100).toFixed(2) + '%';
  }

  function changeClass(value) {
    return value > 0.005 ? 'up' : value < -0.005 ? 'down' : '';
  }

  function emotionStage(value) {
    return value < 25 ? '冰点' : value < 45 ? '退潮' : value < 60 ? '修复' : value < 78 ? '活跃' : '高潮';
  }

  function records(value) {
    if (Array.isArray(value)) return value;
    return value && Array.isArray(value.data) ? value.data : [];
  }

  function fromLegacyGlobals(source = {}) {
    const dashboard = source.DASHBOARD || { data: {} };
    const rawDate = (dashboard.data || dashboard).latest_date || source.OVERVIEW?.updatedAt || source.TREEMAP?.updatedAt || source.SUMMARY_ALL?.updatedAt;
    const match = String(rawDate || '').match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    return {
      schemaVersion: 1,
      meta: {
        mode: 'sample',
        asOf: match ? match.slice(1).join('-') : null,
        sources: ['dapanyuntu.com', 'fupanla.top']
      },
      treemap: source.TREEMAP || { nodes: [] },
      overview: source.OVERVIEW || { markets: [] },
      summary: source.SUMMARY_ALL || null,
      dashboard,
      limit: source.LIMIT || [],
      auction: source.CALL || [],
      klineByCode: source.KLINE_600519 ? { '600519': source.KLINE_600519 } : {},
      marketExtra: source.MARKET_EXTRA || []
    };
  }

  function createMarketModel(snapshot) {
    if (!snapshot || snapshot.schemaVersion !== 1) throw new TypeError('Unsupported market snapshot schemaVersion; expected 1');
    if (!snapshot.treemap || !Array.isArray(snapshot.treemap.nodes)) throw new TypeError('Market snapshot treemap.nodes must be an array');
    const nodes = snapshot.treemap.nodes;
    const stocks = [];
    const boards = nodes.map(board => {
      if (!board || (board.children != null && !Array.isArray(board.children))) throw new TypeError('Industry children must be an array');
      const children = (board.children || []).map(item => {
        if (!item || typeof item.name !== 'string') throw new TypeError('A market stock must have a name');
        const stock = { ...item, code6: normalizeCode(item.code), board: board.name, boardCode: board.code };
        stocks.push(stock);
        return stock;
      });
      return {
        name: board.name,
        code: board.code,
        value: board.value,
        stockCount: board.stockCount,
        children: children.slice().sort((a, b) => (b.value || 0) - (a.value || 0)),
        pct: children.reduce((sum, item) => sum + (item.changePct || 0) * (item.value || 1), 0) / (board.value || 1)
      };
    });
    const limitRecords = records(snapshot.limit);
    const limitStocks = limitRecords.slice().sort((a, b) => String(a.first_lu_time || '').localeCompare(String(b.first_lu_time || '')));
    const limitByCode = new Map(limitRecords.map(record => [normalizeCode(record.stock_code), record]));
    const auctionByCode = new Map(records(snapshot.auction).map(record => [normalizeCode(record.stock_code), record]));
    const stockByCode = new Map(stocks.map(stock => [stock.code6, stock]));
    const seriesByCode = new Map(Object.entries(snapshot.klineByCode || {}).map(([code, series]) => [normalizeCode(code), series]));
    const marketCapOrder = (a, b) => (b.value || 0) - (a.value || 0);
    const bigCodes = new Set(stocks.slice().sort(marketCapOrder).slice(0, 50).map(stock => stock.code6));
    const poolDefinitions = [
      { id: 'all', label: '全部', match: () => true, count: stocks.length },
      { id: 'limit', label: '涨停', match: stock => limitByCode.has(stock.code6), count: limitStocks.length },
      { id: 'lianban', label: '连板', match: stock => Number(limitByCode.get(stock.code6)?.lu_days) >= 2,
        count: limitStocks.filter(record => Number(record.lu_days) >= 2).length },
      { id: 'first', label: '首板', match: stock => Number(limitByCode.get(stock.code6)?.lu_days) === 1,
        count: limitStocks.filter(record => Number(record.lu_days) === 1).length },
      { id: 'big', label: '大市值', match: stock => bigCodes.has(stock.code6), count: bigCodes.size }
    ];
    const pools = poolDefinitions.map(({ id, label, count }) => ({ id, label, count }));
    const members = new Map(poolDefinitions.map(pool => [pool.id, stocks.filter(pool.match)]));
    function rankLimits(a, b) {
      const left = limitByCode.get(a.code6), right = limitByCode.get(b.code6);
      const days = (Number(right?.lu_days) || 0) - (Number(left?.lu_days) || 0);
      return days || String(left?.first_lu_time || '').localeCompare(String(right?.first_lu_time || ''));
    }
    function queryStocks({ pool = 'all', industry = '', q = '', sort = 'rank' } = {}) {
      if (!members.has(pool)) throw new RangeError('Unknown stock pool: ' + pool);
      if (!['rank', 'marketCap', 'changePct'].includes(sort)) throw new RangeError('Unknown stock sort: ' + sort);
      const industryKey = String(industry == null ? '' : industry).trim();
      const query = String(q == null ? '' : q).trim();
      const digits = query.replace(/\D/g, '');
      const list = members.get(pool).filter(stock =>
        (!industryKey || String(stock.boardCode) === industryKey || stock.board === industryKey) &&
        (!query || String(stock.name || '').includes(query) || (digits && stock.code6.includes(digits)))
      );
      const comparator = sort === 'changePct' ? (a, b) => (b.changePct || 0) - (a.changePct || 0) :
        sort === 'marketCap' || pool === 'all' || pool === 'big' ? marketCapOrder : rankLimits;
      return list.sort(comparator);
    }
    function getStockDetail(code) {
      const normalized = normalizeCode(code);
      const stock = stockByCode.get(normalized);
      if (!stock) return null;
      const series = seriesByCode.get(normalized);
      return {
        stock,
        limitUp: limitByCode.get(normalized) || null,
        auction: auctionByCode.get(normalized) || null,
        kline: series ? (Object.prototype.hasOwnProperty.call(series, 'data') ? series.data : series) || null : null
      };
    }
    return { stocks, boards, pools, limitStocks, queryStocks, getStockDetail };
  }

  return { normalizeCode, formatPct, changeClass, emotionStage, fromLegacyGlobals, createMarketModel };
});
