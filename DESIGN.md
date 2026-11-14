---
name: 观潮看盘
description: A 股市场结构与涨停复盘的浅色盯盘工作台
colors:
  bg: "#f2f5f8"
  panel: "#ffffff"
  panel-2: "#f7f9fb"
  line: "#dde5ec"
  line-soft: "#e8eef4"
  ink: "#182430"
  ink-2: "#3e5468"
  ink-3: "#5f7588"
  up: "#d13438"
  up-strong: "#b02327"
  down: "#0e7a4e"
  down-strong: "#0c6b44"
  gold: "#c2820c"
  gold-text: "#9a6a12"
  focus: "#1f6fd6"
  selection: "#cfe3f7"
  scrollbar: "#c5d3df"
  scrollbar-hover: "#aebfd0"
  chip-hover-border: "#b9cfdf"
  chip-active-bg: "#eaf3fb"
  tooltip-border: "#c9d6e2"
typography:
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  subtitle:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 700
  brand:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 800
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "17px"
    fontWeight: 700
  score:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "18px"
    fontWeight: 800
  price:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "26px"
    fontWeight: 800
  meta:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "11px"
    fontWeight: 600
  numeric:
    fontFeature: "tabular-nums"
rounded:
  lg: "12px"
  md: "8px"
  sm: "7px"
  badge: "5px"
  xs: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  pane: "10px"
components:
  market-chip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "5px 8px"
  market-chip-active:
    backgroundColor: "#eaf3fb"
    textColor: "{colors.ink}"
  pool-tab-selected:
    backgroundColor: "#eaf3fb"
    textColor: "{colors.ink}"
---

# Design System: 观潮看盘

## Overview

**Creative North Star: 「纸面行情板」— Paper Market Board**

观潮看盘是给 A 股短线交易者的浅色工作台：白色板面被 1px 结构线与白色栅格切成树图块，涨跌的粉/青色块像印刷在纸面上。市场结构（树图）是唯一主角，涨停语义、情绪周期、竞价深度是它的注释层。金色被严格保留给"涨停"一个语义（浅底上加深为琥珀以保证可见）；红涨绿跌遵守 A 股口径，浅底文字一律用深墨而非灰。无玻璃拟态、无渐变字。

**Key Characteristics:**
- 双层 Canvas 树图（板块→个股）：块面积=市值权重、块颜色=涨跌幅、白色栅格分隔
- 金框 = 涨停、金点角标 = 连板数、红环 = 炸板——标注语言即视觉语言
- 池过滤时"整板压暗到近白"，命中块以饱和色跳出
- 一屏四区：概览条 / 树图+池 / 详情抽屉 / 时间轴+情绪走势

## Colors

白纸底 + 三组语义色：红绿只表达涨跌（A 股口径），琥珀金只表达涨停，蓝只表达选中/焦点。文字用深墨同系三级，不用灰。

### Primary（语义主色）
- **涨停琥珀**（#c2820c，文字态 #9a6a12）：涨停描边、连板角标、池计数、3 板+ 金点。全页 ≤2% 面积——稀有即信息。
- **涨红**（#d13438，文字态 #b02327）：上涨块与正涨幅文字。
- **跌绿**（#0e7a4e，文字态 #0c6b44）：下跌块与负涨幅文字。

### Neutral
- **纸底**（#f2f5f8）：页面底。
- **白面板**（#ffffff / #f7f9fb）：顶栏、抽屉、画布底。
- **结构线**（#dde5ec / #e8eef4）：1px 分隔与容器描边。
- **墨阶文字**（#182430 / #3e5468 / #5f7588）：主/次/弱三级。

**The One-Semantics Rule.** 琥珀金永远只表示涨停；任何界面元素不得借用金色表达 hover、焦点或品牌。

## Typography

**Body Font:** "Segoe UI" + "Microsoft YaHei"/"PingFang SC" 系统栈（Operate 工作台，不做 display 表情）
**数字:** 一律 `font-variant-numeric: tabular-nums`

### Hierarchy
- **Price**（800, 26px）：抽屉现价，唯一超大数字。
- **Score**（800, 18px）：情绪温度计分值。
- **Headline**（700, 17px）：抽屉个股名。
- **Body**（400–600, 13px）：界面正文。
- **Meta/Label**（600–700, 10–11px）：板块标题条、KV 标签、时间轴刻度。

**The Tabular Rule.** 凡是会变化的数字必须 tabular-nums；报价位小数对齐是盯盘台的基本礼貌。

