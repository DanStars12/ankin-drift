import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe="window.__novaSwarmProbe={\n reset(ship='dog',mins=15){\n  selectedShip=ship;selectedGameMode='normal';newRun();state('playing');\n  game.total=mins*60;game.spawn=999999;game.nextRaidAt=999999;\n  game.nextBossAt=999999;game.nextRelicAt=999999;game.nextVacuumAt=999999;\n  enemies=[];hostile=[];shots=[];gusts=[];zones=[];particles=[];boss=null;\n  player.iframes=100;player.shotTimer=99999;soundOn=false;\n },\n nova(ship){\n  this.reset(ship);const base=player.novaReuseDelay;\n  const fast=skillById('novaFastCycle'),relay=skillById('novaPulseRelay');\n  const pool=selectable(SKILLS);\n  const available=[pool.includes(fast),pool.includes(relay)];\n  for(let i=0;i<3;i++){fast.apply(player);game.skills[fast.id]=(game.skills[fast.id]||0)+1;game.acquisitionLog.push(fast.id);}\n  for(let i=0;i<2;i++){relay.apply(player);game.skills[relay.id]=(game.skills[relay.id]||0)+1;game.acquisitionLog.push(relay.id);}\n  const floor=player.novaReuseDelay,stillInPool=selectable(SKILLS).some(c=>c.id===fast.id||c.id===relay.id);\n  player.energy=100;const old=game.combatLog?.novaCount||0;nova();\n  const cooldown=player.novaCooldown,energy=player.energy;\n  player.energy=100;nova();\n  const noDouble=(game.combatLog?.novaCount||0)-old===1;\n  restorePlayerBuild();\n  return {base,available,floor,stillInPool,cooldown,energy,noDouble,restored:player.novaReuseDelay,\n   remaining:player.novaCooldown};\n },\n threshold(){\n  this.reset('dog');const fast=skillById('novaFastCycle');\n  game.skills[fast.id]=3;const capped=!selectable(SKILLS).some(c=>c.id===fast.id);\n  const noFast=player.novaReuseDelay===NOVA_COOLDOWN;\n  return {capped,noFast,minimum:NOVA_REUSE_MIN};\n },\n wave(mins=30){\n  this.reset('dog',mins);\n  const tier=raidTier(mins);\n  game.raid={kind:'swarm',effects:['swarm'],wave:0,tier,spawnJobs:[],pendingSpawns:0,spawned:0};\n  const roster=raidWaveRoster(mins);\n  const unlocked=['drone','stinger','brute','shooter','guard','bomber','support'].filter(t=>mins>=ENEMY_INTRO[t]);\n  raidSpawnWave();\n  const job=game.raid.spawnJobs[0],positions=job.types.map((_,i)=>raidSpawnSpot(job,i));\n  const first=job.total,unique=[...new Set(job.types)];\n  const initial=(game.raid.pendingSpawns||0);\n  for(let i=0;i<60&&game.raid.spawnJobs.length;i++)drainRaidSpawns(game.raid);\n  return {mins,tier,roster,unlocked,first,unique,originCount:job.origins.length,\n   origins:job.origins,positions:positions.every(p=>p.x>=17&&p.x<=W-17&&p.y>=17&&p.y<=H-17),\n   uniquePositions:new Set(positions.map(p=>Math.round(p.x/30)+':'+Math.round(p.y/30))).size,\n   pending:game.raid.pendingSpawns,remaining:game.raid.spawnJobs.length,\n   spawned:game.raid.spawned,initial,enemies:enemies.length};\n },\n appearance(){\n  this.reset('dog',30);player.rockWalls=3;player.empRadius=108;\n  settings.fx='simple';renderHeavyLoad=true;\n  const start=performance.now();\n  for(let i=0;i<5;i++){drawTeslaField(player);render();}\n  return {elapsed:performance.now()-start,faceComplexity:/ctx\\.ellipse\\(0,\\.43,\\.16,\\.12/.test(drawHedgehogPulseEmitter.toString()),\n    noCenterRings:!drawHedgehogPulseEmitter.toString().includes('inner induction loops'),\n    catHasRockPalette:drawAnimal.toString().includes(\"cat:['#f4dcb5','#bca388']\")};\n }\n};";
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('v13.11 probe anchor moved');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
for(const ship of ['shot','laser','charge','drill','dog']){
 test('NOVA cooldown skills respect 10.5s floor and fusion rebuild on '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__novaSwarmProbe.nova(s),ship);
  expect(r.base).toBe(13.6);expect(r.available).toEqual([true,true]);
  expect(r.floor).toBeGreaterThanOrEqual(10.5);expect(r.floor).toBeLessThan(11);
  expect(r.stillInPool).toBe(false);expect(r.cooldown).toBeCloseTo(r.floor,4);
  expect(r.energy).toBe(0);expect(r.noDouble).toBe(true);
  expect(r.restored).toBeCloseTo(r.floor,4);expect(r.remaining).toBeCloseTo(r.floor,4);
  expect(errors).toEqual([]);
 });
}
test('capped NOVA card is removed from normal pool',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__novaSwarmProbe.threshold());
 expect(r.capped).toBe(true);expect(r.noFast).toBe(true);expect(r.minimum).toBe(10.5);
 expect(errors).toEqual([]);
});
for(const mins of [2,12,30]){
 test('SWARM raid '+mins+'m mixes unlocked species across multiple entrances',async({page})=>{
  const errors=await setup(page),r=await page.evaluate(m=>window.__novaSwarmProbe.wave(m),mins);
  expect(r.first).toBeGreaterThan(5);expect(r.originCount).toBeGreaterThanOrEqual(2);
  expect(r.unique.length).toBeGreaterThanOrEqual(mins===2?2:4);
  expect(r.unique.every(v=>r.unlocked.includes(v))).toBe(true);
  expect(r.positions).toBe(true);expect(r.uniquePositions).toBeGreaterThan(r.originCount);
  expect(r.pending).toBe(0);expect(r.remaining).toBe(0);
  expect(r.spawned).toBeGreaterThan(0);expect(r.enemies).toBe(r.spawned);
  expect(errors).toEqual([]);
 });
}
test('hedgehog simplified interior and rock-color cat remain cheap to draw',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__novaSwarmProbe.appearance());
 expect(r.elapsed).toBeLessThan(5000);
 expect(r.noCenterRings).toBe(true);expect(r.catHasRockPalette).toBe(true);expect(r.faceComplexity).toBe(true);
 expect(errors).toEqual([]);
});
