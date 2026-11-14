import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Form, Input, Modal, Popconfirm, Space, Tag, message } from 'antd';
import noteStore from './notes-store.js';
import './pages.css';

const { STORAGE_KEY, DRAFT_KEY, FIELDS, validDate, readNotes, writeNotes, upsertNote, parseNotes, serializeNotes, mergeNotes } = noteStore;
const blank = date => ({ date, title: '', marketView: '', coreSector: '', stockReview: '', nextPlan: '' });
const fieldInfo = [
  { name: 'marketView', title: '市场判断', hint: '指数与成交量发生了什么变化？今天处于怎样的情绪阶段？', placeholder: '记录事实、判断，以及支持判断的证据。', rows: 4 },
  { name: 'coreSector', title: '核心题材', hint: '资金聚焦哪些方向？板块内部的强弱关系如何？', placeholder: '主线题材、领涨标的、持续性与分歧。', rows: 3 },
  { name: 'stockReview', title: '个股复盘', hint: '哪些信号值得重复，哪些动作需要修正？', placeholder: '股票名称 / 代码、观察信号、操作与反思。', rows: 4 },
  { name: 'nextPlan', title: '明日计划', hint: '把判断写成可以观察、可以验证的条件。', placeholder: '重点观察、触发条件、失效条件与风险控制。', rows: 3 },
];

