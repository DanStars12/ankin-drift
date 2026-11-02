import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
import {summarizeRuns,runsToCsv,summaryToCsv} from '../scripts/balance-report.mjs';

const ships=['shot','laser','charge','drill','dog'];
const seconds=Number(process.env.ANKIN_AI_SECONDS||14),seeds=Number(process.env.ANKIN_AI_SEEDS||1);
const policy=process.env.ANKIN_AI_POLICY||'tactical';
const fusionPolicy=process.env.ANKIN_FUSION_POLICY||'always';
const fullMode=process.env.ANKIN_BALANCE_FULL||'0';
if(!['0','1','15','30','both'].includes(fullMode))throw Error('Invalid ANKIN_BALANCE_FULL');
if(!['always','adaptive','never'].includes(fusionPolicy))throw Error('Invalid ANKIN_FUSION_POLICY');
if(!['tactical','legacy'].includes(policy))throw Error('Invalid ANKIN_AI_POLICY');
if(!Number.isFinite(seconds)||seconds<1||seconds>120||!Number.isInteger(seeds)||seeds<1||seeds>20)throw Error('Invalid ANKIN_AI_SECONDS or ANKIN_AI_SEEDS');

async function setup(page){
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.route('**/ankin-drift/',async route=>{
  const r=await route.fetch(),html=await r.text();
  expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  await route.fulfill({response:r,body:html.replace(BALANCE_HARNESS_ANCHOR,
   BALANCE_HARNESS+'\n'+BALANCE_AI_HARNESS+'\n'+BALANCE_HARNESS_ANCHOR)});
 });
 await page.goto('./');
 return errors;
}
async function exportAI(project,scenario,rows){
 const dir='artifacts/balance-lab';await mkdir(dir,{recursive:true});
 const base=dir+'/'+project+'-'+scenario,summary=summarizeRuns(rows);
 await Promise.all([
  writeFile(base+'.json',JSON.stringify({schema:'ankin-balance-v1',mode:'ai',scenario,project,rows,summary},null,2)+'\n'),
  writeFile(base+'.csv',runsToCsv(rows)),
  writeFile(base+'-summary.csv',summaryToCsv(summary))
 ]);
 console.log('ANKIN_AI_'+scenario.toUpperCase().replaceAll('-','_')+'='+JSON.stringify({project,summary}));
 return summary;
}
for(const scenario of ['live-pack','live-boss']){
 test('AI survival: '+scenario+' real enemy attacks, five ship styles and deterministic reports',async({page},testInfo)=>{
  test.setTimeout(180_000);const errors=await setup(page);
  const storageBefore=await page.evaluate(()=>JSON.stringify({...localStorage})),rows=[];
  const profiles=await page.evaluate(()=>window.__ankinBalanceAI.inspect());
  expect(profiles.ships).toEqual(ships);
  expect(new Set(Object.values(profiles.profiles).map(p=>p.range)).size).toBe(5);
  for(let seed=1;seed<=seeds;seed++)for(const ship of ships){
   const args={ship,seed,phase:10,scenario,build:'representative',seconds,policy};
   const result=await page.evaluate(arg=>window.__ankinBalanceAI.runEncounter(arg),args);
   expect(result.schema).toBe('ankin-balance-v1');
   expect(result.ship).toBe(ship);
   expect(result.mode).toBe('ai');
   expect(result.abilityPolicy).toBe(policy);
   expect(result.dashReasons).toBeDefined();
   expect(result.novaReasons).toBeDefined();
   expect(result.dashReadySeconds).toBeGreaterThanOrEqual(0);
   expect(result.novaReadySeconds).toBeGreaterThanOrEqual(0);
   expect(result.aiMoves).toBeGreaterThan(0);
   expect(result.secondsPlanned).toBe(seconds);
   expect(result.duration).toBeGreaterThan(0);
   expect(result.duration).toBeLessThanOrEqual(seconds+.05);
   expect(result.damage).toBeGreaterThanOrEqual(0);
   expect(result.dps).toBeCloseTo(result.damage/result.duration,2);
   expect(result.playerHp).toBeGreaterThanOrEqual(0);
   expect(typeof result.alive).toBe('boolean');
   expect(typeof result.won).toBe('boolean');
   if(result.won){expect(result.timeToWin).toBeGreaterThan(0);expect(result.timeToWin).toBeCloseTo(result.duration,2);}else expect(result.timeToWin).toBeNull();
   expect(result.cleared).toBe(false);
   expect(result.buckets.reduce((a,b)=>a+b.damage,0)).toBeCloseTo(result.damage,2);
   expect(result.hits).toBeGreaterThanOrEqual(0);
   expect(Object.values(result.damageBySource).reduce((a,b)=>a+b,0)).toBeCloseTo(result.damage,2);
   rows.push(result);
  }
  const replay=await page.evaluate(arg=>window.__ankinBalanceAI.runEncounter(arg),
   {ship:'shot',seed:1,phase:10,scenario,build:'representative',seconds,policy});
  expect(replay).toEqual(rows[0]);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(storageBefore);
  expect(errors).toEqual([]);
  const summary=await exportAI(testInfo.project.name,scenario,rows);
  expect(summary).toHaveLength(5);
  for(const row of summary){
   expect(row.survivalRate).toBeGreaterThanOrEqual(0);
   expect(row.survivalRate).toBeLessThanOrEqual(100);
   expect(row.encounterWinRate).toBeGreaterThanOrEqual(0);
   expect(row.encounterWinRate).toBeLessThanOrEqual(100);
   expect(row.clearRate).toBeNull();
  }
 });
}
test('consolidated magma relocates with new spawns; ordinary magma remains separate',async({page})=>{
 const errors=await setup(page),prior=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const {constrained,normal}=await page.evaluate(()=>({
  constrained:window.__ankinBalanceAI.probeMagma({constrained:true}),
  normal:window.__ankinBalanceAI.probeMagma({constrained:false})
 }));
 expect(constrained.count).toBe(1);
 expect(constrained.stacks).toBe(2);
 expect(constrained.latest.x).toBeGreaterThan(constrained.original.x);
 expect(constrained.latest.y).toBeGreaterThan(constrained.original.y);
 expect(constrained.damage).toBeGreaterThan(0);
 expect(normal.count).toBe(2);
 expect(normal.original.x).toBeLessThan(normal.latest.x);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(prior);
 expect(errors).toEqual([]);
});
test('short full-run controls keep XP/ability/reward/fusion metrics separate from ordinary saves',async({page})=>{
 test.setTimeout(120_000);
 const errors=await setup(page),prior=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const out=await page.evaluate(()=>{
  const full=window.__ankinBalanceAI.runFull({ship:'laser',seed:22,seconds:72,preview:true,fusionPolicy:'never'});
  return full;
 });
 expect(out.preview).toBe(true);
 expect(out.fusionPolicy).toBe('never');
 expect(out.elementFusions).toBe(0);
 expect(out.fusionAudit.accepted).toBe(0);
 expect(out.fusionAudit.offers).toBeGreaterThanOrEqual(out.fusionAudit.declined);
 expect(out.xpSeekSeconds).toBeGreaterThanOrEqual(0);
 expect(out.pickedExp).toBeGreaterThanOrEqual(0);
 expect(out.vacuumExp).toBeGreaterThanOrEqual(0);
 expect(out.rewardAudit.choices).toBeGreaterThanOrEqual(out.rewardAudit.primary);
 expect(out.rewardAudit.choices).toBeGreaterThanOrEqual(out.rewardAudit.survival);
 expect(out.weaponState.laserCount).toBeGreaterThanOrEqual(2);
 expect(Array.isArray(out.novaContexts)).toBe(true);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(prior);
 expect(errors).toEqual([]);
});
test('v13.33 tactical ability probes keep distant NOVAs charged and reject unsafe dash spam',async({page})=>{
 const errors=await setup(page);
 const cases=await page.evaluate(()=>{
  const common={hpRatio:1,energy:100,novaCooldown:0,dashLeft:0,dashTime:0,iframes:0,
   targetDist:400,bossDist:900,novaRadius:215,laserReach:730,drillOverdrive:0,
   drillPlasmaRatio:.5,enemiesInNova:0,enemiesNear:0,enemiesForward:0,
   threats:0,imminent:0,safeApproach:true};
  return ['shot','laser','charge','drill','dog'].map(ship=>({ship,
   far:window.__ankinBalanceAI.decide({...common,ship}),
   near:window.__ankinBalanceAI.decide({...common,ship,bossDist:160}),
   emergency:window.__ankinBalanceAI.decide({...common,ship,imminent:2})}));
 });
 expect(cases).toHaveLength(5);
 for(const c of cases){expect(c.far.novaReason).toBeNull();expect(c.near.novaReason).toBeTruthy();
  expect(c.emergency.dashReason).toBe('emergency-evade');}
 expect(errors).toEqual([]);
});
test('v13.33 actual ready-NOVA uses real combat, checks tactical versus legacy consumption',async({page})=>{
 const errors=await setup(page),prior=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const cases=await page.evaluate(()=>{
  const out=[];
  for(const ship of ['shot','laser','charge','drill','dog']){
   const args={ship,seed:17,phase:10,scenario:'live-boss',build:'representative',
    seconds:.35,initialNovaReady:true};
   out.push({ship,
    tactical:window.__ankinBalanceAI.runEncounter({...args,policy:'tactical'}),
    legacy:window.__ankinBalanceAI.runEncounter({...args,policy:'legacy'})});
  }
  return out;
 });
 for(const {ship,tactical,legacy} of cases){
  expect(tactical.ship).toBe(ship);expect(legacy.ship).toBe(ship);
  expect(legacy.novaCount).toBeGreaterThanOrEqual(1); // the legacy condition: boss exists
  expect(tactical.novaCount).toBeLessThanOrEqual(1);
  expect(Object.values(tactical.novaReasons).reduce((a,b)=>a+b,0)).toBe(tactical.novaCount);
  expect(Object.values(legacy.novaReasons).reduce((a,b)=>a+b,0)).toBe(legacy.novaCount);
  expect(tactical.initialNovaReady).toBe(true);
   if(ship==='shot')expect(tactical.novaReasons['legacy-nova']||0).toBe(0);
 }
 // SHOT uses target-gated tactical NOVA and baseline dash; DRILL retains its baseline abilities.
 // A 0.35s encounter must not assume that one policy necessarily fires fewer NOVAs.
 for(const c of cases)expect(c.tactical.novaCount).toBeLessThanOrEqual(c.legacy.novaCount);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(prior);
 expect(errors).toEqual([]);
});
test('v13.33 laser starts with 106 HP and hybrid fallback preserves shot/drill baseline',async({page})=>{
 const errors=await setup(page),initial=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const result=await page.evaluate(()=>{
  const laser=window.__ankinBalanceAI.runEncounter({ship:'laser',seed:18,scenario:'live-pack',build:'base',seconds:2});
  const out={laserHp:laser.maxHp,ships:[]};
  for(const ship of ['shot','drill']){
   const args={ship,seed:9,scenario:'live-pack',build:'representative',seconds:4};
   const legacy=window.__ankinBalanceAI.runEncounter({...args,policy:'legacy'});
   const hybrid=window.__ankinBalanceAI.runEncounter({...args,policy:'tactical'});
   out.ships.push({ship,legacy:{damage:legacy.damage,dash:legacy.dashCount,nova:legacy.novaCount},
    hybrid:{damage:hybrid.damage,dash:hybrid.dashCount,nova:hybrid.novaCount}});
  }
  return out;
 });
 expect(result.laserHp).toBe(106);
 for(const r of result.ships)expect(r.hybrid).toEqual(r.legacy);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(initial);
 expect(errors).toEqual([]);
});
test('AI survival: time-specific harder packs, real enemy bullets and crash-safe sandbox restoration',async({page})=>{
 const errors=await setup(page);
 const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const rows=await page.evaluate(()=>[0,10,20].map(phase=>
  window.__ankinBalanceAI.runEncounter({ship:'shot',seed:6,phase,scenario:'live-pack',build:'base',seconds:14})));
 expect(rows.map(x=>x.phaseMinutes)).toEqual([0,10,20]);
 expect(rows.some(r=>r.hits>0||r.damageTaken>0)).toBe(true);
 expect(rows.some(r=>r.dashCount>0)).toBe(true);
 const invalid=await page.evaluate(()=>{
  try{window.__ankinBalanceAI.runEncounter({ship:'bad'});return false}catch{return true}
 });
 expect(invalid).toBe(true);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(storage);
 expect(errors).toEqual([]);
});
test('AI survival: full-run mode is only on explicit opt-in, and never counts short boss victories as 30-minute clears',async({page})=>{
 const errors=await setup(page);
 const r=await page.evaluate(()=>window.__ankinBalanceAI.runEncounter({
  ship:'shot',seed:9,phase:0,scenario:'live-boss',build:'representative',seconds:5}));
 expect(r.fullRun).toBeUndefined();
 expect(r.cleared).toBe(false);
 expect(typeof r.won).toBe('boolean');
 expect(errors).toEqual([]);
});
test('real scheduler preview exercises enemies and automatic progression without claiming full clear rate',async({page})=>{
 test.setTimeout(120_000);
 const errors=await setup(page),saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const r=await page.evaluate(()=>window.__ankinBalanceAI.runFull({ship:'shot',seed:19,seconds:72,preview:true}));
 expect(r.preview).toBe(true);expect(r.fullRun).toBe(false);
 expect(r.simulationTime).toBeGreaterThan(0);
 expect(r.simulationTime).toBeLessThanOrEqual(72.1);
 expect(r.clearCount).toBe(0);
 expect(r.reachedFinalBoss).toBe(false);
 expect(r.stopReason.startsWith('unhandled-menu')).toBe(false);
 expect(r.mode).toBe('ai');
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(saved);
 expect(errors).toEqual([]);
});
test('actual NORMAL and CHALLENGE timelines retain distinct bosses, schedules and rewards',async({page})=>{
 test.setTimeout(120_000);
 const errors=await setup(page),saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const rows=await page.evaluate(()=>['normal','challenge'].map(gameMode=>
  window.__ankinBalanceAI.runFull({ship:'dog',gameMode,seed:31,seconds:72,preview:true,fusionPolicy:'never'})));
 const [normal,challenge]=rows;
 expect(normal.gameMode).toBe('normal');
 expect(challenge.gameMode).toBe('challenge');
 expect(normal.scenario).toBe('full-30m');
 expect(challenge.scenario).toBe('full-15m');
 expect(normal.finalBossAt).toBe(1800);
 expect(challenge.finalBossAt).toBe(900);
 expect(normal.startSchedule.nextUltimateAt).toBe(1800);
 expect(challenge.startSchedule.nextUltimateAt).toBe(900);
 expect(normal.startSchedule.firstBossAt).toBe(60);
 expect(challenge.startSchedule.firstBossAt).toBe(60);
 expect(normal.startSchedule.nextBossAfterFirst).toBe(150);
 expect(challenge.startSchedule.nextBossAfterFirst).toBe(135);
 expect(normal.startSchedule.dogChickenAt).toBe(900);
 expect(challenge.startSchedule.dogChickenAt).toBe(480);
 expect(normal.startSchedule.firstRaidAt).toBe(105);
 expect(challenge.startSchedule.firstRaidAt).toBe(105);
 for(const r of rows){
  expect(r.simulationTime).toBeGreaterThan(0);
  expect(r.startSchedule.firstRelicAt).toBeGreaterThanOrEqual(125);
  expect(r.startSchedule.firstRelicAt).toBeLessThanOrEqual(205);
  expect(r.preview).toBe(true);
  expect(r.fullRun).toBe(false);
  expect(r.finalBossSpawned).toBe(false);
  expect(r.reachedFinalBoss).toBe(false);
  expect(r.clearCount).toBe(0);
  expect(r.rewardAudit.choices).toBeGreaterThanOrEqual(0);
  expect(r.elementFusions).toBe(0);
  expect(r.fusionPolicy).toBe('never');
 }
 const invalid=await page.evaluate(()=>{
  for(const args of [{gameMode:'challenge',seconds:600},{gameMode:'normal',seconds:960},
   {gameMode:'unknown',preview:true,seconds:72}]){
   try{window.__ankinBalanceAI.runFull(args);return false}catch{}
  }
  return true;
 });
 expect(invalid).toBe(true);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(saved);
 expect(errors).toEqual([]);
});
for(const [gameMode,marker,planned] of [['challenge','15',960],['normal','30',1860]]){
 test('optional real '+marker+'-minute '+gameMode+' run, 5 ships with live AI and no persistent saves',async({page},testInfo)=>{
  test.skip(![marker,'both',...(marker==='30'?['1']:[])].includes(fullMode),
   'Explicit full-'+marker+'m run required; mode results are never pooled');
  test.setTimeout(1_200_000);
  const errors=await setup(page);
  const prior=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const out=[];
  for(let seed=1;seed<=seeds;seed++)for(const ship of ships){
   const row=await page.evaluate(x=>window.__ankinBalanceAI.runFull(x),
    {ship,seed,gameMode,seconds:planned,policy,fusionPolicy});
   expect(row.fullRun).toBe(true);
   expect(row.preview).toBe(false);
   expect(row.gameMode).toBe(gameMode);
   expect(row.scenario).toBe('full-'+marker+'m');
   expect(row.finalBossAt).toBe(marker==='15'?900:1800);
   expect(row.startSchedule.nextUltimateAt).toBe(row.finalBossAt);
   expect(row.startSchedule.firstBossAt).toBe(60);
   expect(row.startSchedule.nextBossAfterFirst).toBe(marker==='15'?135:150);
   expect(row.simulationTime).toBeGreaterThan(0);
   expect(['dead','clear','time-limit'].includes(row.stopReason),JSON.stringify(row)).toBe(true);
   expect(row.cleared).toBe(row.clearCount>0);
   expect(row.elementFusions).toBeGreaterThanOrEqual(0);
   expect(row.elementFusions).toBeLessThanOrEqual(2);
   expect(row.fusionAudit.accepted).toBe(row.elementFusions);
   expect(row.rewardAudit.choices).toBeGreaterThanOrEqual(row.rewardAudit.primary);
   expect(row.xpOnField).toBeGreaterThanOrEqual(0);
   if(row.cleared)expect(row.finalBossSpawned).toBe(true);
   if(row.finalBossSpawned)expect(row.finalBossSpawnTime).toBeGreaterThanOrEqual(row.finalBossAt);
   out.push(row);
  }
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(prior);
  expect(errors).toEqual([]);
  await exportAI(testInfo.project.name,'full-'+marker+'m',out);
 });
}
