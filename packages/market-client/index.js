(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketClient = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  class MarketApiError extends Error {
    constructor(message, code, status) {
      super(message);
      this.name = 'MarketApiError';
      this.code = code || 'NETWORK_ERROR';
      this.status = status || 0;
    }
  }
  function createMarketClient(options) {
    const settings = options || {};
    const baseUrl = String(settings.baseUrl || '').replace(/\/+$/, '');
    const transport = settings.transport;
    if (!transport || typeof transport.request !== 'function') throw new TypeError('A request transport is required');
    const timeout = Number.isFinite(settings.timeoutMs) && settings.timeoutMs > 0 ? settings.timeoutMs : 5000;
    async function get(resource, query) {
      const pairs = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
      const suffix = pairs.length ? '?' + pairs.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value))).join('&') : '';
      let response;
      try { response = await transport.request({ url: baseUrl + '/api/v1/' + resource + suffix, method: 'GET', timeout }); }
      catch (error) {
        if (error instanceof MarketApiError) throw error;
        throw new MarketApiError('无法连接市场数据服务', 'NETWORK_ERROR', 0);
      }
      const status = response && response.status;
      const body = response && response.data;
      if (!(status >= 200 && status < 300)) {
        throw new MarketApiError(body?.error?.message || '市场数据请求失败', body?.error?.code || 'HTTP_ERROR', status);
      }
      if (!body || !Object.prototype.hasOwnProperty.call(body, 'data') || !body.meta || typeof body.meta !== 'object') {
        throw new MarketApiError('数据服务返回了无法识别的格式', 'INVALID_RESPONSE', status);
      }
      return body;
    }
    return {
      getHealth: () => get('health'),
      getSnapshot: () => get('snapshot'),
      getMarkets: () => get('markets'),
      getIndustries: () => get('industries'),
      getStocks: query => get('stocks', query),
      getStock: code => get('stocks/' + encodeURIComponent(String(code))),
      getEmotion: () => get('emotion'),
      getTimeline: () => get('timeline')
    };
  }
  function createFetchTransport(fetchImplementation) {
    const fetcher = fetchImplementation || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetcher) throw new TypeError('A Fetch implementation is required');
    return {
      async request(options) {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), options.timeout) : null;
        try {
          const response = await fetcher(options.url, { method: options.method, headers: { Accept: 'application/json' }, ...(controller ? { signal: controller.signal } : {}) });
          let data;
          try { data = await response.json(); }
          catch { throw new MarketApiError('数据服务返回的内容不是JSON', 'INVALID_RESPONSE', response.status); }
          return { status: response.status, data };
        } catch (error) {
          if (error?.name === 'AbortError') throw new MarketApiError('市场数据请求超时', 'REQUEST_TIMEOUT', 0);
          throw error;
        } finally { if (timer) clearTimeout(timer); }
      }
    };
  }
  function createWechatTransport(sdk) {
    if (!sdk || typeof sdk.request !== 'function') throw new TypeError('A wx.request compatible SDK is required');
    return {
      request(options) {
        return new Promise((resolve, reject) => sdk.request({
          url: options.url,
          method: options.method,
          timeout: options.timeout,
          dataType: 'json',
          header: { Accept: 'application/json' },
          success(response) {
            let data = response.data;
            if (typeof data === 'string') {
              try { data = JSON.parse(data); }
              catch { reject(new MarketApiError('数据服务返回的内容不是JSON', 'INVALID_RESPONSE', response.statusCode)); return; }
            }
            resolve({ status: response.statusCode, data });
          },
          fail(error) {
            const timeout = /timeout/i.test(error?.errMsg || '');
            reject(new MarketApiError(timeout ? '市场数据请求超时' : '无法连接市场数据服务', timeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR', 0));
          }
        }));
      }
    };
  }
  return { createMarketClient, createFetchTransport, createWechatTransport, MarketApiError };
});
