import React from 'react';
import { Collapse, Descriptions } from 'antd';
import { Chart } from './charts';

export default function ReviewContext({ snapshot, colors }) {
  const data = snapshot.dashboard?.data || {}, current = data.current || {}, history = data.history || [];
  const option = { animation: false, tooltip: { trigger: 'axis', renderMode: 'richText' }, legend: { data: ['情绪评分', '涨停数', '跌停数'], textStyle: { color: colors.text }, top: 4 },
    grid: { left: 44, right: 28, top: 42, bottom: 30 }, xAxis: { type: 'category', data: history.map(r => String(r.trade_date).slice(4).replace(/^(\d{2})/, '$1-')), axisLabel: { color: colors.muted } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.line } }, axisLabel: { color: colors.muted } },
    series: [['total_score', '情绪评分', colors.accent], ['limit_up_count', '涨停数', colors.up], ['limit_down_count', '跌停数', colors.down]].map(([key, name, color]) => ({ type: 'line', name, data: history.map(row => row[key] ?? null), showSymbol: false, connectNulls: false, lineStyle: { color, width: 2 }, itemStyle: { color } })) };
  return <Collapse style={{ marginTop: 24 }} items={[{ key: 'context', label: `复盘参考 · 市场情绪与近 ${history.length} 个交易日走势`, children: <><Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }} items={[
    { key: 'score', label: '情绪评分', children: current.total_score ?? '—' }, { key: 'up', label: '涨停 / 跌停', children: `${current.limit_up_count ?? '—'} / ${current.limit_down_count ?? '—'}` },
    { key: 'height', label: '连板高度', children: `${current.most_board_count ?? '—'} 板` }, { key: 'leader', label: '最高连板', children: current.highest_limit_stock || '—' }
  ]} /><Chart label="历史情绪及涨跌停数量走势" height={260} option={option} /><p className="data-note">收盘历史样本；情绪评分沿用来源口径，不是盘中分钟曲线。</p></> }]} />;
}
