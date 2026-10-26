/* ANKIN DRIFT v13 — persistent achievements and portable local archive.
   This file deliberately has no game loop dependencies. App release version
   and save schemaVersion are independent. Do not delete old save keys. */
(function(root){
'use strict';
const KEY='ankin_drift_pilot_archive';
const OLD='ankin_drift_v96_damage_records';
const LEGACY=['ankin_drift_v71_records','ankin_drift_v7_records','ankin_drift_v6_records','ankin_drift_v5_records'];
const MAX_BYTES=1024*1024, MAX_CLEARS=1000, MAX_RUNS=200;
const SHIPS=['shot','laser','charge','drill'], MODES=['normal','challenge'];
const finite=(v,max=1e15)=>Number.isFinite(+v)?Math.min(max,Math.max(0,+v)):0;
const safeDate=(v)=>typeof v==='string'&&v.length<=36?v:new Date(0).toISOString();
const text=(v,max=110)=>typeof v==='string'?v.slice(0,max):'';
const array=v=>Array.isArray(v)?v:[];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function stripClear(v,i){
 const o=object(v),meta=object(o.meta);
 return {id:text(o.id||('legacy-clear-'+i+'-'+text(o.date,32)),90),mode:MODES.includes(o.mode)?o.mode:'normal',
  time:finite(o.time,1e8),level:finite(o.level,1e7),damage:finite(o.damage),date:safeDate(o.date),
  endless:!!o.endless,ship:SHIPS.includes(o.ship)?o.ship:null,
  title:text(o.title,90),subtitle:text(o.subtitle,160),rank:text(o.rank,32),
  challenges:array(o.challenges).filter(x=>['fragile','onslaught','armored'].includes(x)).slice(0,3),
  fusionIds:array(o.fusionIds).map(x=>text(x,40)).slice(0,2),
  evolutionIds:array(o.evolutionIds).map(x=>text(x,70)).slice(0,30),
  finalSource:text(o.finalSource,40),meta:{...('victories' in meta?{victories:finite(meta.victories,1e7)}:{})}};
}
function stripRun(v,i){
 const o=object(v),stats=object(o.stats),safeStats={};
 for(const [key,value] of Object.entries(stats).slice(0,30))if(/^[a-zA-Z0-9_-]{1,30}$/.test(key))safeStats[key]=finite(value);
 return {id:text(o.id||('legacy-run-'+i+'-'+text(o.date,32)),90),outcome:text(o.outcome,25),
  gameMode:MODES.includes(o.gameMode)?o.gameMode:'normal',damage:finite(o.damage),
  bossDamage:finite(o.bossDamage),ship:SHIPS.includes(o.ship)?o.ship:null,
  time:finite(o.time,1e8),level:finite(o.level,1e7),kills:finite(o.kills,1e9),
  date:safeDate(o.date),stats:safeStats,build:o.build?{specials:array(o.build.specials).map(x=>text(x,100)).slice(0,35)}:{}};
}
function recordOf(r){
 const o=object(r);return {damage:finite(o.damage),time:finite(o.time,1e8),level:finite(o.level,1e7),
  runs:array(o.runs).slice(0,MAX_RUNS).map(stripRun),
  clears:array(o.clears).slice(0,MAX_CLEARS).map(stripClear)};
}
const DEFINITIONS=[
 ['first_clear','初めての勝利','初めて最終ボスを撃破'],
 ['four_frames','四機の英雄','4種類すべての機体でクリア'],
 ['both_modes','双極の勝者','NORMALとCHALLENGEの両方でクリア'],
 ['ten_clears','不屈の挑戦者','累計10回クリア'],
 ['dual_fusion','融合の極致','1プレイで属性融合を2回完成してクリア'],
 ['fusion_scholar','属性の探究者','異なる属性融合を10種類使ってクリア'],
 ['evolution_master','究極の進化','1プレイで進化合成を2件以上完成してクリア'],
 ['endless_clear','終わりなき英雄','ENDLESSで最終ボスを再撃破'],
 ['challenge_two','試練の征服者','制約を2つ適用してクリア'],
 ['challenge_three','ANKIN MASTER','制約を3つ適用してクリア']
];
function earned(record){
 const clears=record.clears||[],ships=new Set(clears.map(c=>c.ship).filter(Boolean)),
  modes=new Set(clears.map(c=>c.mode)),combos=new Set(clears.flatMap(c=>c.fusionIds||[]));
 return {first_clear:clears.length>0,four_frames:SHIPS.every(x=>ships.has(x)),
  both_modes:modes.has('normal')&&modes.has('challenge'),ten_clears:clears.length>=10,
  dual_fusion:clears.some(c=>c.fusionIds.length>=2),fusion_scholar:combos.size>=10,
  evolution_master:clears.some(c=>c.evolutionIds.length>=2),
  endless_clear:clears.some(c=>c.endless),challenge_two:clears.some(c=>c.challenges.length>=2),
  challenge_three:clears.some(c=>c.challenges.length>=3)};
}
function sanitize(payload){
 if(!payload||typeof payload!=='object'||payload.format!=='ankin-drift-archive'||payload.schemaVersion!==1)throw Error('非対応のセーブ形式です');
 if(!payload.record||typeof payload.record!=='object'||Array.isArray(payload.record))throw Error('プレイ記録が不正です');
 const r=recordOf(payload.record),previous=object(payload.awards),awards={},checks=earned(r);
 for(const [id] of DEFINITIONS)if(checks[id])awards[id]=safeDate(previous[id]||payload.updatedAt);
 return {format:'ankin-drift-archive',schemaVersion:1,updatedAt:safeDate(payload.updatedAt),record:r,awards};
}
function parse(raw){if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('ファイルサイズが大きすぎます（最大1MB）');return sanitize(JSON.parse(raw));}
function legacyRead(){
 let old=null;try{old=JSON.parse(root.localStorage.getItem(OLD)||'null')}catch{}
 if(old&&typeof old==='object')return recordOf(old);
 for(const key of LEGACY){try{const x=JSON.parse(root.localStorage.getItem(key)||'null');if(x&&typeof x==='object')return recordOf(x)}catch{}}
 return recordOf({});
}
let snapshot=null,problem='',modified=false;
function store(candidate){
 const raw=JSON.stringify(candidate);
 if(raw.length>MAX_BYTES)throw Error('保存領域の上限です。DATAからバックアップを取得してください');
 root.localStorage.setItem(KEY,raw);snapshot=candidate;problem='';modified=true;return true;
}
function start(){
 try{
  const raw=root.localStorage.getItem(KEY);
  if(raw){snapshot=parse(raw);problem='';return snapshot}
  const record=legacyRead();const now=new Date().toISOString();
  const candidate=sanitize({format:'ankin-drift-archive',schemaVersion:1,updatedAt:now,record});
  snapshot=candidate;
  try{store(candidate)}catch(e){problem='保存不可：'+e.message}
  return snapshot;
 }catch(e){
  problem='セーブ保護モード：'+e.message;
  snapshot=sanitize({format:'ankin-drift-archive',schemaVersion:1,updatedAt:new Date().toISOString(),record:legacyRead()});
  return snapshot;
 }
}
function current(){return snapshot||start()}
function read(){return structuredClone(current().record)}
function write(record){
 if(problem.startsWith('セーブ保護モード'))return false;
 try{
  const now=new Date().toISOString(),r=recordOf(record),checks=earned(r),awards={...current().awards};
  for(const [id] of DEFINITIONS)if(checks[id]&&!awards[id])awards[id]=now;
  store({format:'ankin-drift-archive',schemaVersion:1,updatedAt:now,record:r,awards});
  return true;
 }catch(e){problem='保存失敗：'+e.message;return false}
}
function exported(){return JSON.stringify(current(),null,2)}
function preview(raw){const x=parse(raw);return {clears:x.record.clears.length,runs:x.record.runs.length,awards:Object.keys(x.awards).length,updatedAt:x.updatedAt,data:x}}
function mergeRecords(a,b,type){
 const map=new Map();
 for(const x of [...a,...b]){if(!map.has(x.id))map.set(x.id,x)}
 return [...map.values()].sort((x,y)=>Date.parse(y.date)-Date.parse(x.date)).slice(0,type==='clears'?MAX_CLEARS:MAX_RUNS);
}
function restore(raw,mode='merge'){
 const imported=parse(raw),before=current();
 if(!['merge','replace'].includes(mode))throw Error('復元形式が不正です');
 const record=mode==='replace'?imported.record:{
  damage:Math.max(before.record.damage,imported.record.damage),
  time:Math.max(before.record.time,imported.record.time),level:Math.max(before.record.level,imported.record.level),
  runs:mergeRecords(before.record.runs,imported.record.runs,'runs'),
  clears:mergeRecords(before.record.clears,imported.record.clears,'clears')
 };
 const now=new Date().toISOString(),checks=earned(record),awards=mode==='replace'?{...imported.awards}:{...before.awards,...imported.awards};
 for(const [id] of DEFINITIONS)if(checks[id]&&!awards[id])awards[id]=now;
 // Keep a copy of the original current save in the older key only if it was originally there.
 // Commit only after JSON validation and all merge operations succeeded.
 store({format:'ankin-drift-archive',schemaVersion:1,updatedAt:now,record,awards});
 return current();
}
root.AnkinArchive={key:KEY,definitions:DEFINITIONS,start,read,write,earned,status:()=>problem,exported,preview,restore,current,wasModified:()=>modified};
})(globalThis);
