/* Applies public UI options without coupling them to market data or a backend. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MarketUISettings = api;
    api.apply(root.MarketUIConfig, root.document);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tokenDefaults = {
    paper: '#f3f5f9', 'paper-2': '#edf2f8', 'paper-3': '#dce4f0', sheet: '#ffffff',
    ink: '#17263c', 'ink-2': '#34445b', muted: '#617188', rule: '#e1e7ef', 'rule-2': '#c9d4e3',
    accent: '#245bd7', 'accent-2': '#1648b8', 'accent-soft': '#eaf0ff', 'accent-ink': '#ffffff',
    up: '#ef4444', down: '#22c55e', flat: '#111418', 'up-strong': '#c52d3c', 'down-strong': '#127548',
    'font-display': '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
    'font-outlier': '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
  };
  const layoutRules = {
    mapMinHeight: [640, 320, 1600], mapViewportOffset: [146, 0, 600], mobileMapHeight: [660, 320, 1800],
    desktopGutter: [16, 0, 80], tabletGutter: [18, 0, 80], mobileGutter: [12, 0, 48]
  };
  const labelRules = { minFontSize: [10, 8, 24], maxFontSize: [32, 10, 64], minVisibleChars: [2, 1, 8], minCellHeight: [14, 8, 128] };
  const layoutVariables = {
    mapMinHeight: '--map-min-height', mapViewportOffset: '--map-viewport-offset', mobileMapHeight: '--mobile-map-height',
    desktopGutter: '--desktop-gutter', tabletGutter: '--tablet-gutter', mobileGutter: '--mobile-gutter'
  };
  const moduleNames = ['emotion', 'timeline', 'history'];
  const latest = new WeakMap();
  const pending = new WeakSet();
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function numbers(input, rules) {
    const source = record(input), result = {};
    for (const [key, [fallback, min, max]] of Object.entries(rules)) {
      const value = own(source, key) ? source[key] : undefined;
      result[key] = typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? Math.round(value) : fallback;
    }
    return result;
  }

  function normalize(input) {
    const source = record(input), suppliedTokens = record(record(source.theme).tokens), tokens = {};
    for (const [key, fallback] of Object.entries(tokenDefaults)) {
      const value = own(suppliedTokens, key) ? suppliedTokens[key] : undefined;
      const isFont = key.startsWith('font-');
      const valid = typeof value === 'string' && (isFont
        ? value.length > 0 && value.length <= 300 && /^[\p{L}\p{N}\s'",._-]+$/u.test(value)
        : /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value));
      tokens[key] = valid ? value : fallback;
    }
    const labels = numbers(source.labels, labelRules);
    if (labels.maxFontSize < labels.minFontSize) labels.maxFontSize = 32;
    const modules = {}, suppliedModules = record(source.modules);
    for (const key of moduleNames) modules[key] = own(suppliedModules, key) && typeof suppliedModules[key] === 'boolean' ? suppliedModules[key] : true;
    return { theme: { tokens }, layout: numbers(source.layout, layoutRules), labels, modules };
  }

  function applyModules(doc) {
    const config = latest.get(doc);
    for (const element of doc.querySelectorAll('[data-ui-region]')) {
      const name = element.getAttribute('data-ui-region');
      if (moduleNames.includes(name)) element.hidden = !config.modules[name];
    }
    const bottom = doc.querySelector('.bottom');
    if (bottom) {
      bottom.hidden = !config.modules.timeline && !config.modules.history;
      bottom.dataset.singlePlot = String(config.modules.timeline !== config.modules.history);
    }
    const win = doc.defaultView;
    if (win && typeof win.CustomEvent === 'function') win.dispatchEvent(new win.CustomEvent('market-ui-change', { detail: config }));
  }

  function apply(input, targetDocument) {
    const doc = targetDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.documentElement || !doc.head) throw new TypeError('UI settings require a document. Use normalize() outside the browser.');
    const config = normalize(input);
    latest.set(doc, config);
    if (doc.defaultView) doc.defaultView.MarketUI = config;
    let style = doc.getElementById('market-ui-tokens');
    if (!style) {
      style = doc.createElement('style'); style.id = 'market-ui-tokens';
      doc.head.insertBefore(style, doc.querySelector('link[data-ui-overrides]'));
    }
    const declarations = Object.entries(config.theme.tokens).map(([key, value]) => `--${key}:${value}`);
    for (const [key, variable] of Object.entries(layoutVariables)) declarations.push(`${variable}:${config.layout[key]}px`);
    style.textContent = `:root{${declarations.join(';')}}`;
    if (doc.readyState === 'loading') {
      if (!pending.has(doc)) {
        pending.add(doc);
        doc.addEventListener('DOMContentLoaded', () => { pending.delete(doc); applyModules(doc); }, { once: true });
      }
    } else applyModules(doc);
    return config;
  }
  return { normalize, apply };
});
