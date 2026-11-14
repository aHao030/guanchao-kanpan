const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../web/notes-store.js');
const values = { date: '2026-11-13', title: '分歧后的记录', marketView: '量能回落', coreSector: '新能源', stockReview: '', nextPlan: '观察承接' };
const firstTime = '2026-11-13T11:00:00.000Z';
const laterTime = '2026-11-13T12:00:00.000Z';

test('notes save, reload, edit and delete preserve a single record per date', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(store.readNotes(storage), []);
  store.writeNotes(storage, store.upsertNote([], values, firstTime));
  let notes = store.readNotes(storage);
  assert.equal(notes[0].marketView, values.marketView);
  notes = store.upsertNote(notes, { ...values, marketView: '补充盘后观察' }, laterTime);
  assert.equal(notes.length, 1);
  store.writeNotes(storage, notes);
  assert.equal(store.readNotes(storage)[0].marketView, '补充盘后观察');
  store.writeNotes(storage, []);
  assert.deepEqual(store.readNotes(storage), []);
});

test('note backup round trip and import merge retain the newer same-day version', () => {
  const old = store.upsertNote([], values, firstTime);
  const newer = store.upsertNote([], { ...values, nextPlan: '修订计划' }, laterTime);
  const incoming = store.parseNotes(store.serializeNotes(newer));
  const merged = store.mergeNotes(old, incoming);
  assert.deepEqual([merged.added, merged.updated, merged.retained], [0, 1, 0]);
  assert.equal(merged.notes[0].nextPlan, '修订计划');
  assert.equal(store.mergeNotes(newer, old).retained, 1);
  assert.equal(store.mergeNotes([], old).added, 1);
});

test('malformed dates, empty content and invalid imports fail without losing records', () => {
  assert.throws(() => store.upsertNote([], { ...values, date: '2026-02-30' }, firstTime), /日期/);
  assert.throws(() => store.upsertNote([], { date: '2026-11-13' }, firstTime), /至少/);
  assert.throws(() => store.parseNotes('{bad'), /JSON/);
  assert.throws(() => store.parseNotes(JSON.stringify({ version: 2, notes: [] })), /v1/);
  const note = store.upsertNote([], values, firstTime)[0];
  assert.throws(() => store.parseNotes(JSON.stringify({ version: 1, notes: [note, note] })), /重复日期/);
  assert.throws(() => store.normalizeNote({ ...note, stockReview: { text: 'unsafe' } }), /文字/);
  assert.throws(() => store.normalizeNote({ ...note, title: '字'.repeat(121) }), /120/);
});

test('storage failures remain visible instead of reporting a successful save', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.throws(() => store.readNotes(blocked), /存储不可用/);
  assert.throws(() => store.writeNotes(blocked, store.upsertNote([], values, firstTime)), /保存失败/);
});
