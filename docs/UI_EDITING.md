# UI 修改指南

v1.4.1 的默认首页使用 React、Ant Design 和 ECharts。修改通道分为页面内即时设置、默认配置、CSS 覆盖和页面源码。业务核心、API 与 UI 保持分离。

## 先用右上角外观设置

点击「外观设置」可调整深色/浅色、上涨色、下跌色、强调色、云图高度、个股名称字号和表格密度。修改立即应用到页面，成功时自动保存到当前浏览器；刷新后继续生效。

「恢复默认」读取 `public/ui.config.js` 中的 `workbench` 默认值。「导出外观配置」下载当前 JSON 设置，方便比较和迁移默认值；当前没有外观文件导入按钮。顶部日/月按钮也可一键切换明暗。

首次从旧 v1 偏好迁移时采用浅色界面，保留用户自定义的涨跌颜色、字号和尺寸；后续主动修改的明暗设置仍会保存。

外观保存在 `guanchao.workbench.preferences.v2`，属于浏览器当前站点的本地存储。不同端口视为不同来源；设置不会自动跨浏览器或设备同步。

## 修改项目默认值

编辑 `public/ui.config.js` 的 `workbench`，保留文件外层包装和其他对象。例如：

~~~js
workbench: {
  mode: 'light',
  up: '#c94e57',
  down: '#21846e',
  flat: '#525c68',
  accent: '#477a70',
  mapHeight: 490,
  labelSize: 12,
  density: 'middle'
},
~~~

| 字段 | 默认值 | 使用方式 |
| --- | --- | --- |
| `mode` | `light` | `dark` / `light`；使用 Ant Design 暗色/默认算法 |
| `up` / `down` | `#c94e57` / `#21846e` | 六位十六进制颜色，同时用于行情文字、云图、资金柱图和 K 线 |
| `flat` | `#525c68` | 平盘颜色，源码配置入口 |
| `accent` | `#477a70` | 界面强调色与 Ant Design 主色 |
| `mapHeight` | 490 | 云图高度，页面滑块支持 320–800px |
| `labelSize` | 12 | 云图个股文字字号，支持 10–20px |
| `density` | `middle` | `middle` 舒适 / `small` 紧凑；用于受该设置控制的行情表格 |

浏览器已保存的设置优先于文件默认值。因此修改文件并刷新后，还需点击「恢复默认」才能让已有用户重新采用新默认值。文件中默认配置应按上述类型和范围填写；用户设置的校验和主题配色集中在 `web/preferences.js`。

配置文件本身不经过 Web 打包，保存刷新即可生效。要同步 `dist/sdk/ui.config.js` 副本，再运行 `npm run build`。名称字号无法保证每个小格显示全名；通过行业放大、搜索和股票列表补充阅读。

## 自定义样式

日常样式修改放在 `public/theme-overrides.css`，它在已构建的 `workbench.css` 后加载。例如：

~~~css
/* 拉开页面内容两侧的留白 */
.content { padding-inline: 28px; }

/* 调整页面标题 */
.section-heading h1 { font-size: 23px; }

/* 调整资金区域与云图之间的间距 */
.fund-section { margin-top: 28px; }
~~~

上述选择器需以当前源码为准。CSS 遵循正常的选择器优先级规则；Ant Design 也会注入组件样式，必要时使用页面容器限定选择器。涨跌颜色和图表字号优先通过 `workbench` 配置修改：根元素的主题变量由运行时设置，图表直接接收 React 设置值，仅覆盖 CSS 不会可靠改变 Canvas 内的图形。

ECharts 绘制在 Canvas 上，无法通过 `.chart` 下的文字选择器调整某只股票标签；修改 `web/charts.jsx` 的 ECharts option。主题背景、文字和边框的深浅配色在 `web/preferences.js` 的 `palette()` 中；Ant Design token 与组件主题配置在 `web/main.jsx` 的 `ConfigProvider` 中。

## 修改页面结构与交互

| 文件 | 负责内容 |
| --- | --- |
| `web/main.jsx` | 四个顶部导航、云图首页、资金区、自选表格、搜索、股票列表、详情、外观设置与提醒 |
| `web/charts.jsx` | ECharts 挂载/释放、云图、资金柱图和 K 线配置 |
| `web/LimitBoard.jsx` | 涨停/连板/炸板/跌停切换、筛选、分组信息列、同页明细及响应式重排 |
| `web/ReviewNotes.jsx` | 笔记列表、编辑表单、草稿恢复、导入导出及删除交互 |
| `web/notes-store.js` | 笔记日期/长度校验、存储契约、同日合并规则；不承担页面排版 |
| `web/preferences.js` | 默认设置、偏好读取/保存与深浅主题调色板 |
| `web/workbench.css`、`web/pages.css` | 新工作台基础排版、组件样式和响应式规则 |
| `public/index.html` | 页面容器和本地脚本/样式入口；主体布局在 React 源码 |

修改 `web/` 源码后执行：

~~~powershell
npm ci             # 首次开发或依赖变化后
npm run build
npm start
~~~

已运行服务时不必再次启动；构建后刷新即可。`npm run dev:web` 执行一次 Web 构建，不是自动监听或热更新服务。构建产物为 `public/workbench.js`、`public/workbench.css` 及关联许可证文件，勿直接修改，下一次构建会覆盖。

## 新旧界面的边界

默认 `/` 和 `/index.html` 是新工作台。`/legacy.html` 保留 v1.3.0 的旧 Canvas 页面及其回归依据，不在新版菜单中展示。

`public/ui.config.js` 中旧的 `theme.tokens`、`layout`、`labels`、`modules` 仍只服务旧页面；它们不会改变新的 React 页面。旧版 `public/app.js`、`style.css`、`market-map.js`、`ui-settings.js` 同理。修改新工作台请使用 `workbench` 和 `web/`，避免改错文件。

## 数据与存储边界

`public/data.config.js` 的 `mode: 'auto'` 在 HTTP 页面优先读取 API，API 失败可按 `fallbackToSample` 回退内置样本；`baseUrl: ''` 为同站点。需要严格验证 API 时使用 `mode: 'api'` 且 `fallbackToSample: false`。数据异常时新页面提供重试或明确的样本提示。

页面公开配置不存储密钥或长期 token。笔记与自选是本机数据；修改 UI、重新构建不会主动清除它们，但浏览器清理站点数据会影响保存内容。笔记应通过页面导出备份，在新设备或来源中导入。

共享业务规则和接口继续使用 `packages/market-core`、`packages/market-client` 与 `/api/v1`。`public/shared/*` 和 `dist/sdk/*` 由 `scripts/build.cjs` 生成，不要手工编辑。后续 App 或小程序可复用共享层，界面需要按平台重新适配。
