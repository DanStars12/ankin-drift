import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../v13-archive.js',import.meta.url),'utf8');
const old='ankin_drift_v96_damage_records';
const key='ankin_drift_pilot_archive';
const clear=(id,extra={})=>({id,mode:'normal',ship:'shot',date:'2026-10-26T10:00:00.000Z',time:1800,level:45,damage:10000,...extra});
function harness(preload={},failure=false){
 const memory=new Map(Object.entries(preload));
 const localStorage={
  getItem:k=>memory.has(k)?memory.get(k):null,
  setItem(k,v){if(failure)throw Error('QuotaExceededError');memory.set(k,String(v))},
  removeItem:k=>memory.delete(k)
 };
 const context={localStorage,structuredClone,Date,JSON,Math,Set,Map,Error,Number,Array,Object,String};
 runInNewContext(source,context,{filename:'v13-archive.js'});
 return {api:context.AnkinArchive,memory};
}
function asText(v){return JSON.stringify(v)}
test('v12.4 save migration is non-destructive and persists after reload',()=>{
 const legacy={damage:930000,time:1850,level:77,clears:[clear('legacy-original',{title:'旧クリア'})],runs:[{id:'r0',time:40,level:2,damage:9}]};
 const h=harness({[old]:asText(legacy)});
 const first=h.api.start();
 assert.equal(first.schemaVersion,2);assert.equal(first.record.damage,930000);
 assert.equal(first.record.clears.length,1);
 assert.equal(first.record.clears[0].title,'旧クリア');
 assert.equal(first.awards.first_clear!==undefined,true);
 assert.equal(h.memory.get(old),asText(legacy));
 const second=harness(Object.fromEntries(h.memory));
 assert.equal(second.api.start().record.clears[0].id,'legacy-original');
 assert.equal(second.api.read().level,77);
});
test('legacy v71 keys still migrate without inventing damage',()=>{
 const h=harness({'ankin_drift_v71_records':asText({score:999,time:32,level:7})});
 assert.equal(h.api.start().record.damage,0);
 assert.equal(h.api.read().time,32);
 assert.equal(h.api.read().level,7);
});
test('unlimited legacy ten clear limit removed and awards are earned',()=>{
 const h=harness();h.api.start();const r=h.api.read();
 r.clears=Array.from({length:12},(_,i)=>clear('run-'+i,{ship:['shot','laser','charge','drill'][i%4],mode:i%2?'challenge':'normal',fusionIds:i===3?['fire_ice','wind_rock']:[],evolutionIds:i===4?['a','b']:[],challenges:i===5?['fragile','onslaught','armored']:[]}));
 assert.equal(h.api.write(r),true);
 const next=harness(Object.fromEntries(h.memory));next.api.start();
 assert.equal(next.api.read().clears.length,12);
 const a=next.api.current().awards;
 for(const id of ['first_clear','four_frames','both_modes','ten_clears','dual_fusion','evolution_master','challenge_two','challenge_three'])assert.ok(a[id],id);
});
test('safe backup roundtrip, preview and merge without duplicating IDs',()=>{
 const a=harness();a.api.start();let r=a.api.read();r.clears.push(clear('a'));assert.equal(a.api.write(r),true);
 const backup=a.api.exported();
 const b=harness();b.api.start();r=b.api.read();r.clears.push(clear('b',{ship:'drill'}));b.api.write(r);
 assert.deepEqual({...b.api.preview(backup),data:null},{clears:1,runs:0,awards:1,updatedAt:b.api.preview(backup).updatedAt,data:null});
 b.api.restore(backup,'merge');assert.equal(b.api.read().clears.length,2);
 b.api.restore(backup,'merge');assert.equal(b.api.read().clears.length,2);
 const c=harness();c.api.start();c.api.restore(b.api.exported(),'replace');
 assert.equal(c.api.read().clears.length,2);
});
test('malformed JSON and newer schema are rejected without writing',()=>{
 const h=harness();h.api.start();const before=h.memory.get(key);
 for(const bad of ['not json','[]',asText({format:'ankin-drift-archive',schemaVersion:42,record:{}}),'{'.repeat(1024*1024+1)]){
  assert.throws(()=>h.api.preview(bad));
  assert.throws(()=>h.api.restore(bad,'merge'));
  assert.equal(h.memory.get(key),before);
 }
});
test('corrupt save enters protection mode and preserves raw data',()=>{
 const h=harness({[key]:'corrupted json',[old]:asText({time:99,level:13})});
 h.api.start();assert.match(h.api.status(),/保護モード/);
 assert.equal(h.api.read().time,99);
 assert.equal(h.api.write({...h.api.read(),damage:33}),false);
 assert.equal(h.memory.get(key),'corrupted json');
});
test('storage quota failure is visible and record stays available for backup',()=>{
 const h=harness({},true);h.api.start();
 assert.match(h.api.status(),/保存不可/);
 assert.equal(h.api.write({...h.api.read(),time:88}),false);
 assert.match(h.api.status(),/保存失敗/);
 assert.ok(h.api.exported().includes('"schemaVersion": 2'));
});
