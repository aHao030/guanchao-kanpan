# 本次优化的工作流与来源

日期：2026-11-14。

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

