import React, { useMemo, useState } from 'react';
import { Button, Checkbox, Descriptions, Empty, Input, Select, Space, Table, Tabs, Tag, Tooltip } from 'antd';
import './pages.css';

const asCode = value => String(value || '').replace(/\D/g, '').slice(-6);
const number = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const fixed = (value, suffix = '', digits = 2) => number(value) == null ? '—' : number(value).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + suffix;
const pct = value => number(value) == null ? '—' : (number(value) > 0 ? '+' : '') + number(value).toFixed(2) + '%';
const tone = value => number(value) > 0 ? 'var(--up)' : number(value) < 0 ? 'var(--down)' : 'var(--muted)';
const records = value => Array.isArray(value) ? value : value?.data || [];

function Details({ row }) {
  return <div className="gcl-detail">
    <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3, lg: 4 }} items={[
      { key: 'price', label: '收盘价', children: fixed(row.price, ' 元') },
      { key: 'last', label: '最后封板', children: row.last_lu_time || '—' },
      { key: 'lu', label: '封单金额', children: fixed(row.lu_amount, ' 万元') },
      { key: 'total', label: '成交金额', children: fixed(row.total_amount, ' 万元') },
      { key: 'turnover', label: '换手率', children: fixed(row.turnover_rate, '%') },
      { key: 'float', label: '市值（源口径）', children: fixed(row.free_float, ' 亿元') },
      { key: 'vol', label: '板型', children: row.volume_status || row.lu_status || '—' },
      { key: 'drawdown', label: '日内回撤', children: row.drawdown == null ? '—' : pct(row.drawdown) },
      { key: 'concepts', label: '相关概念', children: row.concepts || '—', span: 4 },
      { key: 'reason', label: '涨停原因', children: row.lu_reason || '样本未提供该项', span: 4 },
    ]}/>
    {row.kind !== 'U' && <p className="gcl-footnote">当前样本仅提供该股的涨跌幅、收盘价和日内回撤，封板时间、封单与原因保留为空。</p>}
  </div>;
}

