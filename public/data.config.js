/* 数据接入配置。这里只能放公开地址；账号、token等秘密留在服务端。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketDataConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    mode: 'auto', // auto: HTTP页面读API，file页面读内置样本；sample:始终读样本；api:要求API
    baseUrl: '',  // 空值表示当前站点。将来App/小程序客户端填自己的HTTPS服务地址。
    timeoutMs: 3000,
    fallbackToSample: true
  };
});