## Layout

一屏四区网格：52px 顶部概览条（品牌 + 8 市场芯片 + 温度计 + 搜索）；主区 = 左树图画布（弹性宽，约 76%）+ 右 320px 详情抽屉常驻；底部 148px = 涨停时间轴 + 340px 情绪走势。间距节奏 4/8/14，pane 内边距 10。断点：1100px 以下搜索框缩窄；860px 以下抽屉改为底部堆叠（max-height 42%）、情绪走势隐藏。

## Elevation & Depth

浅色体系允许悬浮层带柔和投影：tooltip/toast 用 `0 4px 14px rgba(20,35,50,.16)`（有偏移有模糊，非光晕）；其余表面靠白底 + 1px 描边分层。温度计指针保留功能投影 `0 1px 4px rgba(24,36,48,.35)`。

**The Soft-Lift Rule.** 只有离开纸面的元素（tooltip/toast）允许投影；嵌在纸面上的区块一律用描边分层。

## Shapes

圆角阶梯 12px（画布容器）→ 8px（芯片/输入/弹层）→ 7px（池 Tab/列表行）→ 5px（徽标）。结构线一律 1px 实线；树图内以白色栅格线（rgba(255,255,255,.55)/.9）分隔板块与个股，不用暗色描边。

## Components

### Market Chip（市场芯片）
- **Shape:** 8px 圆角、1px line 描边、panel-2 底
- **内容:** 名称（ink-2）+ 涨跌幅（up/down-strong 着色，tabular）+ 家数（ink-3）
- **Active:** #eaf3fb 底 + #9dbdd8 描边；溢出时横向滚动、隐藏滚动条

### Pool Tab（标的池 Tab）
- **Shape:** 7px 圆角、静默态无描边
- **Selected:** #eaf3fb 底 + 1px #b9cfdf 描边 + 琥珀计数
- **语义:** 切换即整板压暗到近白，命中个股块以饱和色跳出

### Tooltip / Toast
- **Style:** 白底 + 1px #c9d6e2 描边 + 柔和投影 + 8px 圆角；tooltip fixed 跟随指针

### 详情抽屉（Drawer）
- **Shape:** 320px 常驻右栏、白底、1px 左描边
- **分区:** 行情头（名称/代码/价格/涨幅）→ 涨停卡（琥珀徽标组 + 涨停原因 + KV 网格）→ 竞价卡 → K 线（Canvas 蜡烛图，红涨绿跌）
- **空态:** 三行引导文案（点击树图个股 / 点击板块标题条 / 数据快照声明）

### 树图标注语言（签名组件）
- **配色（用户定版）:** 三色终端式——**涨红 #ef4444 / 跌绿 #22c55e / 不涨不跌(±0.1%) 黑 #111418**。红块白字、绿块墨字（#041108，原云图配对）、黑块白字，均带反向 halo。迭代史：大盘云图连续渐变 → RdYlGn 11 阶分档 → 三色（定版），后两版被用户否决的原因见项目 README 问题记录。
- **数量分配:** 每板块显示的个股数按**行业总市值比例**动态分配（最大余数法，总预算 900、单板块保底 4）——电子 16.2% 市值显示 148 只，综合 0.2% 只显示 6 只；池/搜索命中的个股不受名额限制自动补入。
- **金框:** 涨停股 2px 琥珀描边（#c2820c），正弦呼吸（alpha 0.5–1.0，周期 ~3.1s）
- **角标:** 连板数 ≥2 且块 ≥14px 时右上角深琥珀圆点白字
- **压暗:** 池过滤时非命中整板 alpha 0.25、非命中个股 0.18

## Do's and Don'ts

### Do:
- **Do** 用 tabular-nums 渲染一切动态数字。
- **Do** 保持红涨绿跌的 A 股口径（与美式相反），全站一致。
- **Do** 让琥珀金只出现在涨停语义上；池计数、时间轴 3 板+ 金点、抽屉徽标同源。
- **Do** 池过滤时整板压到近白，保证命中块对比度。

### Don't:
- **Don't** 使用玻璃拟态、霓虹辉光、渐变文字。
- **Don't** 给卡片加彩色 border-left 或零偏移光晕。
- **Don't** 在概览条等扫视层使用无语义的白字涨跌——必须着语义色。
- **Don't** 用 emoji/Unicode 充当图标；图标一律手绘 SVG（搜索放大镜）。
