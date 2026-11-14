# 数据接口 v1

默认启动地址为 `http://127.0.0.1:8791`，本轮本机预览使用 `8792`。接口只读，支持 GET 与 HEAD。下面的数据均由项目内置样本提供，不是实时行情。

## 响应约定

成功响应保留数据口径：

```json
{
  "data": {},
  "meta": {
    "schemaVersion": 1,
    "apiVersion": "v1",
    "mode": "sample",
    "asOf": "2026-11-13",
    "sources": ["dapanyuntu.com", "fupanla.top"]
  }
}
```

`data` 由具体接口决定；所有客户端都应保留 `meta`，区分样本日期与请求时间。错误响应为 `{ "error": { "code": "INVALID_QUERY", "message": "..." } }`，同时使用相应的 HTTP 状态码。没有用户登录、交易或写入接口。

## 已实现接口

| 路径 | data 内容 |
| --- | --- |
| `/api/v1/health` | 服务状态、版本和 `readOnly: true`；样本不可用时返回错误 |
| `/api/v1/snapshot` | 完整统一快照，直接传给共享核心 `createMarketModel()` |
| `/api/v1/markets` | 市场概览数组，剔除美股 |
| `/api/v1/industries` | 行业 `code/name/stockCount/marketCap/changePct` 数组 |
| `/api/v1/stocks` | `{items,total,limit,offset}` 分页股票列表 |
| `/api/v1/stocks/600519` | `{stock,limitUp,auction,kline}`；缺失字段返回 `null` |
| `/api/v1/emotion` | 原样本的情绪数据对象 |
| `/api/v1/timeline` | 按首次封板时间排序的涨停记录数组 |

股票列表参数：

| 参数 | 默认值 | 范围或含义 |
| --- | --- | --- |
| `pool` | `all` | `all/limit/lianban/first/big`：全部/涨停/连板/首板/大市值前50 |
| `industry` | 空 | 已有行业代码或名称 |
| `q` | 空 | 名称或代码，最长100字符 |
| `sort` | `rank` | `rank/marketCap/changePct` |
| `limit` | `50` | 1至200的整数 |
| `offset` | `0` | 大于或等于0的安全整数 |

条件按交集过滤。`rank` 在全部/大市值池按市值降序，在涨停类池按连板数降序、首封时间升序。示例：

```text
/api/v1/stocks?pool=first&limit=20&offset=0
/api/v1/stocks?industry=银行&sort=changePct&limit=50
/api/v1/stocks?q=600519
```

未知、重复或不合法的股票列表参数返回 400 `INVALID_QUERY`；不合法的股票代码返回400，合法但不存在的六位代码返回404 `STOCK_NOT_FOUND`。未知接口返回404 `NOT_FOUND`；写入方法返回405；数据源不可用返回500 `DATA_UNAVAILABLE`。HEAD 返回相同元数据且无正文。

## 快照与客户端

统一快照 `schemaVersion: 1` 包含 `meta/treemap/overview/summary/dashboard/limit/auction/klineByCode/marketExtra`。原始数据的封装保留，归一化与关联交由共享业务核心，客户端不再自行猜测字段。样本 K 线仅有600519，其余股票详情的 `kline` 为 `null`。

`packages/market-client` 提供相应的 `getHealth/getSnapshot/getMarkets/getIndustries/getStocks/getStock/getEmotion/getTimeline`。它返回完整 `{data,meta}`，错误统一为带 `code/status` 的 `MarketApiError`。Fetch 和微信请求使用相同调用方式，具体接入见 [跨端指南](PLATFORM_PLAN.md)。

服务每个进程缓存首个成功快照及其模型。当前样本更新后需重启服务；这不是实时刷新策略。将来接入实时数据时，应同时实现数据 Provider、刷新/缓存策略及实际来源时间，不能只改 `mode` 标签。
