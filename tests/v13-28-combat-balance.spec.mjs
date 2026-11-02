import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`window.__combat1328={
 boss(kind='minor',variant='guardian'){
  selectedShip='shot';newRun();mode='playing';game.nextBossAt=1e8;game.nextRaidAt=1e8;game.nextRelicAt=1e8;game.nextVacuumAt=1e8;game.spawn=1e8;
  spawnBoss(kind,variant);boss.x=W*.63;boss.y=H*.30;player.iframes=1000;player.dmg=0;
  return {state:boss.superState,wait:boss.superWait,gauge:bossSuperGauge(boss),hp:boss.hp};
 },
 advance(dt){tickBossSuper(boss,dt);return {state:boss?.superState,charge:boss?.superCharge,warning:boss?.superWarn,remaining:boss?.superRecover,aim:[boss?.superAimX,boss?.superAimY],hazards:hazards.map(h=>h.type),count:boss?.superCount,gauge:bossSuperGauge(boss)};},
 stationary(dt){const e=boss,before={x:e.x,y:e.y,attacks:e.attacks,shoot:e.shoot};drive(dt);return {before,after:{x:e.x,y:e.y,attacks:e.attacks,shoot:e.shoot},state:e.superState};},
 exposed(){const e=boss,before=game.damage;damageEnemy(e,100,{source:'shot'});return {damage:game.damage-before};},
 earlyKill(){selectedShip='shot';newRun();mode='playing';spawnBoss('minor','guardian');const e=boss;e.hp=1;damageEnemy(e,100,{source:'shot'});return {dead:e.dead,bossPresent:!!boss,reward:game.rewards.includes('minor'),specialCount:e.superCount};},
 gauge(){hudUpdate();return {hidden:document.querySelector('#bossSpecialWrap').hidden,caption:document.querySelector('#bossSpecialCaption').textContent,width:document.querySelector('#bossSpecialFill').style.width};},
 interceptor(){
  selectedShip='shot';newRun();mode='playing';game.total=17*60;game.nextBossAt=1e8;game.nextRaidAt=1e8;game.nextRelicAt=1e8;game.nextVacuumAt=1e8;game.spawn=1e8;
  const e=spawnEnemy('phantom',{x:player.x+220,y:player.y-40});player.dmg=0;player.iframes=999;player.dx=0;player.dy=1;
  e.dashCd=0;e.hp=e.maxHp=1e6;enemies=[e];
  for(let i=0;i<56;i++)drive(1/60);
  return {info:ENEMY_CODEX.find(x=>x.id==='phantom'),intro:enemyWeightsAt(15).find(x=>x.type==='phantom').weight,
   weight:enemyWeightsAt(25).find(x=>x.type==='phantom').weight,warning:e.dashWarn,
   bullets:hostile.filter(b=>b.color==='#ffc47d').length,dashTime:e.dashTime,angle:e.dashAngle};
 },
 dps(ship,built=false){
  selectedShip=ship;newRun();mode='playing';game.nextBossAt=1e8;game.nextRaidAt=1e8;game.nextRelicAt=1e8;game.nextVacuumAt=1e8;game.spawn=1e8;
  player.iframes=99999;const p=player;
  const originX=W*.45,originY=H*.50;p.x=originX;p.y=originY;
  const e={x:originX+(ship==='drill'?60:175),y:originY,r:38,type:'major',variant:'titan',hp:1e8,maxHp:1e8,spd:0,dmg:0,xp:0,color:'#ffdfad',dead:false,hurt:0,phase:0,shoot:1e6,burn:0,burnDps:0,slow:0,frozen:0,rockHit:0,bladeHit:0,attacks:0};
  enemies=[e];boss=null;
  if(built){p.dmg+=45;p.bossBane=1.25;p.crit=.18;
   if(ship==='shot')p.multishot=3;
   if(ship==='laser')p.laserCount=3;
   if(ship==='charge')p.chargeRate=1.08;
   if(ship==='drill')p.drillDamage+=90;
   if(ship==='dog')p.dogBones=3;
  }
  const seconds=10,dt=1/60,n=Math.round(seconds/dt);
  for(let i=0;i<n;i++){
   const time=i*dt;keys.clear();
   if(ship==='laser'){keys.add(Math.floor(time/.25)%2===0?'KeyD':'KeyA');}
   if(ship==='charge'){if(time%1.65>1.50)keys.add('KeyD');}
   if(ship==='drill'){
    keys.add(e.x>p.x?'KeyD':'KeyA');
    if(p.dashLeft<=0&&time>1)dash();
   }
   drive(dt);
  }
  keys.clear();
  return {ship,build:built?'representative':'base',seconds,damage:Math.round(game.damage),dps:Math.round(game.damage/seconds),
   shots:shots.length,bySource:game.damageStats,playerX:Math.round(p.x),playerY:Math.round(p.y)};
 },
 baseline(){
  return {ships:Object.keys(SHIPS),superRules:BOSS_SUPER_RULES};
 }
};`;
async function launch(page,isMobile=false){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html).toContain(anchor);
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');if(isMobile)await page.locator('[data-control="mobile"]').click();
 return errors;
}
test('all four boss tiers charge after delay, warn before a fixed ult, stop attacking/moving and expose a 13% damage window',async({page,isMobile})=>{
 const errors=await launch(page,isMobile);
 for(const [kind,variant] of [['minor','guardian'],['major','titan'],['unique','ankin']]){
  const start=await page.evaluate(([k,v])=>window.__combat1328.boss(k,v),[kind,variant]);
  expect(start.state).toBe('wait');expect(start.gauge).toBeNull();
  let r=await page.evaluate(dt=>window.__combat1328.advance(dt),start.wait+.01);
  expect(r.state).toBe('charge');expect(r.gauge).not.toBeNull();
  const hud=await page.evaluate(()=>window.__combat1328.gauge());
  expect(hud.hidden).toBe(false);expect(hud.caption).toContain('大技チャージ');
  const rules=await page.evaluate(k=>window.__combat1328.baseline().superRules[k],kind);
  r=await page.evaluate(dt=>window.__combat1328.advance(dt),rules.charge+.05);
  expect(r.state).toBe('telegraph');
  expect(r.aim[0]).toBeGreaterThan(0);expect(r.aim[1]).toBeGreaterThan(0);
  r=await page.evaluate(dt=>window.__combat1328.advance(dt),rules.warn+.05);
  expect(r.state).toBe('recover');expect(r.count).toBe(1);expect(r.hazards.length).toBeGreaterThan(0);
  const stationary=await page.evaluate(()=>window.__combat1328.stationary(1/60));
  expect(stationary.state).toBe('recover');
  expect(stationary.after.x).toBeCloseTo(stationary.before.x,4);
  expect(stationary.after.y).toBeCloseTo(stationary.before.y,4);
  expect(stationary.after.attacks).toBe(stationary.before.attacks);
  const bonus=await page.evaluate(()=>window.__combat1328.exposed());
  expect(bonus.damage).toBeCloseTo(113,2);
  r=await page.evaluate(dt=>window.__combat1328.advance(dt),rules.recover+.1);
  expect(r.state).toBe('charge');expect(r.gauge.fill).toBe(0);
 }
 expect(errors).toEqual([]);
});
test('ultimate boss also receives a readable and avoidable super gauge',async({page})=>{
 const errors=await launch(page);
 await page.evaluate(()=>{window.__combat1328.boss('minor','guardian');const e=window.__combat1328;return e;});
 const model=await page.evaluate(()=>window.__combat1328.baseline());
 expect(model.superRules.ultimate.warn).toBeGreaterThan(1);
 expect(model.superRules.ultimate.recover).toBeGreaterThan(2);
 expect(errors).toEqual([]);
});
test('old rare runner is now a visibly distinct flanking interceptor after minute 16 with telegraphed projectiles',async({page,isMobile})=>{
 const errors=await launch(page,isMobile);
 const e=await page.evaluate(()=>window.__combat1328.interceptor());
 expect(e.info.jp).toBe('パルス・インターセプター');
 expect(e.info.shape).toBe('interceptor');expect(e.info.color).toBe('#ffb853');
 expect(e.info.en).not.toContain('PHANTOM');
 expect(e.intro).toBe(0);expect(e.weight).toBeGreaterThanOrEqual(4);
 expect(e.bullets).toBeGreaterThanOrEqual(3);expect(e.dashTime).toBe(0);
 expect(errors).toEqual([]);
});
test('report actual ten-second single-target baseline and representative build DPS for all five ships',async({page,isMobile})=>{
 const errors=await launch(page,isMobile);
 const ships=['shot','laser','charge','drill','dog'];
 const metrics=await page.evaluate(shipIds=>shipIds.flatMap(ship=>[
  window.__combat1328.dps(ship,false),window.__combat1328.dps(ship,true)
 ]),ships);
 for(const e of metrics){
  expect(e.dps,JSON.stringify(e)).toBeGreaterThan(0);
  expect(Number.isFinite(e.dps)).toBe(true);
  expect(e.damage).toBeGreaterThan(0);
 }
 expect(metrics).toHaveLength(10);
 console.log('ANKIN_V13_28_DPS_REPORT='+JSON.stringify({platform:isMobile?'mobile':'desktop',metrics}));
 expect(errors).toEqual([]);
});
