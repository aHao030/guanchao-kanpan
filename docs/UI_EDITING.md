# UI 修改指南

当前界面保留原有设计，已把常用修改入口与业务核心分开。改配色、尺寸、标签和模块显示，先编辑下面的公开配置；以后也可以整体替换 UI，继续使用同一套共享核心与 API。

## 修改入口

| 文件 | 修改内容 |
| --- | --- |
| `public/ui.config.js` | 配色与字体 token、主图高度、页面边距、Canvas 标签、模块开关。最常用入口。 |
| `public/theme-overrides.css` | 自定义 CSS 选择器、间距、排版及 token 覆盖。最后加载。 |
| `public/index.html` | 页面结构、标题、说明文字、可访问性属性；修改现有元素 ID 前检查脚本引用。 |
| `public/style.css` | 基础样式和响应式布局。大规模布局调整时修改，日常定制优先用 overrides。 |
| `public/market-map.js` | 树图布局、Canvas 绘制、标签排版算法；Canvas 内文字无法直接用 CSS 选择器修改。 |
| `public/app.js` | 页面交互、弹窗、图表与界面编排。纯配色与尺寸调整通常不需要改它。 |
| `public/ui-settings.js` | 配置校验、默认值和应用机制；新增可配置能力时修改。 |
| `public/data.config.js`、`public/data-source.js` | 数据服务地址、加载模式和失败回退；属于数据接入入口。 |

`packages/market-core/index.js` 是无 DOM 的业务核心，`packages/market-client/index.js` 是请求 SDK。界面调整不需要改它们，也不需要改 API 数据契约。

## 四个常用修改

在 `public/ui.config.js` 的现有对象中找到对应字段，只替换目标值，保留其他字段和脚本包装。例如：

```js
// theme.tokens：主色改为紫色；相关状态色一起调整更完整。
accent: '#7c3aed', 'accent-2': '#6d28d9',
'accent-soft': '#f3e8ff', 'accent-ink': '#ffffff',

// layout：主图增高，单位是像素，数值不要加引号或 px。
mapMinHeight: 760,
mapViewportOffset: 146,
mobileMapHeight: 820,

// labels：把原 labels 对象替换为这一行。
labels: { minFontSize: 12, maxFontSize: 32, minVisibleChars: 2, minCellHeight: 14 },

// modules：关闭情绪概览，保留两个底部图表。
modules: { emotion: false, timeline: true, history: true }
```

这是不同位置的编辑片段，不要把整段直接追加到文件末尾。

桌面主图采用 `max(mapMinHeight, 视口高度 - mapViewportOffset)` 的布局；宽度 701–960px 时高度为 700px，并受 `mapMinHeight` 下限约束；宽度不超过 700px 时使用 `mobileMapHeight`。因此，修改桌面最小高度不等于给所有设备设定固定高度。

标签仍按单元格面积排版；提高最小字号会让小格子隐藏更多文字，不保证每个格子都能显示全名。模块开关控制对应区域的显示，全部设为 `false` 也不会改变 API 返回的数据。

| 配置 | 默认值 | 接受范围 |
| --- | --- | --- |
| `layout.mapMinHeight` | 640 | 320–1600 |
| `layout.mapViewportOffset` | 146 | 0–600 |
| `layout.mobileMapHeight` | 660 | 320–1800 |
| `layout.desktopGutter` / `tabletGutter` / `mobileGutter` | 16 / 18 / 12 | 0–80 / 0–80 / 0–48 |
| `labels.minFontSize` / `maxFontSize` | 10 / 32 | 8–24 / 10–64 |
| `labels.minVisibleChars` / `minCellHeight` | 2 / 14 | 1–8 / 8–128 |
| `modules.emotion` / `timeline` / `history` | 均为 `true` | 布尔值 `true` 或 `false` |

数值必须是有限数字，范围内的小数会取整；缺失、类型错误或越界的值回到内置默认值。`maxFontSize` 小于 `minFontSize` 时回到 32。颜色接受十六进制形式，例如 `#7c3aed`；字体用 `font-display`、`font-outlier`，配置支持普通字体名与字体列表。

