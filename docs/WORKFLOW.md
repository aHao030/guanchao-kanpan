# 工作流与来源记录

日期：2026-11-14。下方保留前一轮与 1.2.0 重建记录，再追加 1.2.1 的全宽云图与名称显示调整。当前实现以末节和最新设计文档为准。

## 前一轮记录（历史）

## 范围

本次保留顶部市场概览、主树图、五个标的池、股票搜索、右侧观察面板、五组情绪信息、涨停时间轴与情绪走势。实现继续使用原生 HTML / CSS / JavaScript 与 Canvas；样本数据文件未因视觉重做而替换。界面采用白色内容面、冷灰背景、钴蓝操作与标注，固定行情三色为涨红 `#ef4444`、跌绿 `#22c55e`、平黑 `#111418`。

数据仍为 2026-11-13 收盘静态样本，没有接入实时行情。K 线样本仅含 600519 贵州茅台；情绪阶段是本地阈值演示推算。市场概览目前不提供市场切换。此轮未增加交易执行、选股推荐或投资建议。

## 实际使用的技能来源

### Matt Pocock 工作流

- 用户指定的来源：[aHao030/ai-skills 的 mattpocock-skills 快照](https://github.com/aHao030/ai-skills/tree/main/mattpocock-skills)。
- 本次应用其中的 `engineering/tdd`：围绕用户可观察的行为编写回归检查，使筛选、选择、详情与图表联动的修复可验证。验证对象包括首板归类、切池与排序、详情返回、搜索选中、窗口调整后的时间轴命中以及键盘操作。
- 快照的 `UPSTREAM.json` 标明上游 [mattpocock/skills](https://github.com/mattpocock/skills)，版本 `1.3.2`，提交 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`，快照日期 `2026-11-05`。
- 上游版权为 **Copyright (c) 2026 Matt Pocock**，许可证为 [MIT](https://github.com/aHao030/ai-skills/blob/main/mattpocock-skills/LICENSE)。本次读取并应用既有工作流，没有将技能源、许可文件或安装脚本复制进产品仓库，也没有把该快照安装为新的全局技能。

### GitHub UI 设计参考

实际读取并应用 [anthropics/skills 的 frontend-design/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)。用于确立有辨识度的视觉方向、主次层级、字体与配色的整体一致性，并把既有数据工作台做成完整实现。参考落实在冷灰底与白色内容面、钴蓝状态、连续市场概览带、主树图与观察面板的明确比例，以及紧凑的数据排版。没有把这份技能源复制或安装到产品仓库。

### 本地设计检查与组件发现

本地 Impeccable 用于读取产品与界面上下文、检查视觉一致性和窄屏布局，并将实际实现记录为根目录 `DESIGN.md`、`.impeccable/design.json` 与页面 brief。文档中颜色、字号、圆角、间距和断点来自实现，旧 Almanac 主题文档已按本轮方案替换。

Astryx CLI 只用于只读发现；查询时所需 Core `0.7.16` 无法从包仓库取得，因此继续沿用既有原生页面与 Canvas，没有迁移框架或引入组件运行时。

## 验证记录

- 完成本轮行为回归与服务端检查，`npm test` 共 14 项通过。
- 审阅 1440px、1100px、390px、320px 四个宽度。窄屏保留所有主要模块；320px 涨跌家数文字碰撞已通过 360px 断点下的整行布局修复。
- DOM 功能文字统一至少 11px；Canvas 内密集标注按绘图区尺寸保留独立字号规则。
- 保留静态样本、三色行情语义、缺失数据提示与演示口径。此记录不声称完成实时数据接入，也不提供未经测量的性能改善数字。

`.impeccable/design.json` 的合成色阶仅供设计面板预览；生产颜色以前置 tokens 与 CSS 实现为准。后续改动应同步更新设计文档，并按实际变动补充验证。

## 1.2.0：按大盘云图真实参考重建（2026-11-14）

用户本轮否定前版，要求参考大盘云图、去掉美股，使用 `morluto/rea` 实际逆向并将该工具源码保存到用户仓库，同时更新完整项目及日志。前述「抽样配额」「保留旧图形结构」等历史口径不适用于新版；当前是三级全量布局、主图优先、按空间显隐文字、行业聚焦与专注云图。

### 参考与公开采集

实际查看了大盘云图的浅色全图、悬停与行业聚焦，记录画布占比、层级、控件、字号和文字测量方式。公开前端资源由 Scrapling 获取；只读研究没有替换产品静态数据。截图、观察 JSON 和具体结论保存在 [dapanyuntu-reference.md](reverse-engineering/dapanyuntu-reference.md)。原站压缩业务代码不复制到看盘运行目录。

本轮也实读 Anthropic frontend-design，围绕用户识别市场的任务修正主次，而不是继续旧 seed/candidate 方向。页面契约现明确以用户指定的 dapanyuntu 参考为依据。

### REA：源码保存与真实调用分开

- 上游为 [morluto/rea](https://github.com/morluto/rea)，固定提交 `2343e5692595ae9c08ce7de5bb91460118e67ed2`；完整跟踪源码、许可、文件模式与子模块引用保存在独立私有仓库 [aHao030/rea](https://github.com/aHao030/rea)，快照提交 [34ba767493c319528050702a53297b17b4113ade](https://github.com/aHao030/rea/commit/34ba767493c319528050702a53297b17b4113ade)。新增来源记录为 `UPSTREAM.json` 与 `SNAPSHOT.zh-CN.md`，不把工具塞进产品仓库。
- 实际执行使用官方 npm **`rea-agents@6.9.0`**，通过隔离的 **Node.js `24.22.1`** 启动 `scripts/rea.mjs`。没有把源码快照冒称为本轮自行构建的运行版本，也没有运行 `rea setup` 或修改全局配置。
- 成功调用 `analyze-javascript-application`，目标为公开 renderer `0gym.ayspgjd~.js`，参数含 `--source-path`、`--analysis-timeout-ms 60000`、`--format json`。CLI退出码0，读取256,683字节，访问55,665个AST节点，解析失败0，分析发现419。
- 应用图280节点/445边，语义图20,010节点；触及单文件默认预算，因此覆盖为 **partial**。这是选定脚本的离线静态分析，不是完整站点、后端或所有交互的恢复。
- 专用CDP浏览器启动被本机自动审批拒绝后，使用已允许的公开脚本离线分析完成任务；没有绕过拒绝，也不将未完成的动态分析写成成功。

完整调用、来源指纹、限制和证据ID见 [rea-report.md](reverse-engineering/rea-report.md)，可审阅的小型结果见 [rea-evidence-summary.json](reverse-engineering/rea-evidence-summary.json)。约38.7MB的原始派生结果只留在工作目录，不随产品分发。

### HyperFrames：适用性审查

实际查阅 [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) 提交 `ff9c3b7619c6c46c3145b287914cd09b377174f9`，CLI `0.9.45`、Node要求`>=22`，许可为Apache-2.0。读取了文本适配、Canvas捕捉缺陷检查和数据图表示例，从中采用「先测量文字」「检查实际渲染」「图例与绘图区分工」的原则。

HyperFrames用于确定性HTML视频渲染，不是行情树图库。本轮没有复制其源码或引入Studio、FFmpeg、GSAP与视频运行时。对旧版不足的具体诊断及来源见 [hyperframes-review.md](reverse-engineering/hyperframes-review.md)。

### D3 来源与独立实现

用官方 npm **`d3-hierarchy@3.1.2`** 的成熟 squarify 替代旧手写几何，采用 `treemapSquarify.ratio(1.25)`；一级行业、二级行业、个股由原样本独立组织。`public/market-map.js` 是本项目的独立渲染实现，负责测量、裁剪、三色与显隐，没有移植参考站的业务代码。

`public/vendor/d3-hierarchy.min.js` 与原始 ISC LICENSE 一同提供，版权为 **Copyright 2010-2021 Mike Bostock**；`npm run vendor` 可从已安装的包重建本地副本。D3来源与许可另见根目录 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。启动页面无需外部CDN；分析工具均不属于运行依赖。

### 当前验证与文档同步

- `npm test` **19项全部通过**：原14项与新增5项。新增覆盖三级布局/市值权重、文字不挤压、行业聚焦/返回、专注与恢复、移除美股。
- 本轮检查1440px、1100px、390px、320px；无页面脚本错误及页面横向溢出。手机云图面板660px，主要复盘模块保留。
- 检查器的11px提示对应短操作标签与辅助说明；实际正文仍为12px。设计文档补齐实际23/18/14/19px角色及炸板徽标浅红底，没有为清除提示改写用户指定的主题。
- README、PRODUCT、DESIGN、sidecar与surface brief已同步真实新版；版本日志为1.2.0。研究报告独立保留，不用新文档覆盖原始证据。
- 页面仍为2026-11-13静态样本；全部5,566只参与布局、无预抽样。没有增加实时代理、市场切换或原站滚轮缩放/拖拽能力；极小单元可能无标签或可见面积，随视口而变，可通过搜索、列表或行业聚焦读取。

## 1.2.1：全宽云图与名称显示（2026-11-14）

用户要求「观察面板去掉」，并指出云图没有显示个股名称。本轮移除常驻侧栏及「专注云图」切换，使主云图默认占满主区；旧记录中的观察面板宽度、初始列表与专注恢复仅描述历史版本。

详情和列表保留在按需打开的原生 `dialog#detailDialog` 中。点击股票、搜索回车或时间轴点打开个股详情；「查看列表」打开当前列表。弹窗提供关闭操作与内部滚动，关闭后继续读图。行业标题和下拉只改变聚焦范围，不弹出详情；五个标的池、情绪五项和两张辅助图表继续保留。

名称显示改为按实际可用尺寸分三档：大格显示完整名称（可换两行）与涨跌幅；中格以至少10px显示完整名称；小格能容纳至少两字时显示名称前缀。文字仍先测量、保持正常字宽并裁剪在单元内；极细小格可无字，悬停可查看全名。全部5,566只股票继续按原样本市值参与三级布局，不通过放大小股面积制造标签空间。

本轮26项测试全部通过，完成1440px、1100px、390px、320px四个视口及两种详情态截图检查，独立复核通过。后续维护应同步 README、PRODUCT、DESIGN、surface brief、设计 sidecar 与 CHANGELOG，检查主图全宽、按需弹窗的打开/关闭、行业聚焦和三档名称显示。历史测试数与旧版截图仅属于对应版本；研究资料、来源许可与2026-11-13静态样本口径保留。
