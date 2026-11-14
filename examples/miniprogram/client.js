/* Copy dist/sdk/market-client.js to the actual mini program's vendor directory,
   then use this factory from its app-service code. This is an adapter example,
   not a published or independently runnable mini program. */
function createMiniProgramMarketClient(wxSdk, baseUrl, marketClientSdk) {
  if (!/^https:\/\//.test(baseUrl || '')) throw new TypeError('Configure your HTTPS market service URL');
  return marketClientSdk.createMarketClient({ baseUrl, transport: marketClientSdk.createWechatTransport(wxSdk) });
}
module.exports = { createMiniProgramMarketClient };
