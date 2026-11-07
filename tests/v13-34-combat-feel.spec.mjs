import {test,expect} from '@playwright/test';
import {BALANCE_HARNESS_ANCHOR} from '../scripts/balance-harness.mjs';

// Injected for tests only: the production page never exposes combat state.
const PROBE = `
function soloQAReset(ship='shot'){
 selectedShip=ship;selectedGameMode='normal';newRun();mode='playing';
 game.autoBank=true;game.spawn=1e8;game.nextBossAt=1e8;
 game.nextRaidAt=1e8;game.nextRelicAt=1e8;game.nextVacuumAt=1e8;
 game.bossQueue=[];game.ultimatePending=false;
 enemies=[];hostile=[];hazards=[];pickups=[];boss=null;
 player.x=W*.5;player.y=H*.5;player.iframes=0;player.hp=100;
 return player;
}
window.__ankinSoloQA={
 geometry(){
  const ships=['shot','laser','charge','drill','dog'];
  return {ships:ships.map(ship=>{const p=soloQAReset(ship);return {ship,hitR:p.hitR,visualR:p.r}}),
   crossed:segmentPointDistanceSq(0,0,20,0,10,3),
   outside:segmentPointDistanceSq(0,0,20,0,10,12),
   speeds:[ordinaryShotSpeed(0),ordinaryShotSpeed(20),ordinaryShotSpeed(30),ordinaryShotSpeed(60)],
   pressure:ordinaryShotSpeed(30,true),
   crowd:[ordinaryShooterInterval(30,10),ordinaryShooterInterval(30,50)],
   skills:['dashGraze','dashPulse','dashFlow'].map(id=>{const c=SKILLS.find(c=>c.id===id);return {id,rarity:c?.rarity,stackable:c?.stackable}})};
 },
 bullet(offset,velocity=0,dt=1/60){
  const p=soloQAReset();
  hostile=[{x:p.x+offset,y:p.y,vx:velocity,vy:0,r:3,damage:12,ttl:2,color:'#f8a5ff',warn:0}];
  drive(dt);
  const result={hp:p.hp,hitR:p.hitR,hits:game.combatLog.hits,bullets:hostile.length};
  mode='menu';return result;
 },
 graze(){
  const p=soloQAReset();p.dashGraze=1;p.dashLeft=1;
  hostile=[{x:p.x+14,y:p.y,vx:0,vy:0,r:3,damage:12,ttl:2,color:'#aabbff',warn:0}];
  drive(1/60);
  const first={hp:p.hp,energy:p.energy,dashLeft:p.dashLeft,grazed:hostile[0]?.grazed||false};
  drive(1/60);
  const second={hp:p.hp,energy:p.energy,dashLeft:p.dashLeft};
  mode='menu';return {first,second};
 },
 mobility(){
  const p=soloQAReset();p.dashPulse=1;p.dashFlow=1;
  hostile=[{x:p.x+25,y:p.y,vx:0,vy:0,r:4,damage:10,ttl:2,color:'#ffffff',unblockable:false},
   {x:p.x+40,y:p.y,vx:0,vy:0,r:4,damage:10,ttl:2,color:'#ffffff',unblockable:true}];
  dash();
  const result={dashTime:p.dashTime,flowTime:p.dashFlowTimer,cleared:hostile[0].ttl,phaseIntact:hostile[1].ttl,dashCount:game.combatLog.dashCount};
  mode='menu';return result;
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  await route.fulfill({response,body:html.replace(BALANCE_HARNESS_ANCHOR,
   PROBE+'\n'+BALANCE_HARNESS_ANCHOR)});
 });
 await page.goto('./');return errors;
}
test('five solo ships share a smaller core and ordinary enemy shots have late-wave speed caps',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>window.__ankinSoloQA.geometry());
 expect(result.ships.map(x=>x.ship)).toEqual(['shot','laser','charge','drill','dog']);
 for(const p of result.ships){expect(p.hitR).toBe(6.5);expect(p.hitR).toBeLessThan(p.visualR)}
 expect(result.crossed).toBe(9);
 expect(result.outside).toBe(144);
 expect(result.speeds).toEqual([155,259,311,320]);
 expect(result.pressure).toBe(298);
 expect(result.crowd[1]).toBeGreaterThan(result.crowd[0]);
 expect(result.crowd[0]).toBeCloseTo(1.13);
 expect(result.skills.map(x=>x.id)).toEqual(['dashGraze','dashPulse','dashFlow']);
 for(const skill of result.skills)expect(skill.rarity).toBeTruthy();
 expect(errors).toEqual([]);
});
test('solo core collision: hull-edge miss, core hit and high-speed swept projectile',async({page})=>{
 const errors=await setup(page);
 const cases=await page.evaluate(()=>({
  miss:window.__ankinSoloQA.bullet(10.5),
  hit:window.__ankinSoloQA.bullet(8.5),
  swept:window.__ankinSoloQA.bullet(40,-4000,.02)
 }));
 expect(cases.miss.hp).toBe(100);expect(cases.miss.hits).toBe(0);
 expect(cases.hit.hp).toBe(88);expect(cases.hit.hits).toBe(1);
 expect(cases.swept.hp).toBe(88);expect(cases.swept.hits).toBe(1);
 expect(errors).toEqual([]);
});
test('graze rewards a skillful near miss once, and dash pulse does not remove PHASE shots',async({page})=>{
 const errors=await setup(page);
 const out=await page.evaluate(()=>({graze:window.__ankinSoloQA.graze(),dash:window.__ankinSoloQA.mobility()}));
 expect(out.graze.first.hp).toBe(100);
 expect(out.graze.first.grazed).toBe(true);
 expect(out.graze.first.energy).toBeCloseTo(1.6);
 expect(out.graze.first.dashLeft).toBeLessThan(.84);
 expect(out.graze.second.energy).toBe(out.graze.first.energy);
 expect(out.dash.cleared).toBe(0);
 expect(out.dash.phaseIntact).toBe(2);
 expect(out.dash.flowTime).toBe(1.2);
 expect(out.dash.dashTime).toBeGreaterThan(0);
 expect(out.dash.dashCount).toBe(1);
 expect(errors).toEqual([]);
});
