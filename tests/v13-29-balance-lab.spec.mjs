import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {BALANCE_HARNESS,BALANCE_HARNESS_ANCHOR} from '../scripts/balance-harness.mjs';
import {summarizeRuns,runsToCsv,summaryToCsv} from '../scripts/balance-report.mjs';

const ships=['shot','laser','charge','drill','dog'];
const seeds=Math.min(20,Math.max(1,Number(process.env.ANKIN_BALANCE_SEEDS||(process.env.CI?'1':'3'))));
const duration=Number(process.env.ANKIN_BALANCE_DURATION||10);
if(!Number.isInteger(seeds)||!Number.isFinite(duration)||duration<=0||duration>60)throw Error('Invalid balance lab inputs');

async function start(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  await route.fulfill({response,body:html.replace(BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS+'\n'+BALANCE_HARNESS_ANCHOR)});
 });
 await page.goto('./');
 return errors;
}
async function exportReport(project,scenario,runs){
 const dir='artifacts/balance-lab';
 await mkdir(dir,{recursive:true});
 const base=dir+'/'+project+'-'+scenario,summary=summarizeRuns(runs);
 await Promise.all([
  writeFile(base+'.json',JSON.stringify({schema:'ankin-balance-v1',project,scenario,runs,summary},null,2)+'\n'),
  writeFile(base+'.csv',runsToCsv(runs)),
  writeFile(base+'-summary.csv',summaryToCsv(summary))
 ]);
 console.log('BALANCE_LAB_SUMMARY='+JSON.stringify({project,scenario,summary}));
 console.log('BALANCE_LAB_EXPORT='+base+'.json');
}
for(const scenario of ['boss','pack']){
 test('balance lab: seeded '+scenario+' combat logs, source attribution and independent export',async({page},testInfo)=>{
  test.setTimeout(120_000);
  const errors=await start(page),rows=[];
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  for(let seed=1;seed<=seeds;seed++)for(const ship of ships)for(const build of ['base','representative']){
   const row=await page.evaluate(args=>window.__ankinBalanceLabTest.run(args),
    {seed,ship,build,scenario,seconds:duration});
   expect(row.schema).toBe('ankin-balance-v1');
   expect(row.duration).toBeCloseTo(Math.ceil(duration*60)/60,3);
   expect(row.ship).toBe(ship);
   expect(row.damage).toBeGreaterThanOrEqual(0);
   expect(row.dps).toBeCloseTo(row.damage/row.duration,2);
   expect(Object.values(row.damageBySource).reduce((a,b)=>a+b,0)).toBeCloseTo(row.damage,2);
   expect(row.buckets.reduce((a,b)=>a+b.damage,0)).toBeCloseTo(row.damage,2);
   expect(row.kills).toBe(row.buckets.reduce((a,b)=>a+b.kills,0));
   rows.push(row);
  }
  // The same simulation must be reproducible without retaining previous run state.
  const replay=await page.evaluate(args=>window.__ankinBalanceLabTest.run(args),
   {seed:1,ship:'shot',build:'base',scenario,seconds:duration});
  expect(replay).toEqual(rows[0]);
  const after=await page.evaluate(()=>JSON.stringify({...localStorage}));
  expect(after).toBe(before);
  expect(errors).toEqual([]);
  expect(summarizeRuns(rows)).toHaveLength(10);
  await exportReport(testInfo.project.name,scenario,rows);
 });
}
test('telemetry is opt-in and tracks timed damage and boss phases without creating saves',async({page})=>{
 const errors=await start(page);
 const r=await page.evaluate(()=>{
  const noTrace=window.__ankinBalanceLabTest.snapshot();
  const first=window.__ankinBalanceLabTest.virtualDamage({amount:34,source:'shot',at:0});
  const second=window.__ankinBalanceLabTest.virtualDamage({amount:25,source:'shot',at:65});
  balanceTelemetry=null;
  return {noTrace,first,second,after:balanceTelemetryReport()};
 });
 expect(r.noTrace).toBeNull();expect(r.after).toBeNull();
 expect(r.first.damage).toBe(34);expect(r.first.buckets[0].minute).toBe(0);
 expect(r.second.damage).toBe(25);expect(r.second.buckets[0].minute).toBe(1);
 expect(r.first.damageBySource.shot).toBe(34);
 expect(errors).toEqual([]);
});
