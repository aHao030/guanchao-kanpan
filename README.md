# 观潮看盘（guanchao-kanpan）

把「大盘云图」的市场结构与「盘见」的涨停、竞价、情绪数据放在一起的看盘与复盘原型。当前版本 **1.2.1**，使用 2026-11-13 收盘静态样本；没有接入实时行情。

## 本轮重建：让云图成为主画面

用户否定上一版后，本轮以 [大盘云图](https://dapanyuntu.com/) 的真实浅色页面、悬停与行业聚焦为参考，重建主云图：

- 一级行业 → 二级行业 → 个股三级分组，以样本中的 `subBoardName` 建立二级行业；全部 **5,566** 只股票进入布局，取消旧版 900 只绘图预算。
- 使用本地随项目提供的 D3 hierarchy squarify 布局，面积继续表达总市值；名称先测量再绘制，保持正常字宽。大格显示完整名称与涨跌幅，中格显示完整名称，小格能容纳至少两字时显示名称前缀；极细小格可悬停查看全名。
- 主云图默认占满主区，移除常驻观察面板和「专注云图」切换。行业标题与下拉选择均可聚焦行业，提供「全市场」返回。
- 点击股票、搜索回车或点击时间轴打开个股详情弹窗；「查看列表」按需打开列表，保留云图联动。保留五个标的池、涨停原因、竞价、情绪五项、涨停时间轴与情绪走势。
- 移除美股概览。浅色框架与涨红、跌绿、平黑三色保留；手机端纵向展示主要模块，云图面板高 660px。

实现为原生 HTML / CSS / JavaScript 与 Canvas。本轮未复制参考站业务代码，也未替换既有行情样本；REA 与 HyperFrames 没有成为运行依赖。

## 启动与依赖

安装 Node.js 后，直接启动；已有的本地绘图库随仓库提供，不必先安装 npm 包：

```powershell
node server.js
```

默认地址为 [本地服务](http://127.0.0.1:8791)。本轮新版已在 [8792 预览](http://127.0.0.1:8792) 运行；另行启动时可这样更换端口：

```powershell
$env:PORT = '8792'
node server.js
```

开发与测试依赖通过锁文件安装：

```powershell
npm ci
npm test
```

- `npm run test:server`：Node.js 自带测试工具检查 HTTP 服务行为。
- `npm run test:ui`：Playwright 与本机 Google Chrome 检查已有页面行为。
- `npm test`：运行全部测试，包括云图体验回归；本轮 **26 项通过**。
- `npm run vendor`：从已安装的 `d3-hierarchy@3.1.2` 重新生成 `public/vendor/` 中的绘图库和许可证。只在维护该本地副本时需要。

本地 D3 hierarchy 为生产页面使用的绘图库；npm 中的 `d3-hierarchy` 用于重建该副本，Playwright 仅用于开发测试。启动服务无需访问 CDN、外部字体服务或工具分析环境。许可与来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 数据与使用边界

- 全量树图样本为 5,566 只股票，全部参与布局、无预抽样；极小单元可能没有标签或可见面积，具体随视口而变。可用搜索、列表与行业聚焦查看细节。
- 样本日期为 2026-11-13；页面不自动拉取最新行情，市场概览目前不能切换市场。
- K 线样本仅含 `600519` 贵州茅台；其他股票明确显示缺失提示。
- 情绪阶段与策略文字属于静态样本和本地阈值演示口径，不是实时交易信号。

## 研究、设计与验证记录

- [大盘云图真实参考观察与截图](docs/reverse-engineering/dapanyuntu-reference.md)
- [REA 实际调用、证据与覆盖限制](docs/reverse-engineering/rea-report.md)，[小型机器可读证据](docs/reverse-engineering/rea-evidence-summary.json)
- [HyperFrames 源码适用性与旧云图诊断](docs/reverse-engineering/hyperframes-review.md)
- [实际工作流与来源](docs/WORKFLOW.md)、[产品事实](PRODUCT.md)、[设计规范](DESIGN.md)、[版本日志](CHANGELOG.md)

用户指定的 REA 源码已单独保存到私有仓库 [aHao030/rea](https://github.com/aHao030/rea)，固定快照提交 [34ba767493c319528050702a53297b17b4113ade](https://github.com/aHao030/rea/commit/34ba767493c319528050702a53297b17b4113ade)。实际分析使用官方 npm `rea-agents@6.9.0` 与隔离 Node.js `24.22.1`，成功完成选定公开脚本的离线 AST 分析，语义覆盖为 **partial**；详情见报告。

本轮26项测试全部通过，并完成1440px、1100px、390px、320px四个视口及两种详情态截图检查，独立复核通过。回归涵盖筛选、排序、搜索、详情与列表弹窗、三色语义、键盘操作、缩放后的时间轴交互、云图高度、标签不挤压、行业聚焦和移除美股；不把这些检查视为实时行情接入或完整无障碍审计。

下一步实时代理、鉴权管理、缓存节流与数据兜底仍属于后续工作，尚未实现。
