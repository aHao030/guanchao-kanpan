---
name: 观潮看盘
description: 白色面板、冷灰底与钴蓝指引的市场结构复盘工作台
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
typography:
  brand:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "20px"
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
    rounded: "{rounded.panel}"
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
  market-summary-active:
    backgroundColor: "{colors.accent-soft}"
    padding: "10px 18px"
---

# Design System: 观潮看盘

## Overview

**Creative North Star: "清晰的市场观察台"**

以白色面板承载内容，冷灰底提供安静的边界，深蓝灰文字建立阅读层级，钴蓝指向当前操作与关联信息。主视觉来自真实市场树图和数据排布，界面装饰保持克制。当前实现取代旧 Almanac 主题；旧主题的洋红、衬线正文和全方角约束不再适用。

整体保留紧凑、可扫读的行情工作台气质。中文采用本机无衬线字体，关键数字使用等宽数字；较大的现价和评分帮助定位，其余标签退后。产品是静态样本复盘原型，样本日期与演示说明属于可见内容，应随布局保留。

**Key Characteristics:**
- 白色内容面板、冷灰底、细分隔线与适度圆角。
- 钴蓝用于选中状态、涨停标识与情绪走势；行情涨跌保留独立的三色语义。
- 中文无衬线与关键等宽数字配合，控制说明和图例保持可读。
- 树图、观察面板与辅助图表共享同一组界面色；手机端保留完整模块。

## Colors

颜色值以前置 tokens 为准；`public/style.css` 的 CSS 自定义属性是实现来源，Canvas 从同一组界面属性读取颜色。`ink-3` 与 `gold` 是代码中的兼容别名，分别指向 `muted` 与 `accent`，不构成额外颜色。

### Primary

- **钴蓝 `accent`**：标的池选中底、键盘焦点、涨停描边、连板角标、时间轴高连板点与情绪走势。
- **深钴蓝 `accent-2`**：浅蓝底上的文字与次级返回操作。
- **浅蓝雾 `accent-soft`**：选中概览、样本标记、信息徽标与搜索焦点衬底。
- **反白 `accent-ink`**：钴蓝填充上的文字。

### Secondary

- **涨红 `up` / 跌绿 `down` / 平黑 `flat`**：树图的固定行情语义。红绿也用于 K 线和情绪比例条。
- **正文涨红 `up-strong` / 正文跌绿 `down-strong`**：白底上的涨跌幅和方向性数据，避免直接照搬亮色块作小字。
- 树图把绝对涨跌幅小于 0.1% 的标的归入平盘块。绿色块配深墨字，红色和平黑块配白字；数字本身保留正负号。

### Neutral

- **冷雾底 `paper`**：页面背景、次级操作和列表悬停。
- **浅冷灰 `paper-2` / 边界冷灰 `paper-3`**：板块标题、徽标底和控件悬停。
- **白页 `sheet`**：树图容器、观察面板和辅助图表的内容面。
- **主墨 `ink` / 正文墨 `ink-2` / 说明灰 `muted`**：标题、正文、说明三级层次。
- **细线 `rule` / 强线 `rule-2`**：面板边界与内部分隔；较强线用于浮层和次要边界。

**The Separate Signals Rule.** 钴蓝表达界面所指和标注，红绿黑表达市场涨跌；选中状态不得改写标的本来的涨跌色。

## Typography

**Display / Body Font:** Segoe UI，中文依次回退到 Microsoft YaHei、PingFang SC，再到无衬线字体。

**Figure Font:** Cascadia Mono，依次回退到 SFMono-Regular、Consolas 和等宽字体；关键数字启用 `tabular-nums`。

### Hierarchy

- **Brand**：品牌名使用前置 `brand` token；手机端缩至 19px，副标题保留 11px。
- **Headline**：市场主标题使用 `headline`；观察面板股票名另用 18px、650 字重，容许换行。
- **Title**：观察面板与通用面板标题使用 `title`；底部辅助图表标题为 12px。
- **Body**：普通界面正文使用 `body`，涨停原因的行高为 1.7。
- **Label**：说明、标签、图例、计数和来源说明使用 `label`。DOM 功能文字最小 11px。
- **Numeric / Price**：情绪大数字使用 `numeric`，现价使用 `price`。市场涨跌幅为 16px，详情涨跌幅为 14px，顶部情绪分值为 23px。
- **Canvas annotation**：树图为密集图内标注，按矩形面积选择字号与省略长度。其 9–12px 标注是绘图密度规则，不作为 DOM 正文或控件的字号尺度。

**The Figures Rule.** 等宽字体用于价格、涨跌幅、评分和关键计数；中文标签保持无衬线字体，避免把整块正文排成终端。

## Layout

页面使用纵向工作区，桌面基准最小高度为 900px。顶部身份区至少 72px，随后是独立的 66px 市场概览带；主区左侧为可伸缩树图，右侧为 316px 观察面板。情绪概览和两张辅助图表位于主区下方，来源说明独立收尾。此页面的模式与任务顺序见 `.impeccable/surfaces/market-workbench.md`。

桌面左右留白为 24px，面板间距为 16px，主区上方留白为 18px。面板内部常用 12px 或 16px，紧密数据关系使用 4px 或 8px。树图保留最大的连续读图区；观察面板独立滚动，辅助图表各有自己的绘图区。

