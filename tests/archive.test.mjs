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

test('v13.0 schema v1 backups migrate to schema v2 without losing previous awards',()=>{
 const oldSave={format:'ankin-drift-archive',schemaVersion:1,updatedAt:'2026-10-24T00:00:00.000Z',
  record:{damage:750000,time:1800,level:44,runs:[{id:'run-first',damage:300000,time:400,kills:150}],
   clears:[clear('run-first-clear-1',{damage:750000})]},awards:{first_clear:'2026-10-24T00:00:00.000Z'}};
 const h=harness({[key]:asText(oldSave)});h.api.start();
 assert.equal(h.api.current().schemaVersion,2);
 assert.equal(h.api.read().clears.length,1);
 assert.equal(h.api.current().awards.first_clear,'2026-10-24T00:00:00.000Z');
 assert.equal(h.api.lifetimeDamage(),750000); // clear and run must not be counted twice
 assert.equal(JSON.parse(h.memory.get(key)).schemaVersion,2);
 const copy=h.api.exported();const later=harness();later.api.start();later.api.restore(copy,'replace');
 assert.equal(later.api.lifetimeDamage(),750000);
});
test('bronze newcomer is awarded once on first actual play, not when opening title',()=>{
 const h=harness();h.api.start();assert.equal(h.api.current().awards.new_pilot,undefined);
 assert.deepEqual([...h.api.takeUnlocks()],[]);
 h.api.markStarted();const gained=h.api.takeUnlocks();
 assert.equal(gained.length,1);assert.equal(gained[0].id,'new_pilot');assert.equal(gained[0].tier,'bronze');
 h.api.markStarted();assert.equal(h.api.takeUnlocks().length,0);
 const again=harness(Object.fromEntries(h.memory));again.api.start();again.api.markStarted();
 assert.equal(again.api.takeUnlocks().length,0);
});
test('cumulative damage tracks run maxima, not repeated snapshots, and unlocks パイロットセンス',()=>{
 const h=harness();h.api.start();h.api.markStarted();h.api.takeUnlocks();
 h.api.observeRun('run-one',40_000_000,10,20,60);
 h.api.observeRun('run-one',70_000_000,15,100,300);
 assert.equal(h.api.lifetimeDamage(),70_000_000);
 h.api.observeRun('run-two',30_000_000,1,0,0);
 assert.equal(h.api.lifetimeDamage(),100_000_000);
 assert.ok(h.api.takeUnlocks().some(x=>x.id==='pilot_sense'));
 const persisted=harness(Object.fromEntries(h.memory));persisted.api.start();
 assert.equal(persisted.api.lifetimeDamage(),100_000_000);
 const progress=persisted.api.progress().find(x=>x.id==='pilot_sense');
 assert.equal(progress.current,100_000_000);assert.equal(progress.target,100_000_000);
 assert.equal(progress.tier,'rainbow');
});
test('achievement tiers and ten-clear progress are correct, including old save records',()=>{
 const h=harness({[old]:asText({damage:123,time:1800,level:23,clears:[clear('one')]})});h.api.start();
 const a=h.api.progress().find(x=>x.id==='ten_clears');
 assert.equal(a.current,1);assert.equal(a.target,10);assert.equal(a.tier,'gold');
 assert.equal(h.api.progress().find(x=>x.id==='first_clear').tier,'rainbow');
 assert.equal(h.api.progress().find(x=>x.id==='new_pilot').tier,'bronze');
 const r=h.api.read();r.clears.unshift(...Array.from({length:9},(_,i)=>clear('extra-'+i)));
 h.api.write(r);
 assert.equal(h.api.progress().find(x=>x.id==='ten_clears').current,10);
 assert.ok(h.api.current().awards.ten_clears);
});
test('merging old and new archives preserves already-earned achievements and distinct run damage',()=>{
 const a=harness();a.api.start();a.api.markStarted();a.api.observeRun('run-one',60_000_000);
 const backup=a.api.exported();const b=harness();b.api.start();b.api.markStarted();
 b.api.observeRun('run-two',40_000_000);b.api.restore(backup,'merge');
 assert.equal(b.api.lifetimeDamage(),100_000_000);
 assert.equal(b.api.progress().find(x=>x.id==='pilot_sense').unlocked,true);
 b.api.restore(backup,'merge');assert.equal(b.api.lifetimeDamage(),100_000_000);
});
