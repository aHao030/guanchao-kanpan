import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Input, Select, Space, Table, Tabs } from 'antd';
import './pages.css';

const asCode = value => String(value || '').replace(/\D/g, '').slice(-6);
const number = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const fixed = (value, suffix = '', digits = 2) => number(value) == null ? '—' : number(value).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + suffix;
const pct = value => number(value) == null ? '—' : (number(value) > 0 ? '+' : '') + number(value).toFixed(2) + '%';
const tone = value => number(value) > 0 ? 'var(--up)' : number(value) < 0 ? 'var(--down)' : 'var(--muted)';
const records = value => Array.isArray(value) ? value : value?.data || [];
const sortOptions = [
  { value: 'first', label: '首次封板 · 从早到晚' },
  { value: 'days', label: '连板高度 · 从高到低' },
  { value: 'chgDesc', label: '涨跌幅 · 从高到低' },
  { value: 'chgAsc', label: '涨跌幅 · 从低到高' },
  { value: 'flow', label: '主力净额 · 从高到低' },
  { value: 'amount', label: '封单金额 · 从高到低' },
  { value: 'opened', label: '开板次数 · 从多到少' },
  { value: 'drawdown', label: '日内回撤 · 从大到小' },
];
function compareNumbers(left, right, ascending = false) {
  const a = number(left), b = number(right);
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  return ascending ? a - b : b - a;
}
function MetricGroup({ title, children }) {
  return <div className="gcl-metric-group"><h2>{title}</h2><dl>{children}</dl></div>;
}
function Metric({ label, children, color }) {
  return <div className="gcl-metric"><dt>{label}</dt><dd style={color ? { color } : undefined}>{children}</dd></div>;
}

