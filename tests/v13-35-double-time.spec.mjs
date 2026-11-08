import {test,expect} from '@playwright/test';
import {BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
const PROBE=String.raw`
window.__doubleTimeQA={
 reset(ship='shot',trials=['doubleTime']){
  selectedShip=ship;selectedGameMode='normal';newRun();mode='playing';t=0;
  game.activeChallenges=[...trials];game.autoBank=true;
  game.spawn=game.nextBossAt=game.nextRaidAt=game.nextRelicAt=game.nextVacuumAt=1e9;
  enemies=[];hostile=[];boss=null;player.x=W/2;player.y=H/2;player.iframes=0;
 },
 clocks(){
  const results=[];
  for(const ship of BALANCE_AI_SHIPS)for(const speed of [1,2]){
   this.reset(ship,speed===2?['doubleTime']:[]);player.dashLeft=4;player.novaCooldown=4;
   const start=game.total;let ts=1000;frame(ts);
   for(let i=0;i<60;i++){ts+=1000/60;frame(ts)}
   const before=game.total;state('paused');frame(ts+10000);state('playing');frame(ts+20000);
   results.push({ship,speed,seconds:before-start,dash:player.dashLeft,nova:player.novaCooldown,
    pausedAdvance:game.total-before,report:ankinPerformanceReport()});
  }
  mode='menu';return results;
 },
 collision(){
  this.reset();game.activeChallenges.push('ballistic');player.hp=100;
  hostileShot(player.x+40,player.y,Math.PI,4000,12,3,'#ff99be');
  advanceSimulation(1/60);
  const result={hp:player.hp,hits:game.combatLog.hits};mode='menu';return result;
 },
 events(){
  const out=[];
  for(const total of [59.99,104.99,1799.99]){
   this.reset();game.total=total;
   if(total<60)game.nextBossAt=60;
   if(total>100&&total<106)game.nextRaidAt=105;
   advanceSimulation(1/60);
   out.push({total:game.total,boss:boss?.type||null,raid:!!game.raid,ultimate:boss?.type==='ultimate'});
  }
  mode='menu';return out;
 },
 ai(ship,seed,scenario,speed){
  return balanceSandbox(()=>{
   balanceSetup(ship,seed,10,'representative',scenario,'tactical');t=0;
   game.activeChallenges=speed===2?['doubleTime','ballistic']:['ballistic'];
   if(scenario==='live-boss'){spawnBoss('minor','guardian');boss.x=W*.67;boss.y=H*.33;}
   else balanceSpawnLiveRound(10,0);
   const start=game.total;let wall=0;
   for(let i=0;i<60*30&&game.runOutcome!=='dead';i++){
    balancePilotStep(i,'tactical');wall+=(1/60)/speed;advanceSimulation((1/60)/speed);
    if(scenario==='live-pack'&&i>0&&i%300===0)balanceSpawnLiveRound(10,i/300);
    if(mode!=='playing'||(scenario==='live-boss'&&!boss))break;
   }
   return {ship,seed,scenario,wall,seconds:game.total-start,hp:player.hp,damage:game.damage,
    hits:game.combatLog.hits,dashes:game.combatLog.dashCount,nova:game.combatLog.novaCount,
    enemies:enemies.length,bullets:hostile.length,outcome:game.runOutcome};
  });
 },
 win(){game.ultimateEncounterAt=1800;game.lastClearAt=0;recordVictory();return game.lastClear;},
 selected(){return [...game.activeChallenges]}
};
`;
async function setup(page,{manual=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(manual)await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  await route.fulfill({response,body:html.replace(BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS+'\n'+BALANCE_AI_HARNESS+'\n'+PROBE+'\n'+BALANCE_HARNESS_ANCHOR)});
 });
 await page.goto('./');return errors;
}
test('real frame loop: five ships, exact 2x progress, cooldowns and pause boundaries',async({page})=>{
 const errors=await setup(page,{manual:true});
 const rows=await page.evaluate(()=>window.__doubleTimeQA.clocks());
 for(const r of rows){
  expect(r.seconds).toBeCloseTo(r.speed,6);expect(r.dash).toBeCloseTo(4-r.speed,6);
  expect(r.nova).toBeCloseTo(4-r.speed,6);expect(r.pausedAdvance).toBe(0);
  expect(r.report.timing.requestedSpeed).toBe(r.speed);
  expect(r.report.timing.effectiveSpeed).toBeCloseTo(r.speed,2);
 }
 expect(errors).toEqual([]);
});
test('2x plus HYPER BULLETS preserves swept hits and boss, raid, ultimate scheduling',async({page})=>{
 const errors=await setup(page,{manual:true});
 const {collision,events}=await page.evaluate(()=>({collision:window.__doubleTimeQA.collision(),events:window.__doubleTimeQA.events()}));
 expect(collision.hits).toBe(1);expect(collision.hp).toBeCloseTo(88,0);
 expect(events[0].boss).toBe('minor');expect(events[1].raid).toBe(true);expect(events[2].ultimate).toBe(true);
 expect(errors).toEqual([]);
});
for(const scenario of ['live-pack','live-boss'])test('2x AI parity: five ships x three seeds, '+scenario,async({page},testInfo)=>{
 test.setTimeout(180000);const errors=await setup(page,{manual:true});const rows=[];
 for(const ship of ['shot','laser','charge','drill','dog'])for(const seed of [1,2,3]){
  const pair=await page.evaluate(({ship,seed,scenario})=>[1,2].map(speed=>window.__doubleTimeQA.ai(ship,seed,scenario,speed)),{ship,seed,scenario});
  expect({...pair[1],wall:pair[0].wall}).toEqual(pair[0]);
  expect(pair[1].wall*2).toBeCloseTo(pair[0].wall,6);rows.push(pair);
 }
 await testInfo.attach('double-time-'+scenario+'.json',{body:JSON.stringify(rows,null,2),contentType:'application/json'});
 expect(errors).toEqual([]);
});
test('trial selection combines and locks at launch; clear rank, achievements and history survive reload',async({page,isMobile})=>{
 await page.addInitScript(()=>localStorage.setItem('ankin_drift_v96_damage_records',JSON.stringify({clears:[{mode:'normal',time:1800,level:45,damage:500,date:'2026-10-24T00:00:00.000Z'}]})));
 const errors=await setup(page);
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#ankinTrial summary').click();
 for(const trial of ['doubleTime','ballistic'])await page.locator('[data-v13-challenge="'+trial+'"]').click();
 await expect(page.locator('[data-v13-challenge="doubleTime"]')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#start').click();await page.locator('#guideContinue').click();
 expect(await page.evaluate(()=>window.__doubleTimeQA.selected())).toEqual(['doubleTime','ballistic']);
 const clear=await page.evaluate(()=>window.__doubleTimeQA.win());
 expect(clear.rank).toBe('GOLD');expect(clear.challenges).toEqual(['doubleTime','ballistic']);
 await page.reload();
 const saved=await page.evaluate(()=>AnkinArchive.read());
 expect(saved.clears.some(c=>c.challenges.includes('doubleTime')&&c.rank==='GOLD')).toBe(true);
 expect(await page.evaluate(()=>!!AnkinArchive.current().awards.challenge_two)).toBe(true);
 expect(errors).toEqual([]);
});
