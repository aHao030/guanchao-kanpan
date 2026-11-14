/* UI 修改入口：修改后刷新页面即可预览；默认值保持当前页面。
   这里只放公开的界面选项，鉴权凭据不放在此文件。
   自定义选择器样式放在 theme-overrides.css。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketUIConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
    // 新版 Ant Design / ECharts 工作台默认值。浏览器外观设置可覆盖这些值。
    workbench: { mode: 'light', up: '#c94e57', down: '#21846e', flat: '#525c68', accent: '#477a70', mapHeight: 490, labelSize: 12, density: 'middle' },
    theme: {
      tokens: {
        paper: '#f3f5f9', 'paper-2': '#edf2f8', 'paper-3': '#dce4f0', sheet: '#ffffff',
        ink: '#17263c', 'ink-2': '#34445b', muted: '#617188',
        rule: '#e1e7ef', 'rule-2': '#c9d4e3',
        accent: '#245bd7', 'accent-2': '#1648b8', 'accent-soft': '#eaf0ff', 'accent-ink': '#ffffff',
        up: '#ef4444', down: '#22c55e', flat: '#111418',
        'up-strong': '#c52d3c', 'down-strong': '#127548',
        'font-display': '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
        'font-outlier': '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
      }
    },
    layout: {
      mapMinHeight: 640,
      mapViewportOffset: 146,
      mobileMapHeight: 660,
      desktopGutter: 16,
      tabletGutter: 18,
      mobileGutter: 12
    },
    labels: { minFontSize: 10, maxFontSize: 32, minVisibleChars: 2, minCellHeight: 14 },
    modules: { emotion: true, timeline: true, history: true }
  };
});