export default function LimitBoard({ model, snapshot, onSelectStock, density = 'middle' }) {
  const [kind, setKind] = useState('U');
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [openedOnly, setOpenedOnly] = useState(false);
  const [sort, setSort] = useState('first');
  const [page, setPage] = useState(1);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 899px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { setPage(1); }, [kind, query, industry, openedOnly, sort, compact]);
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
  const isUp = kind === 'U' || kind === 'L';
  const shown = all.filter(row => (kind === 'L' ? row.kind === 'U' && Number(row.lu_days) >= 2 : row.kind === kind) &&
    (!industry || row.industry === industry) && (!openedOnly || !isUp || Number(row.open_times) > 0) &&
    (!query.trim() || `${row.stock_name} ${row.code} ${row.lu_reason || ''} ${row.concepts || ''}`.includes(query.trim()))).sort((a, b) => {
      if (sort === 'first') return String(a.first_lu_time || '99:99:99').localeCompare(String(b.first_lu_time || '99:99:99'));
      if (sort === 'days') return compareNumbers(a.lu_days, b.lu_days);
      if (sort === 'flow') return compareNumbers(a.main_net_inflow, b.main_net_inflow);
      if (sort === 'amount') return compareNumbers(a.lu_amount, b.lu_amount);
      if (sort === 'opened') return compareNumbers(a.open_times, b.open_times);
      if (sort === 'drawdown') return compareNumbers(a.drawdown, b.drawdown, true);
      return compareNumbers(a.chg, b.chg, sort === 'chgAsc');
    });
  const columns = [
    { title: '股票与行情', key: 'stock', width: '16%', className: 'gcl-cell-stock', render: (_, row) => <div className="gcl-stock-summary">
      <button className="gcl-stock-link" onClick={() => onSelectStock(row.code)}><strong>{row.stock_name}</strong><small>{row.code}</small></button>
      <span className="gcl-industry-name">{row.industry}</span>
      <div className="gcl-quote"><span><small>收盘价</small><b>{fixed(row.price)}</b></span><span><small>涨跌幅</small><b style={{ color: tone(row.chg) }}>{pct(row.chg)}</b></span></div>
    </div> },
    { title: '封板记录', key: 'board', width: '21%', className: 'gcl-cell-board', render: (_, row) => <MetricGroup title="封板记录">
      <Metric label="连板 / 板型">{row.lu_days == null ? '—' : `${row.lu_days === 1 ? '首板' : `${row.lu_days} 连板`} · ${row.volume_status || row.lu_status || '—'}`}</Metric>
      <Metric label="首次封板">{row.first_lu_time || '—'}</Metric>
      <Metric label="最后封板">{row.last_lu_time || '—'}</Metric>
      <Metric label="开板次数">{row.open_times == null ? '—' : `${row.open_times} 次`}</Metric>
    </MetricGroup> },
    { title: '资金与封单', key: 'funds', width: '21%', className: 'gcl-cell-funds', render: (_, row) => <MetricGroup title="资金与封单">
      <Metric label="封单 / 万元">{fixed(row.lu_amount, '', 0)}</Metric>
      <Metric label="成交 / 万元">{fixed(row.total_amount, '', 0)}</Metric>
      <Metric label="主力净额 / 亿" color={tone(row.main_net_inflow)}>{fixed(row.main_net_inflow)}</Metric>
      <Metric label="封成比">{fixed(row.sealed_rate, '%')}</Metric>
    </MetricGroup> },
    { title: '交易特征', key: 'trading', width: '18%', className: 'gcl-cell-trading', render: (_, row) => <MetricGroup title="交易特征">
      <Metric label="换手率">{fixed(row.turnover_rate, '%')}</Metric>
      <Metric label="市值 / 亿">{fixed(row.free_float)}</Metric>
      <Metric label="日内回撤" color={tone(row.drawdown)}>{pct(row.drawdown)}</Metric>
      <Metric label="市值口径">{row.free_float == null ? '—' : '沿用数据源'}</Metric>
    </MetricGroup> },
    { title: '涨停原因与概念', key: 'reason', width: '24%', className: 'gcl-cell-reason', render: (_, row) => <div className="gcl-reason-group">
      <h2>涨停原因与概念</h2><p>{row.lu_reason || '样本未提供涨停原因'}</p>
      <div><span>相关概念</span><p>{row.concepts || '—'}</p></div>
    </div> },
  ];
  return <section className="gcl-page" aria-labelledby="limit-board-title">
    <header className="gcl-heading"><div><h1 id="limit-board-title">盘中龙虎榜</h1><p>行情、封板、资金与原因同页对照，股票信息完整展示。</p></div><span className="gcl-date">{snapshot.meta?.asOf || '日期待确认'} · 收盘样本</span></header>
    <div className="gcl-data-panel">
      <Tabs activeKey={kind} onChange={value => { setKind(value); setOpenedOnly(false); setSort(value === 'L' ? 'days' : value === 'U' ? 'first' : 'chgAsc'); }} items={[
        ['U', '涨停'], ['L', '连板'], ['Z', '炸板'], ['D', '跌停'],
      ].map(([key, label]) => ({ key, label: <span>{label}<b className="gcl-tab-count">{counts[key]}</b></span> }))}/>
      <div className="gcl-filters">
        <Space wrap><Input allowClear aria-label="搜索龙虎榜" placeholder="股票、代码、涨停原因" value={query} onChange={event => setQuery(event.target.value)} className="gcl-search"/>
          <Select aria-label="筛选行业" placeholder="全部行业" value={industry || undefined} onChange={v => setIndustry(v === '__all' ? '' : v)} className="gcl-industry" options={[{ value: '__all', label: '全部行业' }, ...[...new Set(all.map(row => row.industry))].sort().map(value => ({ value, label: value }))]}/>
          {isUp && <Checkbox checked={openedOnly} onChange={event => setOpenedOnly(event.target.checked)}>仅看曾开板</Checkbox>}
          {(query || industry || openedOnly) && <Button type="text" onClick={() => { setQuery(''); setIndustry(''); setOpenedOnly(false); }}>重置</Button>}
        </Space>
        <div className="gcl-sort-bar"><Select aria-label="龙虎榜排序" value={sort} onChange={setSort} className="gcl-sort" options={sortOptions.filter(option => isUp || ['chgDesc', 'chgAsc', 'drawdown'].includes(option.value))}/><span className="gcl-muted">{shown.length} 只股票</span></div>
      </div>
      <Table className="gcl-full-info-table" tableLayout="fixed" key={kind} dataSource={shown} rowKey="code" columns={columns} size={density} pagination={{ simple: compact, current: page, pageSize: compact ? 1 : 4, onChange: setPage, showSizeChanger: false, size: 'small', showTotal: total => `共 ${total} 只 · 每页 ${compact ? 1 : 4} 只` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下没有股票，可重置筛选后查看。"/> }}/>
    </div>
    <p className="gcl-footnote">此处“龙虎榜”记录涨跌停事件，不代表交易所公布的营业部席位榜。数据日期 {snapshot.meta?.asOf || '待确认'}；跌停和炸板样本缺少封板、封单与原因，缺失项以“—”表示。</p>
  </section>;
}
