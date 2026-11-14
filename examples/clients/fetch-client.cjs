// Runnable API consumer and a starting point for an App's Fetch transport.
const sdk = require('../../packages/market-client');
const client = sdk.createMarketClient({
  baseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:' + (process.env.PORT || '8791'),
  transport: sdk.createFetchTransport(fetch)
});
(async () => {
  const result = await client.getStocks({ pool: 'first', limit: 5 });
  console.log(JSON.stringify({ meta: result.meta, total: result.data.total, stocks: result.data.items.map(stock => ({ code: stock.code6, name: stock.name })) }, null, 2));
})().catch(error => { console.error(error.code || error.name, error.message); process.exitCode = 1; });
