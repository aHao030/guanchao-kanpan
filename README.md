# 观潮看盘 — 完整源码

当前版本 **1.3.0**。本仓库包含可运行 Web、只读数据服务、共享业务核心、跨端请求 SDK、内置样本、构建脚本和回归测试。界面可独立修改，当前 UI 继续作为后续重设计的基础。

行情仍使用 **2026-11-13 收盘样本**，没有接入实时行情。独立 App 和小程序的页面工程、打包与发布尚未完成；本版已提供可复用的业务核心、API、Fetch 与微信请求适配代码。

## 获取和运行

需要 Node.js 20+。源码包已包含共享模块生成物与本地绘图库，运行当前系统无需先安装 npm 依赖：

```powershell
node server.js
```

默认访问 [本地系统](http://127.0.0.1:8791)。本轮当前预览和数据服务运行于 [8792](http://127.0.0.1:8792/)。端口冲突时可以指定：

```powershell
$env:PORT = '8792'
node server.js
```

开发与验证：

```powershell
npm ci
npm run build
npm run check
npm test
```

页面自动化测试需要本机 Google Chrome。启动服务本身没有 npm 运行依赖。修改共享模块后执行build；修改UI配置或CSS后直接刷新。数据服务缓存首份成功样本，更新样本需重启。

## UI 修改通道

| 想修改什么 | 入口 |
| --- | --- |
| 配色、字体、主图尺寸、标签字号、模块开关 | [public/ui.config.js](public/ui.config.js) |
| 自定义样式，覆盖基础主题 | [public/theme-overrides.css](public/theme-overrides.css) |
| 整页结构、控件与交互 | [public/index.html](public/index.html)、[style.css](public/style.css)、[app.js](public/app.js) |
| 云图绘制方式 | [public/market-map.js](public/market-map.js) |
| 数据地址、API或样本模式、失败兜底 | [public/data.config.js](public/data.config.js) |

具体可复制的修改示例、优先级和恢复方法见 [UI 修改指南](docs/UI_EDITING.md)。UI设置是公开配置，不存放账号或token。数据规则在共享核心，修改界面不需要重新实现筛选和详情关联。

## 源码组成

- `packages/market-core`：无DOM、网络和文件依赖的共享模型，统一池分类、查询排序、代码归一化、详情关联与情绪口径。
- `packages/market-client`：统一只读接口客户端，提供 Fetch 与微信 `wx.request` 适配。
- `server/`：可注入Provider的数据服务、API及静态文件服务；`server.js`为启动入口。
- `public/`：Web界面、UI修改入口、数据加载器及内置样本。
- `dist/sdk/`：同一共享源码生成的可复制SDK。
- `examples/`：可运行的Fetch客户端例子，以及小程序接入工厂示例。
- `tests/`：业务、真实HTTP、跨端请求、UI配置和页面行为回归。

[源码结构](docs/SOURCE_LAYOUT.md) · [数据接口](docs/API.md) · [App与小程序接入计划](docs/PLATFORM_PLAN.md) · [更新日志](CHANGELOG.md)

API入口示例：

```text
/api/v1/health
/api/v1/snapshot
/api/v1/stocks?pool=first&limit=20
/api/v1/stocks/600519
```

HTTP页面默认读取统一API；API失败时可显式回退内置样本，日期提示会说明兜底。直接打开file页面则使用样本。所有成功API响应保留 `{data,meta}`，客户端可识别样本模式和来源日期。

运行客户端例子（默认跟随PORT或8791）：

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:8792'
npm run example:client
```

## 当前功能与边界

保留三级行业云图、全部/涨停/连板/首板/大市值池、搜索、行业聚焦、按需详情与列表、情绪五项、涨停时间轴和情绪走势。观察面板已移除，主图默认全宽；美股概览已移除。

5,566只样本股票全部参与布局，极小单元可无标签或可见面积，可通过搜索或行业聚焦查看。K线样本仅有600519，其余股票详情会明确缺失。当前没有实时数据、账户系统或交易执行；App和小程序还需要实现各自页面、平台生命周期和打包工程。

本版53项回归全部通过，并完成当前API例子及四个视口的默认页面检查。源码ZIP已在独立解压目录、没有node_modules的情况下验证服务启动、SDK查询、Web读取API、详情及K线。验证范围不等于已完成真机App或小程序验收。

## 来源与研究

[工作流记录](docs/WORKFLOW.md) · [产品说明](PRODUCT.md) · [设计规范](DESIGN.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

[大盘云图参考](docs/reverse-engineering/dapanyuntu-reference.md)、[REA实际分析](docs/reverse-engineering/rea-report.md)、[HyperFrames评阅](docs/reverse-engineering/hyperframes-review.md)保留历史依据。REA完整源码和许可独立保存于私有仓库 [aHao030/rea](https://github.com/aHao030/rea)。研究工具不参与本系统运行。