其他常用 token 包括背景 `paper`、`paper-2`、`paper-3`、`sheet`，文字 `ink`、`ink-2`、`muted`，边框 `rule`、`rule-2`，涨跌色 `up`、`down`、`flat`、`up-strong`、`down-strong`。

## 自定义 CSS 与覆盖优先级

在 `public/theme-overrides.css` 末尾添加：

```css
:root { --accent: #7c3aed; }
.brand strong { font-size: 20px; }
.map-title-row { padding-block: 16px; }
```

加载顺序是 `style.css` → `ui.config.js` / `ui-settings.js` 生成的 token 样式 → `theme-overrides.css`。最后这个文件在同等选择器优先级下覆盖前面的值；运行中调用 `apply()` 也会把生成样式放在它前面。CSS 仍遵循正常的选择器优先级与 `!important` 规则。

如果修改 `ui.config.js` 后某个颜色或尺寸没有变化，先检查 overrides 是否写了同名变量或直接设置了该属性。Canvas 装饰色从 CSS token 读取，刷新页面后一起生效；标签字号则使用 `labels` 配置。

## 保存、预览与恢复

使用 Node.js 20 或更高版本，在项目根目录运行：

```powershell
npm run build
npm start
```

默认打开 `http://127.0.0.1:8791`；设置过 `PORT` 时使用对应端口。保存上述 UI 文件后刷新页面即可预览，不需要重启服务；浏览器仍显示旧内容时使用强制刷新。修改了共享源码，或准备交付 SDK 时，再运行 `npm run build`。

浏览器开发者工具控制台也能临时试改。保留当前所有设置，再改指定字段：

```js
const next = JSON.parse(JSON.stringify(window.MarketUI));
next.theme.tokens.accent = '#7c3aed';
next.layout.mobileMapHeight = 820;
next.labels.minFontSize = 12;
next.modules.emotion = false;
window.MarketUISettings.apply(next);
```

`apply(input)` 每次都会重新标准化整份配置，**不是增量合并**。例如仅传 `{ labels: { minFontSize: 12 } }`，其他配色、尺寸、模块设置都会回到内置默认值。当前实际配置可查看 `window.MarketUI`；`normalize(input)` 只校验与补默认，不修改界面。

临时恢复内置默认设置：

```js
window.MarketUISettings.apply({});
```

恢复文件中保存的设置：

```js
window.MarketUISettings.apply(window.MarketUIConfig);
```

这两种操作都不会保存文件，且仍受 `theme-overrides.css` 覆盖；刷新后重新读取文件。要永久恢复，撤回 `ui.config.js` 中的修改，并删除 overrides 中新增的规则。若要取得完整内置默认对象，可在控制台执行 `JSON.stringify(MarketUISettings.normalize({}), null, 2)`，将结果替换进 `ui.config.js` 的 `return` 对象，保留文件外层包装，再保存刷新。

## 数据与源码边界

`public/data.config.js` 中 `mode: 'auto'` 表示 HTTP 页面优先读 API、`file:` 页面读内置样本；`sample` 始终读样本；`api` 尝试 API。默认 `fallbackToSample: true`，API 出错会回退样本。要验证服务接入，可设为 `mode: 'api'` 且 `fallbackToSample: false`。`baseUrl: ''` 表示同站点；换数据服务后保存刷新。

前端配置、浏览器文件和小程序包都可被用户读取，不能放账号、密钥或长期 token。需要凭据的数据源由服务端接入。

`public/shared/market-core.js`、`public/shared/market-client.js` 与 `dist/sdk/*` 是 `npm run build` 生成的文件，不要直接编辑。修改对应 `packages/*/index.js` 或 `public/ui.config.js` 后重新构建。完整替换 UI 时仍可沿用共享核心、SDK 与 `/api/v1`；浏览器页面结构、交互和绘图代码则按新界面调整。
