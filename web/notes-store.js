/* Browser-local notes contract. No market credentials or remote writes. */
const STORAGE_KEY = 'guanchao.review-notes.v1';
const DRAFT_KEY = 'guanchao.review-draft.v1';
const FIELDS = ['title', 'marketView', 'coreSector', 'stockReview', 'nextPlan'];
const MAX_NOTES = 2000;

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

function normalizeNote(note) {
  if (!note || typeof note !== 'object' || Array.isArray(note) || !validDate(note.date)) {
    throw new Error('复盘日期无效，请使用 YYYY-MM-DD。');
  }
  const result = { date: note.date };
  for (const field of FIELDS) {
    if (note[field] != null && typeof note[field] !== 'string') throw new Error('笔记内容必须为文字。');
    const text = (note[field] || '').trim();
    if (text.length > (field === 'title' ? 120 : 20000)) throw new Error(field === 'title' ? '标题最多 120 字。' : '单个笔记栏目最多 20,000 字。');
    result[field] = text;
  }
  result.title ||= result.date + ' 复盘';
  if (!FIELDS.slice(1).some(field => result[field])) throw new Error('请至少填写一个复盘栏目。');
  if (typeof note.updatedAt !== 'string' || Number.isNaN(Date.parse(note.updatedAt))) throw new Error('笔记更新时间无效。');
  result.updatedAt = new Date(note.updatedAt).toISOString();
  return result;
}

function parseNotes(text) {
  if (typeof text !== 'string' || text.length > 10_000_000) throw new Error('笔记文件过大或格式无效。');
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error('笔记文件不是有效的 JSON。'); }
  if (!payload || payload.version !== 1 || !Array.isArray(payload.notes)) throw new Error('请选择观潮导出的 v1 笔记文件。');
  if (payload.notes.length > MAX_NOTES) throw new Error('最多保存 2,000 篇笔记，请拆分备份。');
  const seen = new Set();
  return payload.notes.map(normalizeNote).map(note => {
    if (seen.has(note.date)) throw new Error('文件包含重复日期，请先整理后导入。');
    seen.add(note.date);
    return note;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function serializeNotes(notes) {
  const text = JSON.stringify({ version: 1, notes }, null, 2);
  parseNotes(text);
  return text;
}

function readNotes(storage) {
  let raw;
  try { raw = storage.getItem(STORAGE_KEY); } catch { throw new Error('浏览器存储不可用。请允许本站保存数据后重试。'); }
  return raw == null ? [] : parseNotes(raw);
}

function writeNotes(storage, notes) {
  const text = serializeNotes(notes);
  try { storage.setItem(STORAGE_KEY, text); } catch { throw new Error('保存失败：浏览器空间不足或存储被禁用。请先导出当前笔记。'); }
  return parseNotes(text);
}

function upsertNote(notes, values, now = new Date().toISOString()) {
  const note = normalizeNote({ ...values, updatedAt: now });
  const next = [note, ...notes.filter(item => item.date !== note.date)].sort((a, b) => b.date.localeCompare(a.date));
  if (next.length > MAX_NOTES) throw new Error('最多保存 2,000 篇笔记，请先备份并整理。');
  return next;
}

function mergeNotes(current, incoming) {
  const result = new Map(current.map(note => [note.date, normalizeNote(note)]));
  let added = 0, updated = 0, retained = 0;
  for (const raw of incoming) {
    const note = normalizeNote(raw), previous = result.get(note.date);
    if (!previous) { result.set(note.date, note); added++; }
    else if (Date.parse(note.updatedAt) > Date.parse(previous.updatedAt)) { result.set(note.date, note); updated++; }
    else retained++;
  }
  const notes = [...result.values()].sort((a, b) => b.date.localeCompare(a.date));
  if (notes.length > MAX_NOTES) throw new Error('合并后超过 2,000 篇，请拆分备份。');
  return { notes, added, updated, retained };
}

module.exports = { STORAGE_KEY, DRAFT_KEY, FIELDS, validDate, normalizeNote, parseNotes, serializeNotes, readNotes, writeNotes, upsertNote, mergeNotes };
