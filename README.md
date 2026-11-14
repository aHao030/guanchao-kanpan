# 观潮看盘

当前版本 **1.4.0**。以云图为首页的 A 股看盘与复盘工作台：云图下方接资金流向监控，主菜单提供盘中龙虎榜、复盘笔记和自选股。界面采用 **React 19.3.1、Ant Design 6.7.0、ECharts 6.1.0**，默认深色，支持一键切换浅色和自定义涨跌颜色。

仓库包含完整 Web 源码、构建产物、只读数据 API、共享业务核心、跨端请求 SDK、内置样本和测试。行情仍为 **2026-11-13 收盘样本**；当前未接入实时行情或分钟级资金数据。独立 App、小程序可复用核心与 API，页面工程和打包发布尚未完成。

## 运行已交付源码

需要 Node.js 20+。源码包保留本地构建产物，解压后无需先安装 npm 依赖即可启动：

~~~powershell
npm start
~~~

默认访问 [本地系统](http://127.0.0.1:8791/)。端口冲突时指定新端口：

~~~powershell
$env:PORT = '8792'
npm start
~~~

Ant Design、React 和 ECharts 已打包进本地 `public/workbench.js`，运行页面不依赖 CDN。服务器使用 Node 原生模块；重新构建或运行测试需要安装锁定依赖：

~~~powershell
npm ci
npm run build
npm run check
npm test
~~~

浏览器测试需要本机 Google Chrome。`npm run dev` 监听服务端代码；`npm run dev:web` 执行一次 Web 构建，修改 `web/` 后需重新构建并刷新。更新样本文件后需重启服务，以重新载入已缓存的样本。

## 四个工作页面

| 页面 | 已实现能力 |
| --- | --- |
| 云图看盘 | ECharts 行业市值云图、个股名称和涨跌幅、行业聚焦、五种标的池、搜索与股票列表、按需个股详情和 K 线。云图下方为资金快照、个股/行业排行与资金明细。 |
| 盘中龙虎榜 | 涨停 37、连板 7、炸板 21、跌停 33 个样本；可搜索、按行业筛选、排序、分页和展开明细。涨停记录包含封板时间、开板次数、封单、封成比、主力净额及原因。 |
| 复盘笔记 | 按日期记录市场判断、核心题材、个股复盘和明日计划；保存、搜索、草稿恢复、删除、JSON 备份与合并导入。 |
| 自选股 | 从搜索或详情加入/移出自选，表格排序与导出；按当前快照的绝对涨跌幅阈值查看异动提醒。 |

5,566 只样本股票参与云图。极小单元无法保证显示完整名称，可通过行业放大、搜索或股票列表读取。K 线样本只有贵州茅台（600519），其他标的明确显示缺失。

这里的「盘中龙虎榜」记录涨跌停与炸板事件，不是交易所盘后营业部席位榜。跌停、炸板记录缺少封板时间、封单等明细，界面保留缺失标记。资金合计 **61.07 亿元**只覆盖 37 只涨停样本，不代表全市场；分钟级曲线显示等待数据接入。异动提醒也基于当前快照，不是实时推送。

笔记、草稿、自选和外观设置保存在当前浏览器、当前站点来源的本地存储中。更换设备、浏览器或端口不会自动同步。笔记支持导出后再导入；当前没有账号或云同步服务。

## UI 修改通道

| 想修改什么 | 入口 |
| --- | --- |
| 明暗、涨跌颜色、强调色、云图高度、名称字号、表格密度 | 页面右上角「外观设置」，即时预览并保存到当前浏览器 |
| 给所有新用户设定默认外观 | [public/ui.config.js](public/ui.config.js) 的 `workbench` 对象 |
| 自定义间距、排版和 CSS 样式 | [public/theme-overrides.css](public/theme-overrides.css)，刷新生效 |
| 导航、首页、详情、自选与设置 | [web/main.jsx](web/main.jsx)、[web/workbench.css](web/workbench.css) |
| 龙虎榜与笔记页面 | [web/LimitBoard.jsx](web/LimitBoard.jsx)、[web/ReviewNotes.jsx](web/ReviewNotes.jsx)、[web/pages.css](web/pages.css) |
| 云图、资金柱图、K 线配置 | [web/charts.jsx](web/charts.jsx) |
| API 地址、样本模式和失败回退 | [public/data.config.js](public/data.config.js) |

详细修改示例、配置优先级、恢复方法和旧界面边界见 [UI 修改指南](docs/UI_EDITING.md)。公开 UI 配置不存放账号、密钥或 token。

## 源码与接口

- `web/`：新版 React 页面与 ECharts 配置，修改后通过 esbuild 生成 `public/workbench.js/css`。
- `packages/market-core`：无 DOM、网络或文件依赖的股票模型、查询排序、标的池及详情关联。
- `packages/market-client`：统一只读接口客户端，提供 Fetch 与微信 `wx.request` 适配。
- `server/`：样本 Provider、JSON API 与静态文件服务；`server.js` 为启动入口。
- `public/`：新首页入口、已打包页面、UI/数据配置、共享模块、原始样本及保留的旧版页面。
- `dist/sdk/`、`examples/`：可复制 SDK、Fetch 例子和小程序接入示例。

API 契约沿用 v1.3.0：

~~~text
/api/v1/health
/api/v1/snapshot
/api/v1/stocks?pool=first&limit=20
/api/v1/stocks/600519
~~~

HTTP 页面默认通过 SDK 读取 API；失败时允许显式回退内置样本，并提示数据状态。成功 API 响应保留 `{ data, meta }`，包括模式和来源日期。接口本身为只读，笔记未写入服务端。

[源码结构](docs/SOURCE_LAYOUT.md) · [API 文档](docs/API.md) · [App 与小程序计划](docs/PLATFORM_PLAN.md) · [更新日志](CHANGELOG.md)

## 验证范围

构建与源码一致性检查通过，64 项测试全部通过：其中 53 项覆盖共享基础与旧版兼容，4 项覆盖笔记存储，7 项覆盖新工作台真实浏览器操作。1440px 深浅模式、1024px、390px、320px 检查没有脚本错误或整页横向溢出；详见 [验证记录](docs/verification-v1.4.0.json)。

`npm run test:workbench` 和 `tests/workbench-pages.test.cjs` 面向新的工作台；`tests/notes-store.test.cjs` 验证笔记契约和合并行为。原有页面行为、Canvas 标签和 UI 配置测试明确指向保留的 `public/legacy.html`，用于检查旧页面兼容性；不能把它们当作新版 React 页面已经验收的证据。业务核心、API 和请求 SDK 的测试继续适用于两版页面的共享基础。

## 来源与设计研究

[本次参考页面核对](docs/REFERENCE_REDESIGN.md) · [工作流记录](docs/WORKFLOW.md) · [产品说明](PRODUCT.md) · [设计规范](DESIGN.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

本次参考站公开页面与组件字段已核对；`/m/call_biz` 实际是需要登录的连板竞价页，未获取受保护数据。复盘笔记为本项目自主实现。历史 [大盘云图参考](docs/reverse-engineering/dapanyuntu-reference.md)、[REA 分析](docs/reverse-engineering/rea-report.md)、[HyperFrames 评阅](docs/reverse-engineering/hyperframes-review.md)继续保留。REA 完整源码和许可独立保存于私有仓库 [aHao030/rea](https://github.com/aHao030/rea)，研究工具不参与页面运行。

源码 ZIP 解压后已独立验证：目录不含 node_modules，Node 数据服务、内置 Web 产物、API 和笔记保存/刷新均可运行；没有外部 CDN 请求。
