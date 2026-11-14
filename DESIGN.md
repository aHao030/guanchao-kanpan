---
name: 观潮看盘
description: 主云图优先、三级行业与自然字形的浅色市场复盘工作台
colors:
  paper: "#f3f5f9"
  paper-2: "#edf2f8"
  paper-3: "#dce4f0"
  sheet: "#ffffff"
  ink: "#17263c"
  ink-2: "#34445b"
  muted: "#617188"
  rule: "#e1e7ef"
  rule-2: "#c9d4e3"
  accent: "#245bd7"
  accent-2: "#1648b8"
  accent-soft: "#eaf0ff"
  accent-ink: "#ffffff"
  up: "#ef4444"
  down: "#22c55e"
  flat: "#111418"
  up-strong: "#c52d3c"
  down-strong: "#127548"
  risk-soft: "#fff0f1"
  board-up: "#b72d3a"
typography:
  brand:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
  brand-phone:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.55
    letterSpacing: "0.02em"
  title:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.55
  stock-title:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.55
  numeric:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  score:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  price-change:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "14px"
    fontWeight: 500
    letterSpacing: "-0.025em"
  phone-breadth:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  price:
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  mark: "2px"
  control: "4px"
  group: "6px"
  field: "7px"
  map-panel: "6px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  tablet-gutter: "18px"
  xl: "24px"
components:
  pool-tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  pool-tab-hover:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
  pool-tab-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
  snapshot-tag:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-2}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "3px 7px"
  panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.map-panel}"
  button-back:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.accent-2}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
  button-back-hover:
    backgroundColor: "{colors.accent-soft}"
  stock-list-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    padding: "10px 0"
  stock-list-item-hover:
    backgroundColor: "{colors.paper}"
  risk-badge:
    backgroundColor: "{colors.risk-soft}"
    textColor: "{colors.up-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "2px 6px"
  map-control:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5px 8px"
  map-control-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-2}"
  market-summary-active:
    backgroundColor: "{colors.accent-soft}"
    padding: "10px 18px"
---


# Design System: 观潮看盘

## Overview

**Creative North Star: "先看清市场，再进入细节"**

以大盘云图实际浅色页面为用户指定参考，把主要阅读面积交给市场本身。白色工作面、冷灰底、深蓝灰文字和钴蓝界面状态构成产品框架；行情保留用户确定的红、绿、黑三色。主图由真实市值、行业层级和正常比例的中文标签建立识别路径。

当前文档记录 1.2.1 已实现的设计。页面采用本机无衬线字体与等宽关键数字，细线划分功能区域，较小圆角收束全宽主云图；个股详情与列表按需弹出。参考站的连续色阶、品牌和业务代码没有搬入产品；样本日期与静态说明保持可见。

**Key Characteristics:**
- 主云图优先；一级行业、二级行业和个股构成三级结构。
- 名称先测量，按空间显示完整名、可读前缀或省略，不压缩汉字字宽。
- 行业聚焦与明确返回支持逐级查看；主云图默认全宽。
- 个股详情与列表按需打开弹窗；手机保留主要复盘模块。

## Colors

前置 tokens 来自 `public/style.css` 和 `public/market-map.js`。生产值以这些实际颜色为准；sidecar 中的合成色阶仅是设计面板预览，不是新增主题。

### Primary

- 钴蓝 `accent` 用于标的池选中、焦点、涨停描边、列表与云图关联、时间轴高连板点和情绪走势。
- 深钴蓝 `accent-2` 用于浅蓝面上的操作文字；浅蓝 `accent-soft` 用于选中概览、样本标记和控件状态。
- 反白 `accent-ink` 用于钴蓝填充上的文字。

### Secondary

- `up`、`down`、`flat` 是固定的行情三色；树图将绝对涨跌幅小于 0.1% 归入平盘。绿块使用深墨字，红黑块使用白字。
- `up-strong` 与 `down-strong` 是白底上的涨跌文字；`board-up` 是 Canvas 一级行业涨幅的小字专色。
- `risk-soft` 是炸板次数徽标的浅红底，与 `up-strong` 文字配对，不是第四种树图行情色。

### Neutral

