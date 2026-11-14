# 源码结构与开发边界

v1.4.0 默认界面为 React + Ant Design + ECharts 工作台。服务、共享业务核心和请求 SDK 沿用原有契约，源码与可直接运行的构建产物同时交付。独立 App 和微信小程序的页面工程尚未构建。

~~~mermaid
flowchart TD
  Source[React页面源码 web] --> Build[esbuild构建]
  Build --> Web[工作台 public/index.html]
  Web --> Core[共享业务核心 market-core]
  Web --> SDK[统一请求客户端 market-client]
  Web --> Local[浏览器本机笔记与自选]
  App[未来独立App] -.-> SDK
  Mini[未来小程序] -.-> SDK
  SDK --> API[只读数据API server]
  API --> Provider[样本Provider]
  Provider --> Snapshot[统一快照 schemaVersion 1]
  API --> Core
~~~

## 目录职责

| 位置 | 负责什么 | 修改场景 |
| --- | --- | --- |
| `web/main.jsx` | 四页导航、首页云图与资金区、自选股、详情、外观设置、阈值提醒 | 页面编排和交互 |
| `web/charts.jsx` | ECharts生命周期、云图、资金柱图、K线 | 专业图表呈现 |
| `web/LimitBoard.jsx` | 涨停/连板/炸板/跌停表格及详情 | 涨跌停记录 |
| `web/ReviewNotes.jsx` | 笔记列表、表单、草稿、导入导出交互 | 复盘流程 |
| `web/notes-store.js` | 笔记契约、校验、本机存储、同日合并 | 笔记数据行为 |
| `web/preferences.js` | 默认外观、偏好存储、深浅主题配色 | 主题机制 |
| `web/workbench.css`、`web/pages.css` | 新工作台基础排版及响应式样式 | 大规模布局调整 |
| `public/index.html` | 新默认首页入口，加载本地构建文件和样本/共享层 | 脚本与样式装配 |
| `public/ui.config.js` 的 `workbench` | 新工作台公开默认配色、主图尺寸、字号、密度 | 日常 UI 配置 |
| `public/theme-overrides.css` | 末尾加载的自定义样式入口 | 小范围排版覆盖 |
| `public/workbench.js/css` | esbuild 生成的新 UI 分发文件 | 运行 build 更新，勿手改 |
| `public/legacy.html`、`app.js`、`style.css`、`market-map.js`、`ui-settings.js` | 保留的 v1.3.0 旧界面与 Canvas 实现 | 兼容回归与历史参考 |
| `public/data.config.js`、`data-source.js` | API/样本加载与明确的失败回退 | 数据接入 |
| `packages/market-core/index.js` | 无 DOM、网络、文件依赖的归一化、池、查询和详情关联 | 多端业务规则 |
| `packages/market-client/index.js` | 只读 API 客户端、Fetch/微信适配及错误约定 | 多端请求 |
| `server/create-server.cjs`、`api.cjs` | 静态服务和 JSON API | 服务协议与路由 |
| `server/providers/sample-provider.cjs` | 读取受信任的本地样本 | 将来增加正式数据 Provider |
| `public/data/` | 2026-11-13 内置快照 | 更新样本并保留真实日期 |
| `public/shared/`、`dist/sdk/` | 共享源码生成的浏览器/SDK副本 | 运行 build 更新，勿手改 |
| `examples/` | Fetch 与微信客户端接入例子 | 跨端接入起点 |
| `scripts/build.cjs` | 复制共享模块与 SDK 配置 | 共享分发 |
| `scripts/build-web.cjs` | esbuild 打包 React、Ant Design、ECharts 和 CSS | Web 构建 |
| `scripts/check.cjs`、`tests/` | 语法/分发检查及行为测试 | 交付验证 |

## 开发与交付

~~~powershell
npm ci
npm run build
npm run check
npm test
npm start
~~~

源码包保留共享模块与 Web 构建产物，因此启动样本系统只需 Node.js 20+ 和 `npm start`。重新构建需要 `npm ci` 安装依赖，浏览器测试还需要本机 Google Chrome。

修改 `web/` 后重新构建并刷新；修改 `public/ui.config.js` 或 `theme-overrides.css` 后直接刷新。已保存的浏览器外观优先于文件默认值，需通过外观设置「恢复默认」采用新的文件值。`npm run dev` 监听服务端，`npm run dev:web` 是一次 Web 构建。

新版测试入口为 `npm run test:workbench`；原有页面行为、地图体验、Canvas 标签和旧 UI 配置检查保留在其原测试文件中，并针对 `legacy.html`/旧模块运行。两类测试范围必须分别说明，旧界面通过不等于新界面验收。

## 数据与本机状态

Provider 的 `loadSnapshot()` 返回快照或 Promise，通过 `createServer({ provider })` 注入。核心与客户端不绑定上游网站。正式数据适配器应保留 `schemaVersion/meta`，不要把远端脚本交给样本 Provider 执行。当前样本 Provider 只读取仓库内 8 个受信任的赋值型 fixture，并在进程内缓存；修改样本后重启服务。

新旧 Web 共用 `MarketDataSource`、共享核心与 `/api/v1`。HTTP 默认访问 API，允许配置失败后回退内置样本；回退会在 `MarketRuntime` 中标记并由新页面提示。实时数据、账户同步与交易执行没有实现。

笔记、草稿、自选和外观设置由浏览器本地存储承载，不经过只读 API。笔记使用版本 1 JSON，按日期唯一；导入时以同日较新的 `updatedAt` 合并，并经用户确认。删除、覆盖与损坏存储恢复均在笔记 UI 中处理。存储契约位于 `web/notes-store.js`，尚未抽为跨端共享包；未来 App/小程序需接入各自的持久化层。

资金监控使用 37 条涨停样本主力净额，总计 61.07 亿元；没有全市场当日净额和分钟序列。详情缺失不能补零。参考字段与单位见 [REFERENCE_REDESIGN.md](REFERENCE_REDESIGN.md)。

UI 改法见 [UI_EDITING.md](UI_EDITING.md)，接口见 [API.md](API.md)，跨端计划见 [PLATFORM_PLAN.md](PLATFORM_PLAN.md)。