export default function LimitBoard({ model, snapshot, onSelectStock, density = 'middle' }) {
  const [kind, setKind] = useState('U');
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [openedOnly, setOpenedOnly] = useState(false);
  const dashboard = snapshot.dashboard?.data || snapshot.dashboard || {};
  const all = useMemo(() => {
    const stocks = new Map((model.stocks || []).map(stock => [stock.code6, stock]));
    const pool = dashboard.pool_stocks || [];
    const extras = new Map(pool.map(row => [asCode(row.ts_code), row]));
    const ups = records(snapshot.limit).map(row => ({ ...extras.get(asCode(row.stock_code)), ...row, kind: 'U' }));
    const other = pool.filter(row => row.limit_kind === 'D' || row.limit_kind === 'Z').map(row => ({ ...row, kind: row.limit_kind, stock_code: row.ts_code, chg: row.pct_chg, price: row.close }));
    return [...ups, ...other].map(row => ({ ...row, code: asCode(row.stock_code), industry: stocks.get(asCode(row.stock_code))?.board || row.sector || '未分类' }));
  }, [model, snapshot]);
  const counts = { U: all.filter(row => row.kind === 'U').length, L: all.filter(row => row.kind === 'U' && Number(row.lu_days) >= 2).length, Z: all.filter(row => row.kind === 'Z').length, D: all.filter(row => row.kind === 'D').length };
  const shown = all.filter(row => (kind === 'L' ? row.kind === 'U' && Number(row.lu_days) >= 2 : row.kind === kind) &&
    (!industry || row.industry === industry) && (!openedOnly || !['U', 'L'].includes(kind) || Number(row.open_times) > 0) &&
    (!query.trim() || `${row.stock_name} ${row.code} ${row.lu_reason || ''} ${row.concepts || ''}`.includes(query.trim())));
  const isUp = kind === 'U' || kind === 'L';
  const columns = [
    { title: '股票', dataIndex: 'stock_name', key: 'name', width: 142, fixed: 'left', render: (_, row) => <button className="gcl-stock-link" onClick={() => onSelectStock(row.code)}><strong>{row.stock_name}</strong><small>{row.code}</small></button> },
    { title: '涨跌幅', dataIndex: 'chg', key: 'chg', width: 92, align: 'right', sorter: (a, b) => Number(a.chg) - Number(b.chg), render: value => <span className="gcl-number" style={{ color: tone(value) }}>{pct(value)}</span> },
    { title: '行业', dataIndex: 'industry', key: 'industry', width: 108, ellipsis: true },
    ...(isUp ? [
      { title: '连板', dataIndex: 'lu_days', key: 'days', width: 78, sorter: (a, b) => a.lu_days - b.lu_days, defaultSortOrder: kind === 'L' ? 'descend' : undefined, render: value => <Tag bordered={false} color={Number(value) >= 2 ? 'volcano' : 'default'}>{Number(value) === 1 ? '首板' : `${value} 连板`}</Tag> },
      { title: '首次封板', dataIndex: 'first_lu_time', key: 'first', width: 100, sorter: (a, b) => (a.first_lu_time || '').localeCompare(b.first_lu_time || ''), defaultSortOrder: kind === 'U' ? 'ascend' : undefined },
      { title: '开板', dataIndex: 'open_times', key: 'opened', width: 70, align: 'right', sorter: (a, b) => a.open_times - b.open_times, render: value => `${value ?? '—'} 次` },
      { title: <Tooltip title="封单金额 / 成交金额">封成比</Tooltip>, dataIndex: 'sealed_rate', key: 'sealed', width: 100, align: 'right', sorter: (a, b) => Number(a.sealed_rate) - Number(b.sealed_rate), render: value => fixed(value, '%') },
      { title: '封单 / 万元', dataIndex: 'lu_amount', key: 'amount', width: 116, align: 'right', sorter: (a, b) => Number(a.lu_amount) - Number(b.lu_amount), render: value => fixed(value, '', 0) },
      { title: '主力净额 / 亿', dataIndex: 'main_net_inflow', key: 'flow', width: 124, align: 'right', sorter: (a, b) => Number(a.main_net_inflow) - Number(b.main_net_inflow), render: value => <span style={{ color: tone(value) }}>{fixed(value)}</span> },
      { title: '涨停原因', dataIndex: 'lu_reason', key: 'reason', width: 264, ellipsis: { showTitle: false }, render: value => <Tooltip title={value}>{value || '—'}</Tooltip> },
    ] : [
      { title: '收盘价 / 元', dataIndex: 'price', key: 'price', width: 118, align: 'right', sorter: (a, b) => a.price - b.price, render: value => fixed(value) },
      { title: '日内回撤', dataIndex: 'drawdown', key: 'drawdown', width: 114, align: 'right', sorter: (a, b) => a.drawdown - b.drawdown, render: value => <span style={{ color: tone(value) }}>{pct(value)}</span> },
      { title: '封板详情', key: 'missing', width: 230, render: () => <span className="gcl-muted">样本未提供封板明细</span> },
    ]),
  ];

  return <section className="gcl-page" aria-labelledby="limit-board-title">
    <header className="gcl-heading"><div><h1 id="limit-board-title">盘中龙虎榜</h1><p>追踪涨停、炸板与跌停，展开每一只股票的封板细节。</p></div><span className="gcl-date">{snapshot.meta?.asOf || '日期待确认'} · 收盘样本</span></header>
    <div className="gcl-data-panel">
      <Tabs activeKey={kind} onChange={value => { setKind(value); setOpenedOnly(false); }} items={[
        ['U', '涨停'], ['L', '连板'], ['Z', '炸板'], ['D', '跌停'],
      ].map(([key, label]) => ({ key, label: <span>{label}<b className="gcl-tab-count">{counts[key]}</b></span> }))}/>
      <div className="gcl-filters">
        <Space wrap><Input allowClear aria-label="搜索龙虎榜" placeholder="股票、代码、涨停原因" value={query} onChange={event => setQuery(event.target.value)} className="gcl-search"/>
          <Select aria-label="筛选行业" placeholder="全部行业" value={industry || undefined} onChange={v => setIndustry(v === '__all' ? '' : v)} className="gcl-industry" options={[{ value: '__all', label: '全部行业' }, ...[...new Set(all.map(row => row.industry))].sort().map(value => ({ value, label: value }))]}/>
          {isUp && <Checkbox checked={openedOnly} onChange={event => setOpenedOnly(event.target.checked)}>仅看曾开板</Checkbox>}
          {(query || industry || openedOnly) && <Button type="text" onClick={() => { setQuery(''); setIndustry(''); setOpenedOnly(false); }}>重置</Button>}
        </Space><span className="gcl-muted">{shown.length} 只股票</span>
      </div>
      <p className="gcl-scroll-hint">横向滑动查看{isUp ? '封板' : '行情'}详情，股票名称固定在左侧。</p>
      <Table key={kind} dataSource={shown} rowKey="code" columns={columns} size={density} scroll={{ x: isUp ? 1294 : 900 }} expandable={{ expandedRowRender: row => <Details row={row}/>, columnTitle: <span className="gcl-sr-only">展开详情</span>, columnWidth: 40 }} pagination={{ defaultPageSize: 15, showSizeChanger: true, pageSizeOptions: [15, 30, 50], showTotal: total => `共 ${total} 只` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下没有股票，可重置筛选后查看。"/> }}/>
    </div>
    <p className="gcl-footnote">此处“龙虎榜”记录涨跌停事件，不代表交易所公布的营业部席位榜。数据日期 {snapshot.meta?.asOf || '待确认'}，暂未接入实时推送；涨停原因与资金字段沿用参考源口径。</p>
  </section>;
}