- `paper`、`paper-2`、`paper-3` 分别用于页面与控件底、二级行业标题底、较强中性边界与悬停。
- `sheet` 承载云图、详情弹窗和图表；`ink`、`ink-2`、`muted` 分别承载标题、正文和辅助说明。
- `rule`、`rule-2` 是常规边界与提示浮层边界。兼容别名 `ink-3`、`gold` 分别指向 `muted`、`accent`，不增加色彩。

**The Separate Signals Rule.** 钴蓝表达界面所指，红绿黑表达市场涨跌；选中状态不改写行情本色。

## Typography

系统无衬线字体用于中文和界面文字，等宽字体用于价格、涨跌幅、评分和关键计数；字体栈以前置 tokens 为准，无远程字体依赖。

- 品牌使用 `brand`，手机使用 `brand-phone`。主图标题使用 `headline`；通用面板标题使用 `title`，弹窗标题为14px，个股/行业详情标题使用 `stock-title`。
- **正文为 `body`（12px）**，用于搜索、股票名称、详情字段值与原因。原因行高为 1.7；不把普通正文统一缩小到 11px。
- `label`（11px）用于控件短标签、图例、代码、计数、数据日期和来源说明。所有 DOM 功能文字至少 11px。
- 情绪大数字使用 `numeric`（21px），顶部评分使用 `score`（23px），手机涨跌家数使用 `phone-breadth`（19px）。现价使用 `price`（30px），详情涨跌幅使用 `price-change`（14px）。
- Canvas 股票名称按矩形尺寸使用至少 10px 的字号，大格可换两行，空间允许时显示涨跌幅；一级行业标题 12px、二级行业及行业涨跌幅 10px。时间轴和走势的坐标及板数标注仍有 10px。这些是图内注释规则，不是 DOM 正文尺度。

**The Natural Type Rule.** 先测量完整文字，再决定显示完整名、至少两字的名称前缀或省略；树图不用 `maxWidth` 横向挤压文字，也不描边补救。

## Layout

桌面先是紧凑的身份 / 日期 / 搜索栏（最小 62px）和独立市场概览带（最小 56px）。主区仅保留全宽云图，外侧横向留白 16px、顶部间距 12px；高度为 `calc(100dvh - 146px)`，最小 640px。情绪五项和两张辅助图表位于主区下方，页面按内容自然向下延伸。

主云图内部依次为标题与行业/列表工具、标的池、连续画布、范围和图例状态栏；画布不加额外四周留白。常驻观察面板和专注切换已移除。详情与列表使用原生 `dialog`，桌面宽度最多480px、距视口左右至少16px，高度最多 `calc(100dvh - 48px)`，正文内部滚动；关闭后返回云图。

| 视口 | 实际布局 |
| --- | --- |
| ≥1700px | 主云图全宽；底部辅助图表右列350px。 |
| ≤1200px | 主云图全宽；控件可换行，搜索200px；部分概览计数隐藏。 |
| ≤960px | 主区高700px、最小640px，外侧18px；顶部换行，情绪三列。 |
| ≤700px | 主要模块纵向排列，外侧12px；云图面板高660px。搜索独占一行；概览与标的池可在自身区域横向滚动。详情弹窗宽 `calc(100vw - 24px)`、高最多 `calc(100dvh - 32px)`。情绪两列，末项跨满；时间轴190px、走势172px，分别一行。 |
| ≤360px | 涨跌家数、量能各占整行，避免数字碰撞。页面最小支持320px。 |

**The Area Rule.** 总市值决定面积；筛选保留原空间权重，行业聚焦明确改变当前范围。

具体探索路径、参考证据与首屏约定见 `.impeccable/surfaces/market-workbench.md`。全量 5,566 只股票参与布局、无预抽样；极小单元可能没有文字或可见面积，具体随视口和分隔间距而变。可通过行业聚焦或搜索读取，不能通过扭曲市值或字体制造可读性。

## Elevation & Depth

常驻内容不使用投影、渐变或悬停抬升。白面、冷灰页面、细线与浅蓝状态提供层次。按需详情弹窗用柔和投影和遮罩与主云图区分。Tooltip 用较强边界，提示条用深墨底；树图白色间隔区分股票，中性标题区分行业层级。选中个股用深色外环与白色内环，列表和悬停关联用钴蓝轮廓。

