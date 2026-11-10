import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const injection=[
"window.__reforgeStress={",
"setup(ship,fx='normal',elapsed=1900){",
" selectedShip=ship;selectedGameMode=elapsed<=900?'challenge':'normal';newRun();state('playing');soundOn=false;",
" game.total=elapsed;game.level=48;game.endless=true;game.nextUltimateAt=999999;game.nextBossAt=999999;game.nextRaidAt=999999;game.nextRelicAt=999999;game.nextVacuumAt=999999;",
" game.spawn=999999;game.raid=null;game.vacuum=null;game.bossQueue=[];game.ultimatePending=false;game.rewards=[];game.pendingLevels=0;",
" settings.fx=fx;const p=player;p.maxHp=1e8;p.hp=p.maxHp;p.iframes=1e4;p.shotTimer=.15;",
" p.spikeCount=6;p.spikeDamage=340;p.spikePeriod=1.7;p.spikeTimer=.05;p.spikeArea=20;",
" p.boltCount=1;p.boltDamage=380;p.boltJumps=6;p.boltReach=310;p.boltPeriod=1.5;p.boltTimer=.05;",
" p.iceBallCount=4;p.iceBallDamage=120;p.iceBallTimer=.15;p.empRadius=160;p.empDps=160;",
" p.magmaLevel=4;p.magmaTimer=.25;p.rocketCd=3;p.rocketTimer=.3;",
" p.windCount=3;p.windTimer=.2;p.rockWalls=5;p.meteorCount=1;p.meteorTimer=.3;",
" if(ship==='dog'){p.dogChicks=5;p.dogBones=4;p.dogEggRate=1.2;p.dogBoneRange=260;p.dogEggDamage=85;}",
" enemies=[];hostile=[];shots=[];zones=[];gusts=[];particles=[];enemyIndexReady=false;",
" const count=ship==='dog'?125:115;",
" for(let i=0;i<count;i++){const angle=2*Math.PI*i/count,rad=Math.min(W,H)*(.20+(i%4)*.035);",
"  const e=spawnEnemy(i%7===0?'shooter':'drone',{x:clamp(p.x+Math.cos(angle)*rad,20,W-20),y:clamp(p.y+Math.sin(angle)*rad,20,H-20)});e.hp=1e7;e.maxHp=1e7;}",
" for(let i=0;i<130;i++){const a=2*Math.PI*i/130;hostileShot(clamp(p.x+Math.cos(a)*150,20,W-20),clamp(p.y+Math.sin(a)*150,20,H-20),a+Math.PI/2,78,2,2.3,'#ff99be',7);}",
" return {ship:p.shipType,gameMode:game.gameMode,initialEnemies:enemies.length,initialHostile:hostile.length,elapsed:game.total,fx:settings.fx};",
"},",
"snapshot(){const p=player,perf=window.ankinPerformanceReport();return {ship:p.shipType,fx:settings.fx,clock:game.total,",
" spikeGroups:p.spikeGroups.length,spikeVisuals:p.spikeVisuals.length,boltVisuals:p.boltVisuals.length,",
" countEnemies:enemies.length,countShots:shots.length,countZones:zones.length,countGusts:gusts.length,",
" frame:perf?.frame,simulation:perf?.simulation,drawing:perf?.drawing,active:mode};}",
"};"
].join('\n');
test('synthetic 30+ minute elemental stress across all five ships, NORMAL/SIMPLE and CHALLENGE-length timestamps',async({page},testInfo)=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const original=await route.fetch(),html=await original.text();
  if(!html.includes(anchor))throw Error('Stress hook anchor moved');
  await route.fulfill({response:original,body:html.replace(anchor,injection+'\n'+anchor)});
 });
 await page.goto('./');
 const results=[];
 const cases=[['shot','normal',1950],['laser','simple',1950],['charge','normal',1950],['drill','simple',1950],['dog','normal',1950],['dog','simple',900]];
 for(const [ship,fx,elapsed] of cases){
  const setup=await page.evaluate(args=>window.__reforgeStress.setup(...args),[ship,fx,elapsed]);
  await page.waitForTimeout(1050);
  const s=await page.evaluate(()=>window.__reforgeStress.snapshot());
  expect(setup.ship).toBe(ship);expect(setup.gameMode).toBe(elapsed===900?'challenge':'normal');expect(setup.initialEnemies).toBeGreaterThan(60);expect(setup.initialHostile).toBeGreaterThan(80);
  expect(s.spikeGroups).toBeLessThanOrEqual(3);expect(s.spikeVisuals).toBeLessThanOrEqual(28);expect(s.boltVisuals).toBeLessThanOrEqual(22);
  expect(s.countEnemies).toBeGreaterThan(60);expect(s.countShots).toBeLessThan(500);expect(s.countZones).toBeLessThan(150);
  expect(s.frame?.samples||0).toBeGreaterThan(10);expect(s.frame.p95Ms).toBeGreaterThan(0);
  expect(s.simulation.p95Ms).toBeGreaterThanOrEqual(0);expect(s.drawing.p95Ms).toBeGreaterThanOrEqual(0);
  results.push({ship,fx,elapsed,frameP95:s.frame.p95Ms,simP95:s.simulation.p95Ms,drawP95:s.drawing.p95Ms,counts:{shots:s.countShots,zones:s.countZones,enemies:s.countEnemies}});
 }
 console.log('REFORGE STRESS: '+JSON.stringify(results));
 await testInfo.attach('reforge-stress.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 expect(errors).toEqual([]);
});
