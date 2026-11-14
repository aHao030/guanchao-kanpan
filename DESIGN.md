---
name: 观潮看盘
description: A 股市场结构与涨停复盘的 Almanac 风格盯盘工作台（浅色纸面 + 蓝黑墨水 + 洋红唯一强调）
colors:
  paper: "#c9cdd4"
  paper-2: "#c9ced6"
  sheet: "#edeff1"
  ink: "#1a1f27"
  ink-2: "#2f3540"
  muted: "#5f6570"
  rule: "#b3b9c1"
  rule-2: "#4b5158"
  accent: "#b12d6b"
  accent-2: "#8f2455"
  accent-ink: "#f2e9ee"
  up: "#dc2626"
  down: "#15803d"
  flat: "#111418"
typography:
  display:
    fontFamily: '"Hanken Grotesk", "Microsoft YaHei", "PingFang SC", ui-sans-serif, system-ui, sans-serif'
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Newsreader", "Microsoft YaHei", "PingFang SC", Georgia, serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: '"Newsreader", "Microsoft YaHei", Georgia, serif'
    fontSize: "11px"
    fontWeight: 500
  brand:
    fontFamily: '"Hanken Grotesk", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  numeric:
    fontFamily: '"IBM Plex Mono", ui-monospace, Consolas, monospace'
    fontFeature: "tabular-nums"
rounded:
  lg: "0px"
  md: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
---

# Design System: 观潮看盘

## Overview

**Creative North Star: 「纸面行情年鉴」— Almanac for the Market**

观潮看盘是给 A 股日内短线交易者的观察与复盘工作台。视觉体系移植自 [Nutlope/hallmark](https://github.com/Nutlope/hallmark) 的 **Almanac** 主题：冷灰蓝纸面（slate, hue 245）上一张更浅的"印刷页"（sheet），蓝黑墨水、双线规（1px 发丝线 + 2px 实规）、方角、无阴影；Hanken Grotesk 撑结构，Newsreader 走正文，IBM Plex Mono 只排数字并右对齐到小数。深洋红（hue 350）是唯一强调色，占比 ≤5%。数据色（涨红/跌绿/平黑）是用户定版的语义色，不属于装饰体系。

**Key Characteristics:**
- 双层 Canvas 树图：暗版三色块（涨红 #dc2626 / 跌绿 #15803d / 平黑 #111418）印在纸面栅格上，白栅格分隔
- 每板块显示个股数按行业总市值比例动态分配（最大余数法，预算 900、保底 4）
- 双线规层级：发丝线分内容、2px 实规压标题；方角、零阴影、零渐变
- 洋红只出现在：涨停描边、连板角标、时间轴 3 板+、情绪走势主线、选中主控件

## Colors

### Primary
- **深洋红**（#b12d6b，深态 #8f2455）：涨停描边、连板角标、情绪主线、选中主控件——唯一强调色。
- **涨红**（#dc2626，文字态 #b02327）：上涨块与正涨幅。
- **跌绿**（#15803d，文字态 #0c6b44）：下跌块与负涨幅。

### Neutral
- **纸底**（#f2f5f8 近似 oklch 84%）：页面底。
- **Sheet**（#edeff1）：树图与表格所在的"印刷页"。
- **板块灰蓝**（#c9ced6 / paper-2）：板块底与交替行。
- **墨**（#1a1f27 / #2f3540 / #5f6570）：三级文字。
- **规**（#b3b9c1 发丝 / #4b5158 实规）：两种线宽。

**The One-Semantics Rule.** 洋红只表示涨停与"页面所指"；涨跌只由红绿表达；黑色只表示平盘。三者互不借用。

## Typography

**Display Font:** Hanken Grotesk（600，-0.02em）+ Microsoft YaHei 中文回退
**Body Font:** Newsreader（400/500，光学尺寸）+ 中文回退
**Figure Font:** IBM Plex Mono（400/500，tabular-nums，右对齐）

### Hierarchy
- **Headline**（600, 17px）：抽屉个股名、面板标题。
- **Score/Figure**（500, 18–24px mono）：温度计分值、现价、情绪大数字。
- **Body**（400, 13px）：界面正文与表格行。
- **Meta/Caption**（500, 10–11px）：板块标题条、KV 标签、时间轴刻度。

**The Mono-Only Rule.** Mono 只排数字；中文与标签一律 Hanken/Newsreader，永不混排成"伪终端"。

## Layout

一屏四区：52px 顶部概览条（品牌 + 8 市场芯片 + 温度计 + 搜索）→ 主区左树图（约 76%）+ 右 320px 抽屉 → 情绪仪表盘五格（150px，stat tile）→ 底部 148px 时间轴 + 情绪走势。间距 4/8/14。断点：1100px 搜索缩窄；860px 抽屉堆叠、情绪走势隐藏。

## Elevation & Depth

零阴影零渐变。深度由纸阶（sheet → paper-2 → paper-3）与双线规表达。

### Named Rules
**The Two-Rule Rule.** 全站只有 1px 发丝线与 2px 实规两种线宽；更重的线一律禁止。

## Shapes

全方角；控件最多 2px。树图内以白栅格（rgba(255,255,255,.75)）分隔个股，板块外框 rgba(148,163,184,.48)。

## Components

### Market Chip（市场芯片）
- 右缘发丝线分隔、无圆角、无描边；active = paper-2 底 + 2px 墨底线。
- 涨跌幅用 Plex Mono 语义着色（红涨绿跌）。

### Pool Tab（标的池）
- 发丝线描边 + 2px 圆角，墨字；选中 = 洋红填充 + 纸色文字（唯一的填充控件）。

### 详情抽屉（Drawer）
- 320px 常驻，sheet 底；标题下 2px 实规；徽标 = 发丝线描边方块（洋红填充仅用于连板徽标）。

### 树图标注语言（签名组件）
- 三色块 + 白栅格 + 板块中性底；涨停描边与连板角标为洋红；选中为深环 + 白环双规。
- 每板块显示数按行业总市值比例分配（最大余数法，预算 900、保底 4）。

## Do's and Don'ts

### Do:
- **Do** 用 IBM Plex Mono 渲染一切数字并右对齐。
- **Do** 保持红涨绿跌平黑的用户定版三色。
- **Do** 让洋红只服务涨停语义与"页面所指"。
- **Do** 池过滤时整板压暗至 0.25/0.18（纸阶仍可读）。

### Don't:
- **Don't** 使用圆角卡片、阴影、渐变、玻璃拟态。
- **Don't** 让洋红占比超过 5% 画面。
- **Don't** 用虚线网格或双 y 轴（data-viz 规则）。
- **Don't** 在暗色画布上排中文正文（数据色块内仅名称与数字）。
