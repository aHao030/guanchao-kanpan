// Presentation-only selection: the market model, search and stock lists stay complete.
const DEFAULT_CLOUD_LIMIT = 30;
function normalizeCloudLimit(value, fallback = DEFAULT_CLOUD_LIMIT) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(1, Math.round(value))) : fallback;
}
function stockMarketCap(stock) {
  const total = stock.totalMarketCap;
  const value = total != null && total !== '' && Number.isFinite(Number(total)) ? Number(total) : Number(stock.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function selectCloudStocks(stocks, limit = DEFAULT_CLOUD_LIMIT) {
  const groups = new Map();
  for (const stock of stocks) {
    const key = stock.board || '未分类';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(stock);
  }
  const compare = (a, b) => stockMarketCap(b) - stockMarketCap(a) || String(a.code6 || a.code).localeCompare(String(b.code6 || b.code));
  return [...groups.values()].flatMap(group => group.sort(compare).slice(0, normalizeCloudLimit(limit)));
}
module.exports = { DEFAULT_CLOUD_LIMIT, normalizeCloudLimit, stockMarketCap, selectCloudStocks };