## Shapes

主云图使用较紧圆角 `map-panel`（6px）；详情弹窗、情绪和辅助图表使用 `panel`（12px）。控件和徽标使用 `control`（4px），搜索、Tooltip 与提示条使用 `field`（7px）。树图内部坚持矩形结构，市场概览为连续横带。

普通边界为 1px；全局焦点为 2px 钴蓝轮廓，向外偏移 3px。焦点、选中环与涨停描边各有职责，不与普通面板边界混用。

## Components

### 标的池与搜索

保留全部、涨停、连板、首板、大市值五个池；冷灰组底与钴蓝选中态，11px短标签配等宽计数。使用原生按钮、tab语义及方向键/Home/End切换。搜索输入为12px正文，按名称或代码实时筛选，回车打开首个匹配；无匹配在图中显示文字状态。筛选降低未命中块透明度而不重新分配市值面积。

### 行业与列表控件

原生行业下拉与一级/二级行业标题可进入对应的一级行业；返回按钮与「全部行业」恢复全市场。进入后标题更新、所选个股清空、行业成分重新占据画布，行业聚焦不打开弹窗。「查看列表」通过 `aria-haspopup="dialog"` 和 `aria-controls="detailDialog"` 关联按需弹窗。

### 三级云图与标签

以原样本行业、`subBoardName`、个股组织三级树；本地 D3 hierarchy 按总市值 squarify，目标比例为1.25。层级间细槽依深度为3/2/1px；可容纳时一级标题条22px、二级16px。

股票标签先测量完整名称，分三档显示：大格显示完整名称与涨跌幅，名称可换两行；中格以不小于10px的字号显示完整名称；小格能容纳至少两字时显示名称前缀。极细小格可不绘制文字，悬停仍显示全名。每个股票标签独立裁剪，行业名称及行业涨跌幅也先测量；不压扁字形。搜索、列表或行业聚焦保留查看细节的路径。

涨停描边、连板角标、列表关联、悬停和所选标的轮廓保留。状态栏明确显示当前范围、命中数与「面积 = 总市值」，不再沿用抽样配额说明。

### 市场概览与详情弹窗

连续概览带显示静态市场快照，主范围以浅蓝面和钴蓝底线标识；美股已移除，这些单元不模拟可切换按钮。点击股票、搜索回车或时间轴点打开个股详情弹窗，「查看列表」打开当前列表。股票详情按身份、现价、涨停、竞价、K线排布；返回列表可恢复列表视图。列表保留名称/代码/行业、涨跌幅及涨停类池的板数/涨幅排序，支持键盘选择与图中定位。弹窗有明确关闭按钮，支持原生 Escape 关闭；缺失K线与静态样本说明保留在关联区域。

### 情绪与辅助图表

五组情绪用同一白色面和内部分隔线；时间轴与情绪走势各有独立绘图区。时间轴保留板数分层、蓝色高连板点、红色炸板环及点击查看详情；走势为钴蓝线与低透明度面积。手机仍完整展示主要模块。非必要过渡在 `prefers-reduced-motion: reduce` 下关闭；不以动效暗示实时更新。

## Do's and Don'ts

### Do:

- **Do** 使用真实行业层级与总市值面积，并保持正常字形。
- **Do** 保留行情三色、绿块深字、红黑块白字和独立选中轮廓。
- **Do** 区分12px正文、11px操作标签与图内标注的不同阅读职责。
- **Do** 为行业聚焦保留返回路径，为详情与列表弹窗保留关闭操作。
- **Do** 在手机保留五组情绪、观察列表、时间轴、走势及静态样本说明。

### Don't:

- **Don't** 恢复900只抽样配额或将部分股票重新铺满以冒充全行业市值。
- **Don't** 用横向压缩、描边或极小字号塞满每一个股票块。
- **Don't** 用常驻侧栏或装饰性留白挤占主云图。
- **Don't** 为常驻面板添加投影、渐变或悬停抬升。
- **Don't** 把静态样本、情绪演示或仅一只K线包装成实时能力。
