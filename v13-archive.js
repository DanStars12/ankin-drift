/* ANKIN DRIFT v13.1 — portable achievement archive.
   Save schema is independent of app version. Schema v1 and pre-v13 saves remain readable.
   Existing browser data is never deleted. */
(function(root){
'use strict';
const KEY='ankin_drift_pilot_archive';
const OLD='ankin_drift_v96_damage_records';
const LEGACY=['ankin_drift_v71_records','ankin_drift_v7_records','ankin_drift_v6_records','ankin_drift_v5_records'];
const MAX_BYTES=1024*1024,MAX_CLEARS=1000,MAX_RUNS=200,SCHEMA=2;
const SHIPS=['shot','laser','charge','drill','dog'],MODES=['normal','challenge'];
const finite=(v,max=1e15)=>Number.isFinite(+v)?Math.min(max,Math.max(0,+v)):0;
const safeDate=v=>typeof v==='string'&&v.length<=36?v:new Date(0).toISOString();
const text=(v,max=110)=>typeof v==='string'?v.slice(0,max):'';
const array=v=>Array.isArray(v)?v:[];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const unique=(a,allowed)=>[...new Set(array(a).filter(x=>allowed.includes(x)))];
const DEFINITIONS=[
 ['new_pilot','新人パイロット','初めて出撃する','bronze',1],
 ['rookie_level','基礎訓練修了','1回のプレイでLv10に到達','bronze',10],
 ['hundred_kills','百機撃墜','1回のプレイで敵を100体撃破','bronze',100],
 ['survive_five','最初の5分','1回のプレイで5分間生存','bronze',300],
 ['three_clears','次なる挑戦者','累計3回クリア','silver',3],
 ['veteran_level','熟練パイロット','1回のプレイでLv50に到達','silver',50],
 ['thousand_kills','千機を越えて','1回のプレイで敵を1000体撃破','silver',1000],
 ['survive_fifteen','長き戦い','1回のプレイで15分間生存','silver',900],
 ['challenge_clear','試練への第一歩','CHALLENGEモードをクリア','silver',1],
 ['four_frames','四機の英雄','異なる4種類の機体でクリア','gold',4],
 ['five_frames','五機の英雄','5種類すべての機体でクリア','rainbow',5],
 ['dog_clear','わんこの新星','ドッグ型β版で初クリア','gold',1],
 ['both_modes','双極の勝者','NORMALとCHALLENGEの両方でクリア','gold',2],
 ['ten_clears','不屈の挑戦者','累計10回クリア','gold',10],
 ['dual_fusion','融合の極致','1プレイで属性融合を2回完成してクリア','gold',1],
 ['evolution_master','究極の進化','1プレイで進化合成を2件以上完成してクリア','gold',1],
 ['challenge_two','試練の征服者','追加制約を2つ適用してクリア','gold',1],
 ['first_clear','初めての勝利','初めて最終ボスを撃破','rainbow',1],
 ['fusion_scholar','属性の探究者','異なる属性融合を10種類使ってクリア','rainbow',10],
 ['endless_clear','終わりなき英雄','ENDLESSで最終ボスを再撃破','rainbow',1],
 ['challenge_three','ANKIN MASTER','追加制約を3つ適用してクリア','rainbow',1],
 ['thirty_clears','歴戦の英雄','累計30回クリア','rainbow',30],
 ['pilot_sense','パイロットセンス','全プレイ累計で1億ダメージを与える','rainbow',100000000]
];
const definitionById=new Map(DEFINITIONS.map(d=>[d[0],d]));
// Personal ending is optional: v12/v13 records remain valid without it.
// Whitelist fields to prevent untrusted JSON import from injecting markup or huge objects.
function stripEnding(v){
 const o=object(v);if(!Object.keys(o).length)return null;
 const metrics=object(o.metrics),stats={};
 for(const [k,value] of Object.entries(object(metrics.damageStats)).slice(0,20))
  if(/^[a-z]{2,18}$/.test(k))stats[k]=finite(value);
 const output={
  version:finite(o.version,10),styleId:text(o.styleId,40),styleName:text(o.styleName,90),
  title:text(o.title,90),story:text(o.story,550),summary:text(o.summary,200),
  why:array(o.why).map(x=>text(x,95)).slice(0,8),
  primarySource:text(o.primarySource,24),primaryPercent:finite(o.primaryPercent,100),
  finisherSource:text(o.finisherSource,24),elementLabel:text(o.elementLabel,100),
  frameName:text(o.frameName,48),
  metrics:{kills:finite(metrics.kills,1e9),remainingHpPct:finite(metrics.remainingHpPct,100),
   dashCount:finite(metrics.dashCount,1e8),novaCount:finite(metrics.novaCount,1e8),
   hits:finite(metrics.hits,1e8),revives:finite(metrics.revives,1e8),
   damageTaken:finite(metrics.damageTaken),damageStats:stats},
  evolutionNames:array(o.evolutionNames).map(x=>text(x,90)).slice(0,8),
  relicNames:array(o.relicNames).map(x=>text(x,90)).slice(0,8),
  featuredSkills:array(o.featuredSkills).map(x=>text(x,90)).slice(0,6),
  fusionIds:array(o.fusionIds).map(x=>text(x,40)).slice(0,2)
 };
 return output;
}
function stripClear(v,i){
 const o=object(v),meta=object(o.meta);
 return {id:text(o.id||('legacy-clear-'+i+'-'+text(o.date,32)),90),
  mode:MODES.includes(o.mode)?o.mode:'normal',time:finite(o.time,1e8),
  level:finite(o.level,1e7),damage:finite(o.damage),date:safeDate(o.date),endless:!!o.endless,
  ship:SHIPS.includes(o.ship)?o.ship:null,title:text(o.title,90),
  subtitle:text(o.subtitle,160),rank:text(o.rank,32),
  challenges:unique(o.challenges,['fragile','onslaught','armored','swift','vicious','ironclad','ballistic','famine','novaTax','dashTax','repairTax']).slice(0,11),
  fusionIds:array(o.fusionIds).map(x=>text(x,40)).slice(0,2),
  evolutionIds:array(o.evolutionIds).map(x=>text(x,70)).slice(0,30),
  finalSource:text(o.finalSource,40),ending:stripEnding(o.ending),
  meta:{...('victories' in meta?{victories:finite(meta.victories,1e7)}:{})}};
}
function stripRun(v,i){
 const o=object(v),stats=object(o.stats),safeStats={};
 for(const [key,value] of Object.entries(stats).slice(0,30))
  if(/^[a-zA-Z0-9_-]{1,30}$/.test(key))safeStats[key]=finite(value);
 return {id:text(o.id||('legacy-run-'+i+'-'+text(o.date,32)),90),
  outcome:text(o.outcome,25),gameMode:MODES.includes(o.gameMode)?o.gameMode:'normal',
  damage:finite(o.damage),bossDamage:finite(o.bossDamage),
  ship:SHIPS.includes(o.ship)?o.ship:null,time:finite(o.time,1e8),
  level:finite(o.level,1e7),kills:finite(o.kills,1e9),date:safeDate(o.date),
  stats:safeStats,build:o.build?{specials:array(o.build.specials).map(x=>text(x,100)).slice(0,35)}:{}};
}
function recordOf(r){
 const o=object(r);
 return {damage:finite(o.damage),time:finite(o.time,1e8),level:finite(o.level,1e7),
  runs:array(o.runs).slice(0,MAX_RUNS).map(stripRun),
  clears:array(o.clears).slice(0,MAX_CLEARS).map(stripClear)};
}
function runIdentity(c){const match=/^(run-.+)-clear-\d+$/.exec(c.id);return match?match[1]:c.id;}
function emptyProfile(){return {started:false,totalClears:0,legacyDamage:0,damageByRun:{},
 maxLevel:0,maxKills:0,maxTime:0,shipsCleared:[],modesCleared:[],fusionsDiscovered:[],
 dualFusion:false,evolutionMaster:false,endlessClear:false,bestChallenges:0};}
function fromOldRecord(r){
 const p=emptyProfile(),ids=new Set();
 p.started=r.clears.length>0||r.runs.length>0;
 p.totalClears=r.clears.length;p.maxLevel=r.level;p.maxTime=r.time;
 for(const run of r.runs){p.maxKills=Math.max(p.maxKills,run.kills);ids.add(run.id);
  p.damageByRun[run.id]=Math.max(p.damageByRun[run.id]||0,run.damage)}
 for(const c of r.clears){const id=runIdentity(c);ids.add(id);
  p.damageByRun[id]=Math.max(p.damageByRun[id]||0,c.damage)}
 // Old high-water damage is a maximum, not a lifetime total.
 // If no historical runs survive, it is only a conservative lower bound.
 if(!ids.size)p.legacyDamage=r.damage;
 reconcileProfile(p,r.clears);
 return p;
}
function profileOf(raw,r,legacy=false){
 if(legacy)return fromOldRecord(r);
 const o=object(raw),p=emptyProfile(),dict=object(o.damageByRun);
 p.started=o.started===true||r.clears.length>0||r.runs.length>0;
 p.totalClears=finite(o.totalClears,1e10);
 p.legacyDamage=finite(o.legacyDamage);
 for(const [id,value] of Object.entries(dict).slice(-1200))
  if(/^[a-zA-Z0-9_-]{1,90}$/.test(id))p.damageByRun[id]=finite(value);
 p.maxLevel=finite(o.maxLevel,1e7);p.maxKills=finite(o.maxKills,1e9);p.maxTime=finite(o.maxTime,1e8);
 p.shipsCleared=unique(o.shipsCleared,SHIPS);
 p.modesCleared=unique(o.modesCleared,MODES);
 p.fusionsDiscovered=unique(o.fusionsDiscovered,Array.from({length:0})).concat(
  array(o.fusionsDiscovered).filter(x=>typeof x==='string'&&/^(fire|ice|thunder|wind|rock)_(fire|ice|thunder|wind|rock)$/.test(x)).slice(0,20)
 );
 p.fusionsDiscovered=[...new Set(p.fusionsDiscovered)];
 p.dualFusion=!!o.dualFusion;p.evolutionMaster=!!o.evolutionMaster;
 p.endlessClear=!!o.endlessClear;p.bestChallenges=finite(o.bestChallenges,11);
 p.totalClears=Math.max(p.totalClears,r.clears.length);
 p.maxLevel=Math.max(p.maxLevel,r.level);p.maxTime=Math.max(p.maxTime,r.time);
 p.maxKills=Math.max(p.maxKills,...r.runs.map(x=>x.kills),0);
 reconcileProfile(p,r.clears);return p;
}
function reconcileProfile(p,clears){
 p.shipsCleared=[...new Set([...p.shipsCleared,...clears.map(c=>c.ship).filter(x=>SHIPS.includes(x))])];
 p.modesCleared=[...new Set([...p.modesCleared,...clears.map(c=>c.mode)])];
 p.fusionsDiscovered=[...new Set([...p.fusionsDiscovered,...clears.flatMap(c=>c.fusionIds)])].slice(0,20);
 p.dualFusion=p.dualFusion||clears.some(c=>c.fusionIds.length>=2);
 p.evolutionMaster=p.evolutionMaster||clears.some(c=>c.evolutionIds.length>=2);
 p.endlessClear=p.endlessClear||clears.some(c=>c.endless);
 p.bestChallenges=Math.max(p.bestChallenges,...clears.map(c=>c.challenges.length),0);
}
function lifetimeDamage(p){return finite(p.legacyDamage+Object.values(p.damageByRun).reduce((a,b)=>a+b,0));}
function progressValue(id,p){
 switch(id){
 case 'new_pilot':return p.started?1:0;
 case 'rookie_level':case 'veteran_level':return p.maxLevel;
 case 'hundred_kills':case 'thousand_kills':return p.maxKills;
 case 'survive_five':case 'survive_fifteen':return p.maxTime;
 case 'first_clear':case 'three_clears':case 'ten_clears':case 'thirty_clears':return p.totalClears;
 case 'challenge_clear':return p.modesCleared.includes('challenge')?1:0;
 case 'four_frames':case 'five_frames':return p.shipsCleared.length;
  case 'dog_clear':return p.shipsCleared.includes('dog')?1:0;
 case 'both_modes':return p.modesCleared.length;
 case 'fusion_scholar':return p.fusionsDiscovered.length;
 case 'dual_fusion':return p.dualFusion?1:0;
 case 'evolution_master':return p.evolutionMaster?1:0;
 case 'endless_clear':return p.endlessClear?1:0;
 case 'challenge_two':return p.bestChallenges>=2?1:0;
 case 'challenge_three':return p.bestChallenges>=3?1:0;
 case 'pilot_sense':return lifetimeDamage(p);
 default:return 0;
 }
}
function earned(record,profile){
 const r=recordOf(record),p=profile?profileOf(profile,r):fromOldRecord(r);
 const obj={};for(const [id,,, ,goal] of DEFINITIONS)obj[id]=progressValue(id,p)>=goal;
 return obj;
}
function progress(){
 const s=current();
 return DEFINITIONS.map(([id,name,description,tier,target])=>({
  id,name,description,tier,target,current:Math.min(target,progressValue(id,s.profile)),
  raw:progressValue(id,s.profile),unlocked:!!s.awards[id]
 }));
}
function sanitize(payload){
 if(!payload||typeof payload!=='object'||payload.format!=='ankin-drift-archive'||![1,SCHEMA].includes(payload.schemaVersion))throw Error('非対応のセーブ形式です');
 if(!payload.record||typeof payload.record!=='object'||Array.isArray(payload.record))throw Error('プレイ記録が不正です');
 const r=recordOf(payload.record),legacy=payload.schemaVersion===1,p=profileOf(payload.profile,r,legacy);
 const previous=object(payload.awards),awards={},now=safeDate(payload.updatedAt);
 for(const [id,,, ,goal] of DEFINITIONS){
  if(previous[id]||progressValue(id,p)>=goal)awards[id]=safeDate(previous[id]||now);
 }
 return {format:'ankin-drift-archive',schemaVersion:SCHEMA,updatedAt:now,record:r,profile:p,awards};
}
function parse(raw){if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('ファイルサイズが大きすぎます（最大1MB）');return sanitize(JSON.parse(raw));}
function legacyRead(){
 try{const old=JSON.parse(root.localStorage.getItem(OLD)||'null');if(old&&typeof old==='object')return recordOf(old)}catch{}
 for(const key of LEGACY){try{const x=JSON.parse(root.localStorage.getItem(key)||'null');if(x&&typeof x==='object')return recordOf(x)}catch{}}
 return recordOf({});
}
let snapshot=null,problem='',modified=false,unlocks=[];
function store(candidate){
 const raw=JSON.stringify(candidate);if(raw.length>MAX_BYTES)throw Error('保存領域の上限です。DATAからバックアップを取得してください');
 root.localStorage.setItem(KEY,raw);snapshot=candidate;problem='';modified=true;return true;
}
function commit(candidate){
 const previous=current(),fresh=[];
 for(const def of DEFINITIONS)if(candidate.awards[def[0]]&&!previous.awards[def[0]])fresh.push({
  id:def[0],name:def[1],description:def[2],tier:def[3]
 });
 try{store(candidate);unlocks.push(...fresh);return true}
 catch(e){snapshot=candidate;problem='保存失敗：'+e.message;return false}
}
function start(){
 try{
  const raw=root.localStorage.getItem(KEY);
  if(raw){
   const decoded=JSON.parse(raw),migrated=sanitize(decoded);snapshot=migrated;problem='';
   if(decoded.schemaVersion!==SCHEMA){try{store(migrated)}catch(e){problem='保存不可：'+e.message}}
   return snapshot;
  }
  const record=legacyRead(),now=new Date().toISOString();
  const candidate=sanitize({format:'ankin-drift-archive',schemaVersion:1,updatedAt:now,record});
  snapshot=candidate;try{store(candidate)}catch(e){problem='保存不可：'+e.message}
  return snapshot;
 }catch(e){
  problem='セーブ保護モード：'+e.message;
  const record=legacyRead();
  snapshot=sanitize({format:'ankin-drift-archive',schemaVersion:1,updatedAt:new Date().toISOString(),record});
  return snapshot;
 }
}
function current(){return snapshot||start()}
function read(){return structuredClone(current().record)}
function awardsUpdated(candidate){
 // Never mutate the previous snapshot's awards: unlock toasts are diffed across commits.
 candidate.awards={...candidate.awards};
 const now=new Date().toISOString();
 for(const [id,,, ,goal] of DEFINITIONS)if(progressValue(id,candidate.profile)>=goal&&!candidate.awards[id])candidate.awards[id]=now;
 return candidate;
}
function write(record){
 if(problem.startsWith('セーブ保護モード'))return false;
 const prev=current(),r=recordOf(record),p=structuredClone(prev.profile);
 const ids=new Set(prev.record.clears.map(x=>x.id));
 p.totalClears=Math.max(p.totalClears+r.clears.filter(c=>!ids.has(c.id)).length,r.clears.length);
 reconcileProfile(p,r.clears);
 p.maxLevel=Math.max(p.maxLevel,r.level);p.maxTime=Math.max(p.maxTime,r.time);
 p.maxKills=Math.max(p.maxKills,...r.runs.map(x=>x.kills),0);
 return commit(awardsUpdated({...prev,record:r,profile:p,updatedAt:new Date().toISOString()}));
}
function observeRun(id,damage,level=1,kills=0,time=0){
 if(problem.startsWith('セーブ保護モード'))return false;
 const prev=current(),p=structuredClone(prev.profile),key=text(id,90);
 if(!/^[a-zA-Z0-9_-]{1,90}$/.test(key))return false;
 p.started=true;
 p.damageByRun[key]=Math.max(p.damageByRun[key]||0,finite(damage));
 p.maxLevel=Math.max(p.maxLevel,finite(level,1e7));
 p.maxKills=Math.max(p.maxKills,finite(kills,1e9));
 p.maxTime=Math.max(p.maxTime,finite(time,1e8));
 return commit(awardsUpdated({...prev,profile:p,updatedAt:new Date().toISOString()}));
}
function markStarted(){
 if(current().profile.started)return true;
 if(problem.startsWith('セーブ保護モード'))return false;
 const prev=current(),p=structuredClone(prev.profile);p.started=true;
 return commit(awardsUpdated({...prev,profile:p,updatedAt:new Date().toISOString()}));
}
function takeUnlocks(){return unlocks.splice(0)}
function exported(){return JSON.stringify(current(),null,2)}
function preview(raw){const x=parse(raw);return {clears:x.record.clears.length,runs:x.record.runs.length,awards:Object.keys(x.awards).length,updatedAt:x.updatedAt,data:x}}
function mergeRecords(a,b,type){
 const map=new Map();for(const x of [...a,...b])if(!map.has(x.id))map.set(x.id,x);
 return [...map.values()].sort((x,y)=>Date.parse(y.date)-Date.parse(x.date)).slice(0,type==='clears'?MAX_CLEARS:MAX_RUNS);
}
function mergeProfile(a,b,clears){
 const p=emptyProfile();p.started=a.started||b.started;
 p.totalClears=Math.max(a.totalClears,b.totalClears,clears.length);
 p.legacyDamage=Math.max(a.legacyDamage,b.legacyDamage);
 p.damageByRun={...a.damageByRun};
 for(const [id,v] of Object.entries(b.damageByRun))p.damageByRun[id]=Math.max(p.damageByRun[id]||0,v);
 p.maxLevel=Math.max(a.maxLevel,b.maxLevel);p.maxKills=Math.max(a.maxKills,b.maxKills);p.maxTime=Math.max(a.maxTime,b.maxTime);
 p.shipsCleared=[...new Set([...a.shipsCleared,...b.shipsCleared])];
 p.modesCleared=[...new Set([...a.modesCleared,...b.modesCleared])];
 p.fusionsDiscovered=[...new Set([...a.fusionsDiscovered,...b.fusionsDiscovered])].slice(0,20);
 p.dualFusion=a.dualFusion||b.dualFusion;p.evolutionMaster=a.evolutionMaster||b.evolutionMaster;
 p.endlessClear=a.endlessClear||b.endlessClear;p.bestChallenges=Math.max(a.bestChallenges,b.bestChallenges);
 reconcileProfile(p,clears);return p;
}
function restore(raw,mode='merge'){
 const imported=parse(raw),before=current();
 if(!['merge','replace'].includes(mode))throw Error('復元形式が不正です');
 const record=mode==='replace'?imported.record:{
  damage:Math.max(before.record.damage,imported.record.damage),
  time:Math.max(before.record.time,imported.record.time),level:Math.max(before.record.level,imported.record.level),
  runs:mergeRecords(before.record.runs,imported.record.runs,'runs'),
  clears:mergeRecords(before.record.clears,imported.record.clears,'clears')};
 const profile=mode==='replace'?imported.profile:mergeProfile(before.profile,imported.profile,record.clears);
 const awards=mode==='replace'?{...imported.awards}:{...before.awards,...imported.awards};
 const candidate=awardsUpdated({format:'ankin-drift-archive',schemaVersion:SCHEMA,updatedAt:new Date().toISOString(),record,profile,awards});
 // Restoration deliberately does not display "just unlocked" toasts for historical data.
 store(candidate);unlocks=[];return current();
}
root.AnkinArchive={key:KEY,definitions:DEFINITIONS,start,read,write,observeRun,markStarted,
 earned,progress,lifetimeDamage:()=>lifetimeDamage(current().profile),takeUnlocks,
 status:()=>problem,exported,preview,restore,current,wasModified:()=>modified};
})(globalThis);