import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
test.use({serviceWorkers:'block'});
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=String.raw`
window.__companionLoad=function(speed,scenario){return balanceSandbox(()=>{
 const savedRandom=Math.random;let seed=1771;
 Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 try{
  selectedShip='phantom';selectedGameMode='normal';newRun();mode='playing';soundOn=false;t=0;game.autoBank=true;
  for(const c of ALL_SKILL_DEFS().filter(c=>c.shipOnly==='phantom')){
   const pool=['power','legendary','unique','relic'].includes(c.rarity)?({power:'powers',legendary:'legends',unique:'uniques',relic:'relics'})[c.rarity]:'skills';
   for(let n=0;n<(c.maxStacks||1);n++){game[pool][c.id]=(game[pool][c.id]||0)+1;game.acquisitionLog.push(c.id);c.apply(player);}activateUpgrades();
  }
  // Dismiss acquisition animations before measuring the combat workload.
  for(let n=0;n<50&&mode!=='playing';n++){if(mode==='fusion')dismissFusion();else if(mode==='uniqueReward'||mode==='elementResult')continueAfterReward();else throw Error('Unexpected setup menu: '+mode);}
  game.total=runClock=1200;game.endless=true;game.activeChallenges=speed===2?['doubleTime']:[];
  game.nextBossAt=game.nextRaidAt=game.nextRelicAt=game.nextVacuumAt=game.nextUltimateAt=game.spawn=1e9;
  enemies=[];shots=[];hostile=[];pickups=[];hazards=[];zones=[];boss=null;enemyIndex.clear();enemyIndexReady=false;
  if(scenario==='raid'){startRaid();game.raid.kind='engage';game.raid.effects=['engage','harukanium','iso'];spawnEngageWalls(game.raid);}
  enemies=[];boss=null;
  for(let i=0;i<(scenario==='bosses'?232:235);i++){const a=i*2.399963;spawnEnemy(['drone','guard','shooter','brute'][i%4],{x:clamp(W*.5+Math.cos(a)*W*.35,20,W-20),y:clamp(H*.5+Math.sin(a)*H*.35,20,H-20)});}
  if(scenario==='bosses')for(const kind of ['minor','minor','major']){boss=null;spawnBoss(kind);}
  for(const e of enemies)e.hp=e.maxHp=1e9;
  player.iframes=1e6;player.dartTypes=Array.from({length:25},(_,i)=>['shot','laser','charge','support','follow'][i%5]);player.darts=[];player.dartActive=0;player.dartCooldown=0;
  for(let i=0;i<300;i++)orb(20+(i*37)%Math.max(1,W-40),20+(i*61)%Math.max(1,H-40),2,1);
  const initial={scenario,bosses:enemies.filter(e=>['minor','major'].includes(e.type)).length,enemies:enemies.length,phantoms:player.phantoms.length,types:player.dartTypes.length,walls:activeEngageWalls().length};
  let maxDarts=0,maxShots=0,maxVisuals=0,maxEchoes=0,finite=true;
  for(let i=0;i<1200/speed&&game.total<1215-1e-7;i++){
   advanceSimulation(1/60);
   for(let n=0;n<50&&mode!=='playing';n++){if(mode==='fusion')dismissFusion();else if(mode==='uniqueReward'||mode==='elementResult')continueAfterReward();else throw Error('Unexpected combat menu: '+mode);}
   if(i%10===0){render();hudUpdate();}
   maxDarts=Math.max(maxDarts,player.darts.length);maxShots=Math.max(maxShots,player.dartProjectiles.length);maxVisuals=Math.max(maxVisuals,player.dartVisuals.length);maxEchoes=Math.max(maxEchoes,player.phantomEchoes.length);
   finite&&=[player,...player.phantoms,...player.darts,...enemies].every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y));
   if(mode!=='playing')throw Error('Load fixture stopped: '+mode);
  }
  render();return {initial,speed,seconds:game.total-1200,damage:game.damage,maxDarts,maxShots,maxVisuals,maxEchoes,finite,faults:window.ankinRuntimeStatus().faultCount,kind:'scripted native combat and Canvas render; not an FPS measurement'};
 }finally{Math.random=savedRandom;}
});};
`;
test('maximum PHANTOM companions sustain native complex raids and multi-boss combat and Canvas rendering at 1x/2x',async({page},info)=>{
 test.setTimeout(180000);const errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/ankin-drift/',async route=>{const response=await route.fetch(),html=await response.text();expect(html).toContain(anchor);await route.fulfill({response,body:html.replace(anchor,BALANCE_HARNESS+'\n'+BALANCE_AI_HARNESS+'\n'+hook+'\n'+anchor)});});
 for(const scenario of ['raid','bosses'])for(const speed of [1,2]){
  await page.goto('./');const saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const r=await page.evaluate(({speed,scenario})=>window.__companionLoad(speed,scenario),{speed,scenario});rows.push(r);
  expect(r.initial.enemies).toBe(235);expect(r.initial.phantoms).toBe(5);expect(r.initial.types).toBe(25);if(scenario==='raid')expect(r.initial.walls).toBeGreaterThan(0);else expect(r.initial.bosses).toBe(3);
  expect(r.seconds).toBeGreaterThanOrEqual(15-1e-6);expect(r.seconds).toBeLessThanOrEqual(15+1/60+1e-6);expect(r.damage).toBeGreaterThan(0);expect(r.maxDarts).toBe(25);expect(r.maxShots).toBeLessThanOrEqual(256);expect(r.maxVisuals).toBeLessThanOrEqual(64);expect(r.maxEchoes).toBeLessThanOrEqual(40);expect(r.finite).toBe(true);expect(r.faults).toBe(0);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(saved);
 }
 expect(errors).toEqual([]);await writeFile(info.outputPath('phantom-native-load.json'),JSON.stringify({project:info.project.name,rows},null,2));
});