- **1700px 及以上**：右侧列增至 350px。
- **1200px 及以下**：右侧列为 286px，搜索变窄，标的池说明可换行；概览计数与部分副标题让位给数据。
- **960px 及以下**：页面改为自然纵向高度，外侧留白为 18px，右侧列为 270px；顶部允许换行，情绪概览改为三列。
- **700px 及以下**：外侧留白为 12px，树图与观察面板顺序堆叠；树图面板高 510px，搜索独占一行。情绪概览改为两列，末项跨满；时间轴与情绪走势分别占一行。市场概览允许横向滚动。
- **360px 及以下**：情绪概览中的涨跌家数和量能各占整行，防止密集数字挤入半列；其余项沿用两列，末项跨满。

## Elevation & Depth

界面不使用投影或渐变。深度由冷灰页面、白色内容面、细边界和浅蓝选中面表达。Tooltip 使用较强的细边界而非投影；提示条通过深墨底与较高层级浮于页面上。树图使用白色栅格分隔个股，选中标的另有深色外环与白色内环，不借阴影制造悬浮感。

**The Flat Surfaces Rule.** 常驻内容面保持平整；焦点靠轮廓和颜色变化表达，面板不因悬停抬升。

## Shapes

内容面板采用柔和圆角（`panel`）；搜索、Tooltip 与提示条采用较小圆角（`field`）。标的池外组使用 `group`，内部标签与徽标使用 `control`，图例与比例条采用 `mark`。市场概览带保持连续的平直边界，树图内部仍以矩形分块。

默认面板和分隔线为 1px。全局键盘焦点为 2px 钴蓝轮廓，外偏移 3px；不要把焦点轮廓、树图选中环或数据描边误当作面板边框尺度。

## Components

### 标的池

五个池保留「全部、涨停、连板、首板、大市值」。默认标签为灰字透明底，放在冷灰组底上；悬停进入较强冷灰，选中用钴蓝填充和白字。常规内边距为 6px 10px，手机端为 7px 5px。颜色和背景在 160ms 内过渡。

使用原生按钮、`tablist` / `tab` 与 `aria-selected`。左右箭头、Home、End 可切换选中项，当前标签进入正常 Tab 顺序。筛选说明显示样本范围和树图抽样口径，不把全体样本数量误称为当前可见矩形数。

### 搜索

冷灰底、细描边和较小圆角；宽度在桌面为 228px，窄屏变为整行。获得焦点时边界转钴蓝，外侧出现浅蓝轮廓。输入立即筛选，回车打开首个匹配标的；无匹配使用树图内的文字状态。保留可访问名称与原生搜索输入。

### 市场概览

连续横带中的紧凑数据单元，以细竖线分隔，名称与计数在上，涨跌幅在下。沪深 A 股单元以浅蓝底和钴蓝底线标明主范围；这些单元目前是静态概览，不把外观标成可切换市场的按钮。

### 内容面板与观察面板

统一白底、细边界与圆角。观察面板有固定标题区和内部滚动区；空态说明从树图、板块或搜索进入详情的方法。股票详情按身份、现价、涨停、竞价、K 线顺序呈现，字段保持两列对齐。来源单位、演示说明与缺失 K 线提示保留在关联内容附近。

### 列表、返回与徽标

列表以行间细线和冷灰悬停表现关联；键盘聚焦或鼠标悬停会关联树图中的标的。行可通过 Enter 或空格打开详情。涨停类列表保留板数 / 涨幅排序，详情中的返回操作使用冷灰底与深钴蓝字。普通徽标为浅冷灰；连板相关徽标为浅蓝；炸板次数使用浅红底与正文涨红字。

### 树图标注

行情三色、白色分隔、板块中性底构成主数据语言。涨停以钴蓝描边，连板用钴蓝角标和反白数字，列表关联用钴蓝外框，所选个股以深色和白色双环确认。未命中筛选的块降低透明度，仍保留空间上下文。

树图按照行业和市值排布，常态以行业市值权重分配显示数量（预算 900、每行业至少 4，受实际成分数约束）；筛选或搜索命中的标的可补入显示。点击个股打开详情，点击板块标题打开按市值排序的前 20 个成分。它是抽样绘制的导航视图。

### 情绪概览与辅助图表

五组情绪信息共用一个白色面，依靠竖向分隔而非五张独立卡片。时间轴和情绪走势各有独立白色面与标题：时间轴保留板数分层、蓝色高连板点和红色炸板环；情绪走势用钴蓝线与低透明度填充。两张图在手机端继续显示，按纵向顺序阅读。

所有非必要过渡在 `prefers-reduced-motion: reduce` 下关闭。顶部样本标记、数据日期、底部静态样本说明和首次提示共同传达数据边界，不能用动效或颜色暗示正在实时更新。

## Do's and Don'ts

### Do:

- **Do** 使用前置 tokens 和 CSS 变量同步 DOM 与 Canvas 的界面色。
- **Do** 保留行情三色、绿色块深字与红黑块白字的配对。
- **Do** 保持最小 11px 的 DOM 功能字、清晰的键盘焦点和可见状态说明。
- **Do** 让窄屏保留观察面板、五组情绪信息、时间轴与情绪走势。
- **Do** 在样本数据附近保留日期、静态口径与缺失数据提示。

### Don't:

- **Don't** 把钴蓝选中态改成行情涨跌色，或改变被选标的原本的涨跌色。
- **Don't** 恢复旧 Almanac 的洋红、衬线正文或全方角规则。
- **Don't** 为常驻面板添加投影、渐变或悬停抬升。
- **Don't** 用 Canvas 的密集标注字号缩小搜索、图例、说明或来源文字。
- **Don't** 把静态市场概览、情绪阶段推算或单只 K 线样本包装成实时功能。
