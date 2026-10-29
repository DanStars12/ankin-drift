import {test,expect} from '@playwright/test';
// Browser-side probes run inside the game's closure and use the real runtime helpers.
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=[
 "window.__elementalProbe={",
 " reset(ship){selectedShip=ship;newRun();state('playing');soundOn=false;runClock=0;enemies=[];shots=[];particles=[];return player.shipType;},",
 " dummy(){return {x:220,y:220,r:10,type:'drone',hp:1000000,maxHp:1000000,dead:false,slow:0,burn:0,frozen:0,hurt:0,isoSafe:0};},",
 " baseline(ship){",
 "  this.reset(ship);const p=player;p.burnChance=1;p.chain=1;p.freezeChance=1;p.slowChance=1;p.laserElement=8;",
 "  const e=this.dummy();",
 "  const mode=ship==='drill'?drillElementMode(p):beamElementMode(p);applyBasicElement(e,mode,90);",
 "  if(['shot','charge','dog'].includes(ship)){",
 "   const kind=ship==='shot'?'pulse':ship==='dog'?'bone':'comet',source=ship==='charge'?'charge':ship==='dog'?'shot':'primary';",
 "   projectileHit({x:e.x,y:e.y,vx:350,vy:0,r:5,damage:35,pierce:0,kind,source,hit:new Set(),chargeFull:false},e);",
 "  }",
 "  return {ship,mode,slow:e.slow,burn:e.burn,frozen:e.frozen,arc:e.basicArcUntil||0,modes:basicElementModes(p)};",
 " },",
 " conversions(ship){",
 "  this.reset(ship);const p=player;",
 "  if(ship==='drill'){",
 "   for(const id of ['dPowerFire','dPowerIce','dPowerThunder'])skillById(id).apply(p);",
 "   const modes=[0,.9,1.8].map(s=>{runClock=s;return drillElementMode(p)});",
 "   const e=this.dummy();runClock=0;applyBasicElement(e,modes[0],120);",
 "   runClock=.9;applyBasicElement(e,modes[1],120);",
 "   return {modes,burn:e.burn,slow:e.slow,powers:p.drillModes.length};",
 "  }",
 "  for(const id of ['plasma','cryo','arc'])skillById(id).apply(p);",
 "  const modes=[nextBasicElement(p),nextBasicElement(p),nextBasicElement(p)];",
 "  let snapshot=null;if(ship==='dog'){shots=[];fireDogBones();snapshot=shots[0]?.elementMode;} ",
 "  if(ship==='charge'){shots=[];fireComet(.35);snapshot=shots[0]?.elementMode;}",
 "  if(ship==='laser'){runClock=0;snapshot=beamElementMode(p);}",
 "  const e=this.dummy();applyBasicElement(e,'plasma',120);applyBasicElement(e,'cryo',120);",
 "  return {modes,snapshot,burn:e.burn,slow:e.slow,powers:basicElementModes(p).length};",
 " }",
 "};"
].join('\n');
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('ELEMENTAL REFORGE probe anchor moved');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
for(const ship of ['shot','laser','charge','drill','dog']){
 test('unconverted main weapon stays fully neutral: '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__elementalProbe.baseline(s),ship);
  expect(r.ship).toBe(ship);expect(r.mode).toBeNull();expect(r.slow).toBe(0);
  expect(r.burn).toBe(0);expect(r.frozen).toBe(0);expect(r.arc).toBe(0);
  expect(r.modes).toEqual([]);expect(errors).toEqual([]);
 });
 test('conversion POWER unlocks distinct effects and preserves native weapon: '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__elementalProbe.conversions(s),ship);
  expect(r.powers).toBe(3);expect(r.modes).toEqual(['plasma','cryo','arc']);
  expect(r.burn).toBeGreaterThan(0);expect(r.slow).toBeGreaterThan(0);
  if(['laser','charge','dog'].includes(ship))expect(['plasma','cryo','arc']).toContain(r.snapshot);
  expect(errors).toEqual([]);
 });
}