function download(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReviewNotes({ snapshot }) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalHolder] = Modal.useModal();
  const defaultDate = snapshot.meta?.asOf || new Date().toLocaleDateString('en-CA');
  const [notes, setNotes] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [query, setQuery] = useState('');
  const importInput = useRef(null);
  const ready = useRef(false);

  useEffect(() => {
    try {
      const loaded = readNotes(window.localStorage);
      setNotes(loaded);
      const draftRaw = window.localStorage.getItem(DRAFT_KEY);
      let draft;
      try { draft = draftRaw ? JSON.parse(draftRaw) : null; } catch { draft = null; }
      if (draft?.values && typeof draft.values === 'object' && validDate(draft.values.date) && FIELDS.every(field => draft.values[field] == null || typeof draft.values[field] === 'string')) {
        const safeValues = Object.fromEntries(['date', ...FIELDS].map(field => [field, draft.values[field] || '']));
        form.setFieldsValue(safeValues);
        setActiveDate(typeof draft.activeDate === 'string' ? draft.activeDate : null);
        setDirty(true); setDraftStatus('已恢复本机草稿');
      } else if (loaded.length) { setActiveDate(loaded[0].date); form.setFieldsValue(loaded[0]); }
      else form.setFieldsValue(blank(defaultDate));
    } catch (error) { setStorageError(error.message); form.setFieldsValue(blank(defaultDate)); }
    ready.current = true;
  }, []);

  useEffect(() => {
    const leave = event => { if (dirty && draftStatus === '草稿暂未备份') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty, draftStatus]);

  function changed(_, values) {
    if (!ready.current) return;
    setDirty(true);
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ activeDate, values })); setDraftStatus('草稿已备份至本机'); }
    catch { setDraftStatus('草稿暂未备份'); }
  }

  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
    setDirty(false); setDraftStatus('');
  }

  function setEditor(note) {
    form.resetFields(); form.setFieldsValue(note || blank(defaultDate));
    setActiveDate(note?.date || null); clearDraft();
  }

  function navigate(note) {
    if (!dirty) { setEditor(note); return; }
    modalApi.confirm({ title: '放弃当前未保存的修改？', content: '已保存的笔记会保留，当前草稿将被替换。', okText: '放弃并切换', cancelText: '继续编辑', onOk: () => setEditor(note) });
  }

  function persist(next) {
    const saved = writeNotes(window.localStorage, next);
    setNotes(saved); setStorageError('');
    return saved;
  }

  async function save() {
    try {
      const values = await form.validateFields();
      const run = () => {
        try {
          persist(upsertNote(notes, values)); setActiveDate(values.date); clearDraft(); messageApi.success('复盘笔记已保存到本机');
        } catch (error) { messageApi.error(error.message); }
      };
      if (values.date !== activeDate && notes.some(note => note.date === values.date)) {
        modalApi.confirm({ title: `${values.date} 已有一篇复盘`, content: '每个日期保留一篇笔记。覆盖会替换该日期已保存的内容。', okText: '覆盖该日笔记', cancelText: '继续编辑', onOk: run });
      } else run();
    } catch (error) { if (!error.errorFields) messageApi.error(error.message); }
  }

  function remove() {
    try { const next = persist(notes.filter(note => note.date !== activeDate)); setEditor(next[0] || null); messageApi.success('已删除笔记'); }
    catch (error) { messageApi.error(error.message); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error('请选择小于 10 MB 的笔记文件。');
      const incoming = parseNotes(await file.text());
      const result = mergeNotes(notes, incoming);
      modalApi.confirm({ title: '合并导入笔记', content: `新增 ${result.added} 篇，更新 ${result.updated} 篇，保留本机较新或相同版本 ${result.retained} 篇。同一天采用更新时间较新的记录。`, okText: '确认导入', cancelText: '取消', onOk: () => {
        try { persist(result.notes); if (!dirty) setEditor(result.notes.find(note => note.date === activeDate) || result.notes[0] || null); messageApi.success('笔记已导入'); }
        catch (error) { messageApi.error(error.message); }
      } });
    } catch (error) { messageApi.error(error.message || '无法读取笔记文件。'); }
  }

  function resetStorage() {
    try { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(DRAFT_KEY); setNotes([]); setStorageError(''); setEditor(null); messageApi.success('本机笔记存储已重置'); }
    catch { messageApi.error('浏览器仍不允许访问本机存储，请调整浏览器设置。'); }
  }

  const filtered = notes.filter(note => `${note.date} ${note.title} ${note.marketView} ${note.coreSector} ${note.stockReview} ${note.nextPlan}`.includes(query.trim()));
  const active = notes.find(note => note.date === activeDate);

  return <section className="gcn-page" aria-labelledby="review-notes-title">
    {contextHolder}{modalHolder}
    <header className="gcl-heading"><div><h1 id="review-notes-title">复盘笔记</h1><p>从盘面事实到交易判断，留下一份可以回看的记录。</p></div>
      <Space wrap><Button onClick={() => importInput.current?.click()} disabled={Boolean(storageError)}>导入</Button><Button onClick={() => download(serializeNotes(notes), '观潮复盘笔记.json')} disabled={!notes.length}>导出备份</Button><Button type="primary" onClick={() => navigate(null)}>新建笔记</Button></Space>
    </header>
    <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={importFile}/>
    {storageError && <Alert type="error" showIcon title="本机笔记暂时无法读取" description={<><p>{storageError} 为避免覆盖原记录，保存与导入已暂停。</p><Space wrap><Button size="small" onClick={() => { try { download(window.localStorage.getItem(STORAGE_KEY) || '', '观潮笔记原始备份.json'); } catch { messageApi.error('无法读取原始记录。'); } }}>备份原始记录</Button><Popconfirm title="重置会清除当前浏览器中所有笔记与草稿" description="请先下载原始备份，重置后可再导入有效记录。" onConfirm={resetStorage} okText="重置" cancelText="取消"><Button danger size="small">重置本机存储</Button></Popconfirm></Space></>}/>}
    <div className="gcn-workspace">
      <aside className={`gcn-library${notes.length ? '' : ' gcn-library-empty'}`} aria-label="已保存复盘笔记">
        <div className="gcn-library-title"><strong>我的复盘</strong><span>{notes.length} 篇</span></div>
        {notes.length > 0 && <Input allowClear aria-label="搜索复盘笔记" placeholder="搜索日期或内容" value={query} onChange={event => setQuery(event.target.value)}/>}
        <div className="gcn-note-list">
          {filtered.length ? filtered.map(note => <button key={note.date} className={`gcn-note-item${activeDate === note.date ? ' is-active' : ''}`} aria-current={activeDate === note.date ? 'true' : undefined} onClick={() => navigate(note)}><time>{note.date}</time><strong>{note.title}</strong><p>{(note.marketView || note.coreSector || note.stockReview || note.nextPlan).slice(0, 160)}</p></button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query ? '没有匹配的笔记' : '第一篇复盘，从今天开始'}/>}
        </div>
        <p className="gcn-local-hint">保存在当前浏览器。定期导出备份，可迁移至其他设备。</p>
      </aside>
      <div className="gcn-editor">
        <div className="gcn-editor-top"><span>{activeDate ? '编辑复盘' : '新的复盘'} {dirty && <Tag bordered={false}>未保存</Tag>}</span><span className="gcl-muted" role="status">{draftStatus || (active ? `上次保存 ${new Date(active.updatedAt).toLocaleString('zh-CN', { hour12: false })}` : '写下今天值得记住的事')}</span></div>
        <Form form={form} layout="vertical" onValuesChange={changed} onFinish={save} requiredMark={false}>
          <div className="gcn-meta-grid"><Form.Item name="date" label="复盘日期" rules={[{ required: true, message: '请选择复盘日期' }]}><Input type="date" aria-label="复盘日期"/></Form.Item><Form.Item name="title" label="笔记标题" rules={[{ max: 120, message: '标题最多 120 字' }]}><Input placeholder="给今天的判断一个标题" maxLength={120}/></Form.Item></div>
          {fieldInfo.map(field => <div key={field.name} className="gcn-field"><div className="gcn-field-head"><label htmlFor={field.name}>{field.title}</label><p>{field.hint}</p></div><Form.Item name={field.name} rules={[{ max: 20000, message: '单个栏目最多 20,000 字' }]}><Input.TextArea id={field.name} aria-label={field.title} placeholder={field.placeholder} autoSize={{ minRows: field.rows, maxRows: 14 }} maxLength={20000}/></Form.Item></div>)}
          <div className="gcn-editor-actions"><Space><Button type="primary" htmlType="submit" disabled={Boolean(storageError)}>保存笔记</Button><span className="gcl-muted">至少填写一个栏目即可保存</span></Space>{activeDate && <Popconfirm title="删除这一天的复盘笔记？" description="删除后可通过导出的备份恢复。" onConfirm={remove} okText="删除" cancelText="取消"><Button danger type="text" disabled={Boolean(storageError)}>删除笔记</Button></Popconfirm>}</div>
        </Form>
      </div>
    </div>
  </section>;
}
