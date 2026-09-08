import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHistory, saveSnapshot, HISTORY_KEY } from '../src/history';
const snapshot = () => ({ id: 'one', title: '业务漏斗', savedAt: new Date().toISOString(), levels: [{ id: 'stage', label: '分发后接管客户数', value: 61, color: '#3366ff', actionItem: '完整待办内容', hasActionItem: true }] });
function storage() { const data = new Map<string,string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key,value); } }; }
test('saved versions survive reload and remain separate from subsequent edits', () => { const s=storage(); const one=snapshot(); const records=saveSnapshot(s,one); one.levels[0].value=99; assert.equal(records[0].levels[0].value,61); assert.equal(readHistory(s)[0].levels[0].value,61); saveSnapshot(s,{...one,id:'two'}); assert.deepEqual(readHistory(s).map(r=>r.levels[0].value),[99,61]); });
test('corrupt history is never silently overwritten', () => { const s=storage(); s.data.set(HISTORY_KEY,'broken'); assert.throws(()=>saveSnapshot(s,snapshot())); assert.equal(s.data.get(HISTORY_KEY),'broken'); });
test('storage quota failures leave earlier saved records intact', () => { const s=storage(); saveSnapshot(s,snapshot()); assert.throws(()=>saveSnapshot({...s,setItem(){throw new Error('quota');}},{...snapshot(),id:'two'})); assert.equal(readHistory(s).length,1); });

test('legacy snapshots load with empty annotations; edited annotations survive saving', () => {
 const s=storage(); saveSnapshot(s,snapshot()); assert.equal(readHistory(s)[0].levels[0].valueNote,'');
 const one=readHistory(s)[0]; one.levels[0].valueNote='-5'; one.levels[0].percentNote='+5pp'; saveSnapshot(s,{...one,id:'notes'});
 assert.equal(readHistory(s)[0].levels[0].valueNote,'-5'); assert.equal(readHistory(s)[0].levels[0].percentNote,'+5pp'); assert.equal(readHistory(s)[1].levels[0].percentNote,'');
});
