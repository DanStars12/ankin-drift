import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
import {summarizeRuns,runsToCsv,summaryToCsv} from '../scripts/balance-report.mjs';

const ships=['shot','laser','charge','drill','dog'];
const seconds=Number(process.env.ANKIN_AI_SECONDS||14),seeds=Number(process.env.ANKIN_AI_SEEDS||1);
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
   const args={ship,seed,phase:10,scenario,build:'representative',seconds};
   const result=await page.evaluate(arg=>window.__ankinBalanceAI.runEncounter(arg),args);
   expect(result.schema).toBe('ankin-balance-v1');
   expect(result.ship).toBe(ship);
   expect(result.mode).toBe('ai');
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
   {ship:'shot',seed:1,phase:10,scenario,build:'representative',seconds});
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
test('optional true 30-minute run using real scheduler and automatic in-game card choices',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_BALANCE_FULL!=='1','Full 30-minute simulation only via explicitly selected manual workflow');
 test.setTimeout(900_000);
 const errors=await setup(page);
 const prior=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const out=[];
 for(let seed=1;seed<=seeds;seed++)for(const ship of ships){
  const row=await page.evaluate(x=>window.__ankinBalanceAI.runFull(x),{ship,seed,seconds:1860});
  expect(row.fullRun).toBe(true);
  expect(row.simulationTime).toBeGreaterThan(0);
  expect(['dead','clear','time-limit'].some(x=>row.stopReason===x),JSON.stringify(row)).toBe(true);
  expect(row.cleared).toBe(row.clearCount>0);
  expect(row.elementFusions).toBeGreaterThanOrEqual(0);
  expect(row.elementFusions).toBeLessThanOrEqual(2);
  if(row.cleared)expect(row.reachedFinalBoss).toBe(true);
  out.push(row);
 }
 expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(prior);
 expect(errors).toEqual([]);
 await exportAI(testInfo.project.name,'full-30m',out);
});
