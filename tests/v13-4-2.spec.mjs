import { test, expect } from '@playwright/test';

// Inject a test-only hook; this is never stored in the production index.html.
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=String.raw`
window.__combatPolish={
 reset(){
  newRun();state('playing');game.total=300;game.spawn=99999;game.nextBossAt=99999;
  game.nextRaidAt=99999;game.nextRelicAt=99999;game.nextVacuumAt=99999;
  enemies=[];shots=[];hostile=[];zones=[];gusts=[];boss=null;
  player.iframes=100;player.shotTimer=99999;
 },
 cyclone(){
  this.reset();
  player.windDps=120;player.dmg=220;
  const center={x:player.x,y:player.y};
  const bossEnemy=spawnEnemy('brute',{x:center.x+75,y:center.y});bossEnemy.type='minor';bossEnemy.hp=bossEnemy.maxHp=100000;
  const mob=spawnEnemy('brute',{x:center.x+65,y:center.y-17});mob.hp=mob.maxHp=100000;
  const safe=spawnEnemy('brute',{x:center.x-70,y:center.y});safe.hp=safe.maxHp=100000;safe.isoSafe=.3;
  refreshEnemyIndex();
  gusts.push({x:center.x,y:center.y,vx:0,vy:0,r:100,life:2,tick:0,bonus:1});
  const oldBossX=bossEnemy.x,oldMobX=mob.x,oldSafeX=safe.x;
  tickGusts(.15);
  return{bossDamage:bossEnemy.maxHp-bossEnemy.hp,bossShift:bossEnemy.x-oldBossX,
    mobDamage:mob.maxHp-mob.hp,mobShift:mob.x-oldMobX,
    safeDamage:safe.maxHp-safe.hp,safeShift:safe.x-oldSafeX};
 },
 ice(){
  this.reset();player.iceBallCount=1;player.iceBallTimer=0;
  shots=Array.from({length:currentShotBudget()},()=>({kind:'dummy',ttl:3}));
  tickIndependentElements(.017);const delayed=player.iceBallTimer;
  shots=[];tickIndependentElements(.14);
  return{delayed,spawned:shots.filter(s=>s.kind==='iceball').length,timer:player.iceBallTimer};
 },
 meteor(){
  this.reset();player.meteorCount=1;player.meteorTimer=0;
  shots=Array.from({length:currentShotBudget()},()=>({kind:'dummy',ttl:3}));
  tickIndependentElements(.017);const delayed=player.meteorTimer;
  shots=[];tickIndependentElements(.14);
  return{delayed,spawned:shots.filter(s=>s.kind==='meteor').length,timer:player.meteorTimer};
 },
 echo(){
  this.reset();player.relicEchoQueue=[{time:.01,dir:0,power:30}];
  shots=Array.from({length:currentShotBudget()},()=>({kind:'dummy',ttl:3}));
  tickEchoShots(player,.03);const held=player.relicEchoQueue.length;
  shots=[];tickEchoShots(player,.04);
  const fired=shots.filter(s=>s.source==='echoComet').length;
  player.relicEchoQueue=[{time:0,dir:0,power:30,wait:1.23}];
  shots=Array.from({length:currentShotBudget()},()=>({kind:'dummy',ttl:3}));
  tickEchoShots(player,.03);
  return{held,fired,queueAfterFire:0,remaining:player.relicEchoQueue.length};
 },
 warp(){
  this.reset();const e=spawnEnemy('brute',{x:player.x+90,y:player.y});
  e.isoSafe=.31;const during=isVisibleAutoTarget(e);e.isoSafe=0;
  const after=isVisibleAutoTarget(e);e.isoWarp={x:e.x,y:e.y,time:1};
  return{during,after,pending:isVisibleAutoTarget(e)};
 },
 draw(){
  this.reset();const original=ctx.stroke;let strokes=0,arcs=0;
  const arc=ctx.arc,oldFx=settings.fx;settings.fx='high';
  ctx.stroke=function(...args){strokes++;return original.apply(this,args)};
  ctx.arc=function(...args){arcs++;return arc.apply(this,args)};
  try{
   for(let i=0;i<16;i++)drawCyclone({x:player.x,y:player.y,r:90,life:2,color:'#7de8da'});
  }finally{ctx.stroke=original;ctx.arc=arc;settings.fx=oldFx;}
  return{strokes,arcs};
 }
};`;
async function setup(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('combat polish test anchor changed');
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('cyclones harm bosses without moving them and leave WARP arrivals untouched',async({page})=>{
 const errors=await setup(page);const x=await page.evaluate(()=>window.__combatPolish.cyclone());
 expect(x.bossDamage).toBeGreaterThan(0);expect(x.bossShift).toBe(0);
 expect(x.mobDamage).toBeGreaterThan(0);expect(x.mobShift).toBeGreaterThan(0);
 expect(x.safeDamage).toBe(0);expect(x.safeShift).toBe(0);expect(errors).toEqual([]);
});
test('iceballs and rolling meteor do not waste a full cooldown when shot budget is full',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>({ice:window.__combatPolish.ice(),meteor:window.__combatPolish.meteor()}));
 expect(x.ice.delayed).toBeLessThan(.2);expect(x.ice.spawned).toBe(1);
 expect(x.ice.timer).toBeGreaterThan(1);
 expect(x.meteor.delayed).toBeLessThan(.2);expect(x.meteor.spawned).toBe(1);
 expect(x.meteor.timer).toBeGreaterThan(2);expect(errors).toEqual([]);
});
test('queued charge echo retries once, and stale echoes leave the queue',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__combatPolish.echo());
 expect(x.held).toBe(1);expect(x.fired).toBe(1);
 expect(x.remaining).toBe(0);expect(errors).toEqual([]);
});
test('laser/auto-target skips WARP invulnerability until arrival',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__combatPolish.warp());
 expect(x).toEqual({during:false,after:true,pending:false});expect(errors).toEqual([]);
});
test('16 simultaneous cyclone fields batch strokes without losing arc geometry',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__combatPolish.draw());
 expect(x.strokes).toBeLessThanOrEqual(48);expect(x.arcs).toBeGreaterThanOrEqual(16*7);
 expect(errors).toEqual([]);
});
