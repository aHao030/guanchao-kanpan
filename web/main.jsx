import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme, Button, Input, Select, Segmented, Table, Tag, Modal, Drawer, Empty, Spin, Alert, Form, Slider, ColorPicker, Switch, Descriptions, AutoComplete, Tooltip } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppstoreOutlined, BarsOutlined, BookOutlined, StarOutlined, StarFilled, SettingOutlined, MoonOutlined, SunOutlined, ReloadOutlined, SearchOutlined, ArrowLeftOutlined, ExportOutlined, BellOutlined } from '@ant-design/icons';
import LimitBoard from './LimitBoard';
import ReviewNotes from './ReviewNotes';
import ReviewContext from './ReviewContext';
import { Chart, cloudOption, barOption, klineOption, pct, money } from './charts';
import { defaults, loadPreferences, savePreferences, palette } from './preferences';
import './workbench.css';

const core = window.MarketCore;
const nav = [{ key: 'market', label: '云图看盘', icon: <AppstoreOutlined aria-hidden="true" /> }, { key: 'limits', label: '盘中龙虎榜', icon: <BarsOutlined aria-hidden="true" /> }, { key: 'notes', label: '复盘笔记', icon: <BookOutlined aria-hidden="true" /> }, { key: 'watch', label: '自选股', icon: <StarOutlined aria-hidden="true" /> }];
const records = value => Array.isArray(value) ? value : value?.data || [];
const changeStyle = (value, colors) => ({ color: value > 0 ? colors.upText : value < 0 ? colors.downText : colors.muted });
function readWatch() { try { const list = JSON.parse(localStorage.getItem('guanchao.watch.v1')); return Array.isArray(list) ? list.filter(x => /^\d{6}$/.test(x)) : []; } catch { return []; } }
function download(name, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function Workbench({ settings, setSettings }) {
  const { message } = AntApp.useApp();
  const [snapshot, setSnapshot] = useState(null), [model, setModel] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(() => nav.some(n => n.key === location.hash.slice(1)) ? location.hash.slice(1) : 'market');
  const [search, setSearch] = useState(''), [pool, setPool] = useState('all'), [industry, setIndustry] = useState('');
  const [selected, setSelected] = useState(null), [listOpen, setListOpen] = useState(false), [settingsOpen, setSettingsOpen] = useState(false);
  const [watch, setWatch] = useState(readWatch), [fundView, setFundView] = useState('stock'), [alertsOpen, setAlertsOpen] = useState(false), [threshold, setThreshold] = useState(5);
  const colors = useMemo(() => palette(settings), [settings]);
  async function refresh() {
    setLoading(true); setError('');
    try {
      const result = await window.MarketDataSource.load({ core, clientSdk: window.MarketClient, source: window, config: window.MarketDataConfig, protocol: location.protocol, fetchImplementation: window.fetch.bind(window) });
      setSnapshot(result); setModel(core.createMarketModel(result)); window.MarketRuntime = result.meta;
      if (result.meta.fallback) message.warning('行情接口未响应，当前显示内置样本。');
    } catch (e) { setError('行情加载失败，请检查服务后重试。'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const hash = () => setRoute(nav.some(n => n.key === location.hash.slice(1)) ? location.hash.slice(1) : 'market'); window.addEventListener('hashchange', hash); return () => window.removeEventListener('hashchange', hash); }, []);
  useEffect(() => { document.documentElement.dataset.theme = settings.mode; Object.entries(colors).forEach(([key, value]) => { if (typeof value === 'string') document.documentElement.style.setProperty('--' + key, value); }); document.documentElement.style.setProperty('--up', colors.upText); document.documentElement.style.setProperty('--down', colors.downText); }, [colors]);
  function updateSettings(next) { setSettings(next); try { savePreferences(next); } catch { message.warning('外观已应用，但浏览器未允许保存。'); } }
  function toggleWatch(code) { const next = watch.includes(code) ? watch.filter(x => x !== code) : [...watch, code]; try { localStorage.setItem('guanchao.watch.v1', JSON.stringify(next)); setWatch(next); } catch { message.error('自选保存失败，请检查浏览器存储权限。'); } }
  const visible = useMemo(() => model?.queryStocks({ pool, industry, q: search }) || [], [model, pool, industry, search]);
  const cloud = useMemo(() => cloudOption(visible, colors, industry, settings.labelSize), [visible, colors, industry, settings.labelSize]);
  const current = snapshot?.dashboard?.data?.current || {};
  const limitRows = records(snapshot?.limit);
  const funds = useMemo(() => limitRows.filter(r => r.main_net_inflow != null && r.main_net_inflow !== '' && Number.isFinite(Number(r.main_net_inflow))).map(r => ({ name: r.stock_name, code: core.normalizeCode(r.stock_code), value: Number(r.main_net_inflow), sector: model?.getStockDetail(r.stock_code)?.stock.board || '未分类' })).sort((a, b) => b.value - a.value), [snapshot, model]);
  const fundRows = useMemo(() => { if (fundView === 'stock') return funds; const grouped = new Map(); funds.forEach(r => grouped.set(r.sector, (grouped.get(r.sector) || 0) + r.value)); return [...grouped].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [funds, fundView]);
  const watchRows = watch.map(code => model?.getStockDetail(code)?.stock).filter(Boolean);
  const triggered = watchRows.filter(s => Math.abs(s.changePct) >= threshold);
  const detail = selected && model?.getStockDetail(selected);
  const columns = [
    { title: '股票', key: 'name', fixed: 'left', width: 160, render: (_, s) => <button className="stock-link" onClick={() => setSelected(s.code6)}><b>{s.name}</b><small>{s.code6}</small></button> },
    { title: '现价', dataIndex: 'price', align: 'right', width: 100, render: v => Number(v).toFixed(2) },
    { title: '涨跌幅', dataIndex: 'changePct', align: 'right', width: 110, sorter: (a, b) => a.changePct - b.changePct, render: v => <b style={changeStyle(v, colors)}>{pct(v)}</b> },
    { title: '行业', dataIndex: 'board', width: 120 }, { title: '成交额', dataIndex: 'turnoverAmount', align: 'right', width: 130, render: money },
    { title: '总市值', dataIndex: 'value', align: 'right', width: 140, sorter: (a, b) => a.value - b.value, render: money },
    { title: '自选', key: 'watch', width: 70, render: (_, s) => <Button type="text" aria-label={`${watch.includes(s.code6) ? '移出' : '加入'}自选 ${s.name}`} icon={watch.includes(s.code6) ? <StarFilled aria-hidden="true" /> : <StarOutlined aria-hidden="true" />} onClick={() => toggleWatch(s.code6)} /> }
  ];
  return <>
    <a className="skip-link" href="#content">跳到主要内容</a>
    <header className="app-header">
      <a className="brand" href="#market" aria-label="观潮看盘首页"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 10c4-5 8-5 12 0s8 5 12 0M4 19c4-5 8-5 12 0s8 5 12 0" /></svg><span>观潮<span className="brand-tail">看盘</span></span></a>
      <nav className="main-nav" aria-label="主导航">{nav.map(n => <a key={n.key} href={`#${n.key}`} className={route === n.key ? 'active' : ''} aria-current={route === n.key ? 'page' : undefined}>{n.icon}<span>{n.label}</span></a>)}</nav>
      <div className="header-actions">
        <AutoComplete className="global-search" value={search} onChange={setSearch} options={(search ? model?.queryStocks({ q: search }).slice(0, 12) : [])?.map(s => ({ value: s.code6, label: `${s.name}  ${s.code6}` }))} onSelect={code => { setSelected(code); setSearch(''); }}><Input prefix={<SearchOutlined aria-hidden="true" />} placeholder="搜索股票 / 代码" aria-label="搜索股票 / 代码" allowClear onPressEnter={() => { if (visible[0]) setSelected(visible[0].code6); }} /></AutoComplete>
        <Tooltip title={settings.mode === 'dark' ? '切换浅色' : '切换深色'}><Button type="text" aria-label={settings.mode === 'dark' ? '切换浅色' : '切换深色'} icon={settings.mode === 'dark' ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />} onClick={() => updateSettings({ ...settings, mode: settings.mode === 'dark' ? 'light' : 'dark' })} /></Tooltip>
        <Button type="text" aria-label="外观设置" icon={<SettingOutlined aria-hidden="true" />} onClick={() => setSettingsOpen(true)} />
      </div>
    </header>
    <div className="session-strip"><span><i className="status-dot" />{snapshot?.meta.mode === 'sample' ? '收盘样本' : '行情快照'}<b>{snapshot?.meta.asOf || '加载中'}</b><span className="session-extra">沪深京 A 股</span></span><span>非实时行情<Button size="small" type="text" icon={<ReloadOutlined spin={loading} />} onClick={refresh} aria-label="刷新行情">刷新</Button></span></div>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={refresh}>重试</Button>} />}
    {!model ? <div className="loading-state"><Spin /><p>{error || '正在载入市场快照…'}</p></div> : <main id="content" className="content" tabIndex={-1}>
      {route === 'market' && <>
        <div className="market-strip" aria-label="市场概览">{[['all', '全 A 市场'], ['sse', '沪市 A 股'], ['szse', '深市 A 股'], ['cyb', '创业板'], ['kcb', '科创板'], ['bj', '北交所']].map(([key, label]) => { const m = snapshot.overview.markets.find(x => x.market === key); return <div key={key}><span>{label}</span><b style={changeStyle(m?.changePct, colors)}>{pct(m?.changePct)}</b><small>{m?.stockCount?.toLocaleString()} 家</small></div>; })}<div className="breadth"><span>涨 / 跌家数</span><b><em style={{ color: colors.upText }}>{current.all_red_count}</em><i>/</i><em style={{ color: colors.downText }}>{current.all_green_count}</em></b><small>成交额 {current.total_amount?.toLocaleString()} 亿</small></div></div>
        <section className="cloud-section" aria-label="全市场云图">
          <div className="section-heading"><div><h1>{industry ? `${industry}云图` : '全市场云图'}</h1><p>一眼看清市场结构，沿行业找到个股。</p></div><div className="toolbar">{industry && <Button icon={<ArrowLeftOutlined aria-hidden="true" />} onClick={() => setIndustry('')}>全市场</Button>}<Select aria-label="选择行业" showSearch optionFilterProp="label" placeholder="全部行业" value={industry || undefined} onChange={v => setIndustry(v === '__all' ? '' : v)} options={[{ value: '__all', label: '全部行业' }, ...model.boards.map(b => ({ value: b.name, label: b.name }))]} style={{ width: 146 }} /><Button onClick={() => setListOpen(true)} icon={<BarsOutlined aria-hidden="true" />}>股票列表</Button></div></div>
          <div className="cloud-controls"><Segmented aria-label="标的池" value={pool} onChange={setPool} options={model.pools.map(p => ({ value: p.id, label: `${p.label} ${p.count}` }))} /><div className="legend"><span style={{ background: colors.down }} />下跌<span style={{ background: colors.flat }} />平盘<span style={{ background: colors.up }} />上涨</div></div>
          <div className="cloud-canvas">{visible.length ? <Chart option={cloud} height={settings.mapHeight} label={`行业市值云图，共${visible.length}只股票；可用股票列表查看全部名称`} onClick={e => { if (e.data?.stock) setSelected(e.data.stock.code6); else if (model.boards.some(b => b.name === e.name)) setIndustry(e.name); }} /> : <Empty description="没有匹配的股票，请清空搜索或调整筛选" />}</div>
          <div className="cloud-caption"><span>面积代表总市值 · 点击行业放大 · 点击个股查看详情</span><span>{visible.length.toLocaleString()} 只股票 · 小格名称可通过放大或列表查看</span></div>
        </section>
        <section className="fund-section" aria-label="盘中资金流向监控">
          <div className="section-heading"><div><h2>盘中资金流向监控</h2><p>跟踪资金聚集的方向，区分数据范围与更新时间。</p></div><Tag>收盘快照 · 涨停样本</Tag></div>
          <div className="fund-summary"><div><span>涨停样本主力净流入</span><strong style={changeStyle(funds.reduce((n, r) => n + r.value, 0), colors)}>+{funds.reduce((n, r) => n + r.value, 0).toFixed(2)}<small>亿元</small></strong><p>仅覆盖 {funds.length} 只涨停股，不代表全市场</p></div><div><span>全市场主力净流入</span><strong>—</strong><p>当前数据源未提供</p></div><div><span>盘中分钟级资金曲线</span><strong className="pending-label">等待数据接入</strong><p>已有快照，尚无分钟序列</p></div></div>
          <div className="fund-grid"><div><div className="subsection-heading"><h3>{fundView === 'stock' ? '资金流入个股' : '资金流入行业'}</h3><Segmented size="small" options={[{ label: '个股', value: 'stock' }, { label: '行业', value: 'sector' }]} value={fundView} onChange={setFundView} /></div><Chart label="涨停样本主力净流入前十，单位亿元" height={320} option={barOption(fundRows.slice(0, 10), colors)} onClick={e => { if (fundView === 'stock' && fundRows[e.dataIndex]) setSelected(fundRows[e.dataIndex].code); }} /></div><div className="fund-ranking"><div className="subsection-heading"><h3>资金明细</h3><span>单位：亿元</span></div><Table rowKey="code" size="small" dataSource={funds} pagination={{ pageSize: 6, size: 'small', showSizeChanger: false }} columns={[{ title: '股票 / 行业', key: 'name', render: (_, r) => <button className="stock-link" onClick={() => setSelected(r.code)}><b>{r.name}</b><small>{r.sector}</small></button> }, { title: '主力净流入', dataIndex: 'value', align: 'right', sorter: (a, b) => a.value - b.value, render: v => <b style={changeStyle(v, colors)}>{v > 0 ? '+' : ''}{v.toFixed(2)}</b> }]} /></div></div>
          <p className="data-note">行业按云图行业归属汇总涨停样本；当前未接入全市场资金、分钟级流向及自动推送。</p>
        </section>
      </>}
      {route === 'limits' && <LimitBoard density={settings.density} model={model} snapshot={snapshot} onSelectStock={setSelected} />}
      {route === 'notes' && <><ReviewNotes model={model} snapshot={snapshot} /><ReviewContext snapshot={snapshot} colors={colors} /></>}
      {route === 'watch' && <section className="watch-section"><div className="section-heading"><div><h1>自选股</h1><p>把关注的标的放在一起，持续核对价格与异动。</p></div><div className="toolbar"><Button icon={<BellOutlined aria-hidden="true" />} onClick={() => setAlertsOpen(true)}>异动提醒 {triggered.length > 0 ? `· ${triggered.length}` : ''}</Button><Button icon={<ExportOutlined aria-hidden="true" />} onClick={() => download('观潮自选股.json', { asOf: snapshot.meta.asOf, stocks: watchRows })}>导出</Button></div></div><Alert type="info" showIcon title="当前为收盘样本，自选行情与阈值提醒基于该快照，不是实时推送。" /><Table className="watch-table" rowKey="code6" dataSource={watchRows} columns={columns} size={settings.density} scroll={{ x: 830 }} locale={{ emptyText: <Empty description="还没有自选股。搜索股票后，在详情中加入自选。" /> }} /></section>}
    </main>}
    <footer className="app-footer"><span>观潮看盘<span>把市场结构看清，把交易思路记下。</span></span><span>样本数据 · {snapshot?.meta.asOf || '—'} · 本地笔记</span></footer>
    <Modal title={`股票列表 · ${visible.length} 只`} open={listOpen} onCancel={() => setListOpen(false)} footer={null} width={1000}><Table dataSource={visible} rowKey="code6" columns={columns} scroll={{ x: 830 }} size="small" pagination={{ pageSize: 10, showSizeChanger: true }} /></Modal>
    <Drawer title="个股详情" open={!!selected} onClose={() => setSelected(null)} size="large" extra={detail && <Button icon={watch.includes(selected) ? <StarFilled aria-hidden="true" /> : <StarOutlined aria-hidden="true" />} onClick={() => toggleWatch(selected)}>{watch.includes(selected) ? '移出自选' : '加入自选'}</Button>}>
      {detail ? <><div className="stock-heading"><div><h2>{detail.stock.name}</h2><p>{detail.stock.code6} · {detail.stock.board}</p></div><div style={changeStyle(detail.stock.changePct, colors)}><strong>{Number(detail.stock.price).toFixed(2)}</strong><span>{pct(detail.stock.changePct)}</span></div></div><Descriptions size="small" column={2} items={[{ key: 'cap', label: '总市值', children: money(detail.stock.value) }, { key: 'amount', label: '成交额', children: money(detail.stock.turnoverAmount) }, { key: 'date', label: '行情日期', children: snapshot.meta.asOf }, { key: 'source', label: '数据状态', children: '收盘样本' }]} /><h3 className="detail-section-title">日 K 线</h3>{detail.kline ? <Chart label="个股日K线" height={300} option={klineOption(detail.kline, colors)} /> : <Empty description="当前样本未包含该股 K 线" />}<h3 className="detail-section-title">涨停记录</h3>{detail.limitUp ? <Descriptions column={1} size="small" items={[{ key: 1, label: '涨停原因', children: detail.limitUp.lu_reason || '—' }, { key: 2, label: '板型 / 连板', children: `${detail.limitUp.lu_status} · ${detail.limitUp.lu_tag}` }, { key: 3, label: '首次 / 最后封板', children: `${detail.limitUp.first_lu_time} / ${detail.limitUp.last_lu_time}` }, { key: 4, label: '开板次数', children: detail.limitUp.open_times }]} /> : <p className="muted">该股不在当日涨停样本中</p>}</> : <Empty description="未找到该股的详细行情" />}
    </Drawer>
    <Drawer title="外观设置" open={settingsOpen} onClose={() => setSettingsOpen(false)} extra={<Button onClick={() => updateSettings(defaults())}>恢复默认</Button>}>
      <p className="muted">即时预览，自动保存在当前浏览器。修改源码默认值可使用 public/ui.config.js。</p><Form layout="vertical"><Form.Item label="深色模式"><Switch checked={settings.mode === 'dark'} onChange={v => updateSettings({ ...settings, mode: v ? 'dark' : 'light' })} /></Form.Item>{[['up', '上涨颜色'], ['down', '下跌颜色'], ['accent', '界面强调色']].map(([key, label]) => <Form.Item label={label} key={key}><ColorPicker value={settings[key]} showText onChangeComplete={v => updateSettings({ ...settings, [key]: v.toHexString() })} /></Form.Item>)}<Form.Item label="云图高度"><Slider min={320} max={800} step={10} value={settings.mapHeight} onChange={v => updateSettings({ ...settings, mapHeight: v })} /></Form.Item><Form.Item label="个股名称字号"><Slider min={10} max={20} value={settings.labelSize} onChange={v => updateSettings({ ...settings, labelSize: v })} /></Form.Item><Form.Item label="表格密度"><Segmented value={settings.density} options={[{ label: '舒适', value: 'middle' }, { label: '紧凑', value: 'small' }]} onChange={v => updateSettings({ ...settings, density: v })} /></Form.Item></Form><Button block icon={<ExportOutlined aria-hidden="true" />} onClick={() => download('观潮外观配置.json', settings)}>导出外观配置</Button>
    </Drawer>
    <Drawer title="自选股异动提醒" open={alertsOpen} onClose={() => setAlertsOpen(false)}><p>按当前快照的绝对涨跌幅筛选，仅用于检查自选股。</p><Form.Item label={`提醒阈值：±${threshold}%`}><Slider min={1} max={20} step={1} value={threshold} onChange={setThreshold} /></Form.Item>{triggered.length ? triggered.map(s => <div className="alert-row" key={s.code6}><button className="stock-link" onClick={() => { setAlertsOpen(false); setSelected(s.code6); }}>{s.name}<small>{s.code6}</small></button><b style={changeStyle(s.changePct, colors)}>{pct(s.changePct)}</b></div>) : <Empty description="当前自选股没有达到阈值的标的" />}<p className="data-note">收盘样本 · 非实时事件提醒</p></Drawer>
  </>;
}

function Root() {
  const [settings, setSettings] = useState(loadPreferences);
  const colors = palette(settings);
  return <ConfigProvider locale={zhCN} theme={{ algorithm: settings.mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: settings.accent, colorBgBase: colors.background, colorBgContainer: colors.surface, colorText: colors.text, colorTextSecondary: colors.muted, colorBorder: colors.line, borderRadius: 6, fontSize: 13, fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif', controlHeight: 34, motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }, components: { Table: { headerBg: colors.raised }, Modal: { contentBg: colors.surface, headerBg: colors.surface } } }}><AntApp><Workbench settings={settings} setSettings={setSettings} /></AntApp></ConfigProvider>;
}

createRoot(document.getElementById('root')).render(<Root />);
