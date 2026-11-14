(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketDataSource = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  async function load(options) {
    const { core, clientSdk, source, config = {}, protocol = 'file:', fetchImplementation } = options;
    const mode = ['auto', 'sample', 'api'].includes(config.mode) ? config.mode : 'auto';
    function embedded(fallback) {
      const snapshot = core.fromLegacyGlobals(source);
      return { ...snapshot, meta: { ...snapshot.meta, transport: 'embedded', fallback: Boolean(fallback) } };
    }
    if (mode === 'sample' || (mode === 'auto' && protocol === 'file:')) return embedded(false);
    try {
      const client = clientSdk.createMarketClient({
        baseUrl: config.baseUrl || '',
        timeoutMs: config.timeoutMs || 3000,
        transport: clientSdk.createFetchTransport(fetchImplementation)
      });
      const envelope = await client.getSnapshot();
      const snapshot = envelope.data;
      core.createMarketModel(snapshot); // validate the data contract before passing it to the screen
      return { ...snapshot, meta: { ...snapshot.meta, transport: 'api', fallback: false } };
    } catch (error) {
      if (config.fallbackToSample !== false) return embedded(true);
      throw error;
    }
  }
  return { load };
});
