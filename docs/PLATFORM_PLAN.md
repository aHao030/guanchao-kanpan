# 跨端接入与当前交付范围

目前可运行的是 Web 页面、只读样本数据 API、共享业务核心和客户端 SDK。独立桌面 App、手机 App 的工程与界面，以及微信小程序页面、打包和发布流程尚未实现；当前源码不能直接当作已经完成的三端安装包。App 框架保持待定。

当前数据仍是 **2026-11-13 静态样本，非实时行情**。API 接入成功只代表请求链路可用，不代表已有实时数据源。样本 provider 首次加载后在服务进程内缓存；更新 `public/data/*` 后需要重启服务，API 才会重新读入。

## 已有的复用层

| 层 | 实际内容 | 后续三端如何使用 |
| --- | --- | --- |
| `packages/market-core/index.js` | 股票代码处理、数据契约校验、行业与股票模型、标的池、查询排序、个股详情 | 纯 JavaScript，无 DOM、网络、文件系统依赖，可在各端业务层复用。 |
| `packages/market-client/index.js` | 统一 API 客户端、Fetch 与 `wx.request` 适配器、超时与错误处理 | 支持 Fetch 的运行环境用 Fetch 适配；微信小程序用微信适配器；其他运行环境可实现同一 `request()` 接口。 |
| `server/` | `/api/v1` 只读服务与样本 provider | 各端可访问同一个服务；未来接入正式数据源主要替换服务端 provider。 |
| `public/` | 当前 Web UI、Canvas 绘图、DOM 交互、样式与 UI 配置 | Web 直接使用；原生 App 和小程序需要各自实现页面、组件与交互。 |
| `examples/` | 可运行 Fetch 消费示例、微信客户端工厂示例 | 接入参考，不包含独立 App 或完整小程序工程。 |

共享核心使用 `schemaVersion: 1` 的快照；API 响应使用 `{ data, meta }` 包装。保留契约即可更换界面，不需要为每个平台重写筛选、排序和个股查询规则。API 详见 [API 文档](API.md)，界面入口详见 [UI 修改指南](UI_EDITING.md)。

## 构建与服务

需要 Node.js 20 或更高版本。在项目根目录运行：

```powershell
npm run build
npm start
```

服务默认 `http://127.0.0.1:8791`，可通过 `PORT` 修改；本地以 8792 启动的服务，客户端地址也应改为 8792。`npm run build` 生成：

```text
public/shared/market-core.js
public/shared/market-client.js
dist/sdk/market-core.js
dist/sdk/market-client.js
dist/sdk/ui.config.js
```

`dist/sdk/ui.config.js` 是公开的 Web UI 配置副本，不会自动生成 App 或小程序界面。生成文件不要直接编辑；更改源文件后重新构建，并重新复制 SDK 到外部工程。

## Fetch 接入示例

下面代码可保存为项目根目录的 `demo-client.cjs`，在服务运行后执行 `node demo-client.cjs`。它使用构建后的 SDK，并通过共享核心处理 API 快照：

```js
const sdk = require('./dist/sdk/market-client.js');
const core = require('./dist/sdk/market-core.js');

const client = sdk.createMarketClient({
  baseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8791',
  timeoutMs: 5000,
  transport: sdk.createFetchTransport(fetch)
});

(async () => {
  const { data: snapshot } = await client.getSnapshot();
  const model = core.createMarketModel(snapshot);
  console.log({
    asOf: snapshot.meta.asOf,
    mode: snapshot.meta.mode,
    stocks: model.queryStocks({ pool: 'first', sort: 'changePct' }).slice(0, 5)
  });
})().catch(error => {
  console.error(error.code || error.name, error.message);
  process.exitCode = 1;
});
```

已有示例也可直接运行。显式指定地址可匹配任意本地服务端口：

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:8792'
npm run example:client
```

浏览器通过 `<script>` 加载 `public/shared/market-client.js` 后可使用全局 `MarketClient`；其他 App 工程按所选框架的模块方式集成。跨域浏览器请求还需要服务端按实际部署配置访问策略；当前示例优先使用同站点服务。

## 微信小程序接入示例

先运行构建，再将 `dist/sdk/market-client.js`、`dist/sdk/market-core.js` 复制到你的小程序工程 `vendor/`。下面是 `pages/market/index.js` 的接入片段，需要已有小程序工程、页面路由与对应 WXML/WXSS；它不会自动创建页面 UI。

```js
const sdk = require('../../vendor/market-client.js');
const core = require('../../vendor/market-core.js');

const client = sdk.createMarketClient({
  // 替换成你部署并完成小程序网络配置的真实 HTTPS 服务地址。
  baseUrl: 'https://your-market-service.example',
  timeoutMs: 5000,
  transport: sdk.createWechatTransport(wx)
});

Page({
  data: { loading: true, asOf: '', stocks: [], error: '' },
  onLoad() {
    client.getSnapshot().then(({ data: snapshot }) => {
      const model = core.createMarketModel(snapshot);
      this.setData({
        loading: false,
        asOf: snapshot.meta.asOf || '',
        stocks: model.queryStocks({ pool: 'first' }).slice(0, 10)
      });
    }).catch(error => {
      this.setData({ loading: false, error: error.message });
    });
  }
});
```

这里返回 Promise 的是 SDK 客户端。`createWechatTransport(wx)` 内部通过 `wx.request` 的 `success` / `fail` 回调包装请求，**没有假定 `wx.request` 自身返回 Promise**。现有 `examples/miniprogram/client.js` 则提供可传入 `wx`、服务地址及 SDK 的工厂函数。

正式小程序需要将 API 部署到可访问的 HTTPS 域名，并按微信官方要求配置服务器域名、证书及相关网络条件；不能把开发机的 `127.0.0.1` 当作手机上的服务地址。配置以官方 [wx.request 文档](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html) 为准。当前交付未声明小程序真机测试、平台审核或上线结果，也没有预设 AppID 和构建工具版本。

## 未来三端需要完成什么

| 工作 | Web | 独立桌面 / 手机 App | 微信小程序 |
| --- | --- | --- | --- |
| 共享数据模型、筛选、排序 | 已接入 core | 复用 core | 复用 core |
| 访问同一 API | 已接入 Fetch SDK | 复用 SDK；按运行环境选网络适配 | 已有 `wx.request` 适配，接入工程 |
| 页面与交互 | 已有，可通过 UI 修改入口调整 | 选择框架后实现页面、导航与绘图；若采用 WebView，可评估复用 Web UI | 实现 WXML/WXSS、组件、Canvas 及交互 |
| 工程与发布 | 可本地运行 | 待建工程、设备适配、打包签名与发布 | 待建工程、网络配置、真机验证、审核与发布 |
| 正式数据源 | 三端共同依赖服务端 provider 接入，不是各端分别保存凭据 | 同左 | 同左 |

实施时先保持 API 契约稳定，再选择 App 框架并建立各端页面。`ui.config.js` 的 Web 样式设置可以作为视觉参数参考，不能直接替代原生组件或小程序样式实现。账号、数据源密钥与长期 token 留在服务端，不写进 SDK、前端配置或小程序包。
