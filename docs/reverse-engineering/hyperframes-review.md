# HyperFrames 适用性与云图重建评审

检查日期：2026-11-14。本文依据当日实际读取的公开源码与项目已渲染截图，区分观察结果和改造建议。

## 查阅的项目与版本

- 仓库：[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- 检查提交：`ff9c3b7619c6c46c3145b287914cd09b377174f9`，提交时间 2026-11-14 10:28:28 UTC。
- [CLI package.json](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/packages/cli/package.json) 标明版本 `0.9.45`，Node.js 要求 `>=22`。
- [LICENSE](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/LICENSE)：Apache-2.0，Copyright 2026 HeyGen, Inc.
- 实读入口：[README](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/README.md)、根目录与 core/text 目录、`fitTextFontSize.ts`、`htmlInCanvasDefects.ts`、`registry/blocks/data-chart/data-chart.html`。
- 设计评审也实际读取了 [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)。应用其从真实使用者出发、结构只传递信息、将表达集中于核心内容、实际截图后自查的准则。

## 适合观潮的内容

HyperFrames 的核心用途是把 HTML、CSS、媒体与可寻址动画渲染成确定性的 MP4。它不是树图布局库，也不会自动使现有看盘页面更易用。

| 已查阅的具体实现 | 可迁移的原则 | 本轮做法 |
| --- | --- | --- |
| [fitTextFontSize.ts](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/packages/core/src/text/fitTextFontSize.ts) 用实际排版判断文字能否容纳，并设最小字号 | 文本必须先测量，再决定显示；到达下限还放不下，就改变内容层级，不能横向压扁字形 | 建议使用 Canvas measureText 与完整名称/涨幅的显隐阈值；不搬入其视频字号或引入文字库 |
| [htmlInCanvasDefects.ts](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/packages/core/src/htmlInCanvasDefects.ts) 显式识别会使捕捉失真的根节点状态与 Canvas 缺陷 | 不能只看无报错；需确认截图和最终渲染状态相符 | 新版以真实浏览器画布、控件操作和多宽度截图验证 |
| README 的确定性渲染与预览工作流 | 同一数据和视口应能重复得到相同画面，便于比较修改是否有效 | 继续使用既有静态样本和本地浏览器回归 |
| [data-chart.html](https://github.com/heygen-com/hyperframes/blob/ff9c3b7619c6c46c3145b287914cd09b377174f9/registry/blocks/data-chart/data-chart.html) 分离图例、绘图区、标签与来源 | 图例和来源为阅读服务，层级独立且稳定 | 可迁移图表分工，不能照搬 1920×1080 固定场景和叙事动画 |

本轮没有复制 HyperFrames 源码，也没有把其运行时、Studio、FFmpeg、GSAP 或视频渲染链加入观潮。用户当前任务是连续可操作的行情工作台；视频生产链不解决云图布局与文字密度问题。若以后新增“复盘录像/讲解导出”，可作为独立导出工具评估。

## 对上一版云图的具体诊断

评审对象是 `.impeccable/review/desktop.png` 及 `public/app.js` 中上一版树图实现。

1. **绘图区不足以承载默认密度。** 1440×1000 截图中主云图约 1038×340 CSS 像素，却默认预算 900 只股票。许多个股块已不可能显示可读名称。外围页面虽然整齐，核心识别任务没有成立。
2. **几何把小行业推成细长碎片。** 手写 `squarify` 在每一轮用较长边评价和排布行，主区域铺出横向大带，后续小行业挤在底边与右边。应该使用经过验证的短边 squarify 布局；行业和股票均需要有实际的可读形状。
3. **文字被横向挤压而非排版。** `fillText(..., maxWidth)` 与 `strokeText` 对狭窄块强行放进 3～4 个汉字。截图里文字看似“有内容”，实际成了压扁的噪点；白/黑描边进一步破坏字形。小块宁可只显示颜色，把精确内容放在悬停与详情。
4. **行业层级太薄。** 17px 标题条、密集黑色横线与挤压后的板块名难以建立稳定扫描路径。行业名应该保持完整、正常字宽，必要时只显示标题而省略涨幅，不能双双挤进不够宽的区域。
5. **默认详情区没有帮助识别市场。** 一块常驻的空观察面板占据可用于云图的宽度，却只有操作说明。建议初始提供有来源的市场/行业摘要，选股后替换成详情；保持原有右侧框架，提升其效用。
6. **总股票数不等于画面可见股票数。** 旧标注使用“范围5566/5566”，而画布预算是900。新版应明确区分当前池总数、可见个股数与聚合尾部，避免给人全量均已铺开的印象。
7. **市值语义不能被清晰模式悄悄改变。** 若只取大股票再把它们铺满整个行业，面积不再是全行业真实占比。未逐只展示的尾部应保留聚合权重，例如“其他 N 只”；或明确标注这是展示样本内的相对权重。
8. **缺少从总览进入细节的路径。** 全市场下数千只股票天然存在细小块。应允许聚焦行业、回到全市场，并能在清晰密度与全量密度之间选择。不能把增大字号作为唯一修复。
9. **市场范围需服从本次产品要求。** 用户本轮明确去掉美股，因此概览不应再保留该项；不应借设计重做加入与 A 股复盘无关的模块。

## 本轮优先级

先把行业和个股布局、可读面积、文字显隐和聚焦路径做实，再调整周边外观。推荐保留浅色框架、原来的 A 股红涨绿跌黑平盘、五个标的池、搜索、详情、情绪与时间轴。云图应占据首屏最主要的有效面积，名称和涨幅只在真实放得下时出现，图例简短且与实际状态一致。

本评审不声称已使用 HyperFrames 运行时生成新页面，也不声称页面已接入实时行情。最终实现与验证以本轮实际代码、截图和测试日志为准。

