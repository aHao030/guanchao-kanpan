import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TreemapChart, BarChart, LineChart, CandlestickChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, DataZoomComponent, LegendComponent, AriaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { readableColor } from './preferences';
import { stockMarketCap } from './cloud-selection';
echarts.use([TreemapChart, BarChart, LineChart, CandlestickChart, TooltipComponent, GridComponent, DataZoomComponent, LegendComponent, AriaComponent, CanvasRenderer]);

export function Chart({ option, height = 300, onClick, label }) {
  const node = useRef(null), chart = useRef(null), click = useRef(onClick);
  click.current = onClick;
  useEffect(() => {
    const instance = echarts.init(node.current, null, { renderer: 'canvas' });
    chart.current = instance;
    instance.on('click', event => click.current?.(event));
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(node.current);
    return () => { observer.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => { chart.current?.setOption({ ...option, aria: { ...option.aria, enabled: true, label: { description: label } } }, { notMerge: true }); }, [option, label]);
  return <div className="chart" ref={node} style={{ height }} role="img" aria-label={label} />;
}

export const pct = value => value == null || !Number.isFinite(Number(value)) ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
export const money = value => value == null || !Number.isFinite(Number(value)) ? '—' : `${(Number(value) / 1e8).toFixed(2)} 亿`;
const color = (value, colors) => value > .005 ? colors.up : value < -.005 ? colors.down : colors.flat;

export function cloudOption(stocks, colors, selectedIndustry, labelSize = 12) {
  const boards = new Map();
  for (const stock of stocks) {
    const board = stock.board || '未分类';
    if (!boards.has(board)) boards.set(board, []);
    const fill = color(stock.changePct, colors);
    boards.get(board).push({ name: stock.name, value: stockMarketCap(stock), stock, label: { color: readableColor('#ffffff', fill) }, itemStyle: { color: fill } });
  }
  const data = [...boards].map(([name, children]) => ({ name, children, value: children.reduce((n, s) => n + s.value, 0), itemStyle: { color: color(children.reduce((sum, child) => sum + child.stock.changePct * child.value, 0), colors) } }));
  return {
    animation: false, aria: { enabled: true },
    tooltip: { renderMode: 'richText', formatter: params => params.data.stock ? `${params.name}  ${params.data.stock.code6}\n${pct(params.data.stock.changePct)}  ¥${params.data.stock.price}\n${params.data.stock.board} · 市值 ${money(params.value)}` : `${params.name}\n点击行业标题放大` },
    series: [{ type: 'treemap', data, animation: false, animationDurationUpdate: 0, top: 0, bottom: 0, left: 0, right: 0, roam: false, nodeClick: false,
      breadcrumb: { show: false }, visibleMin: 1, childrenVisibleMin: 0,
      label: { show: true, color: '#fff', fontFamily: '"Microsoft YaHei", sans-serif', fontSize: labelSize, overflow: 'truncate', lineHeight: labelSize + 6,
        formatter: p => p.data.stock ? `${p.name}\n${pct(p.data.stock.changePct)}` : p.name },
      upperLabel: { show: true, height: 24, color: colors.text, fontSize: 12, fontWeight: 600, formatter: '{b}' },
      itemStyle: { borderColor: colors.surface, borderWidth: 1, gapWidth: 1 },
      levels: [{ upperLabel: { show: false }, itemStyle: { borderWidth: 0, gapWidth: 4 } }, { itemStyle: { borderColor: colors.surface, borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true, backgroundColor: colors.surface } }, { upperLabel: { show: false }, itemStyle: { borderWidth: 0, gapWidth: 1 } }],
      emphasis: { itemStyle: { borderColor: colors.text, borderWidth: 2 } }
    }]
  };
}

export function barOption(rows, colors, { name = '主力净流入', unit = '亿', valueKey = 'value' } = {}) {
  return { animation: false, textStyle: { color: colors.muted }, grid: { top: 10, bottom: 24, left: 88, right: 60 },
    tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: v => `${v} ${unit}` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.line } }, axisLabel: { color: colors.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(x => x.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: colors.text } },
    series: [{ name, type: 'bar', barMaxWidth: 14, data: rows.map(x => ({ value: x[valueKey], itemStyle: { color: color(x[valueKey], colors), borderRadius: 2 } })), label: { show: true, position: 'right', color: colors.text, formatter: p => `${Number(p.value).toFixed(2)}` } }]
  };
}

export function klineOption(series, colors) {
  return { animation: false, tooltip: { trigger: 'axis', renderMode: 'richText' }, grid: { left: 56, right: 20, top: 22, bottom: 54 },
    xAxis: { type: 'category', data: series.dates, axisLabel: { color: colors.muted } }, yAxis: { scale: true, axisLabel: { color: colors.muted }, splitLine: { lineStyle: { color: colors.line } } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 0 }],
    series: [{ type: 'candlestick', name: '日K', data: series.kline, itemStyle: { color: colors.up, color0: colors.down, borderColor: colors.up, borderColor0: colors.down } },
      ...['ma5', 'ma10', 'ma20'].map((key, i) => ({ type: 'line', name: key.toUpperCase(), data: series[key], showSymbol: false, lineStyle: { width: 1, color: ['#c68c36', '#668ce3', '#ac7cc5'][i] } }))]
  };
}
