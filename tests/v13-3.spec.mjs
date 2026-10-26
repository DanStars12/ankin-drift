import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe="window.__v133={\nreset(mins=1){\n newRun();state('playing');game.total=mins*60;game.spawn=99999;game.nextBossAt=99999;game.bossQueue=[];game.rewards=[];game.raid=null;\n enemies=[];boss=null;hostile=[];shots=[];hazards=[];player.iframes=10000;player.shotTimer=999999;player.dmg=0;\n return {mode};\n},\nhud(){hudUpdate();return {hp:U('hpText').textContent,shield:U('shieldText').textContent,fill:U('shieldFill').style.width,nova:U('energyText').textContent};},\ncap(){player.rate=player.limitRate;player.multishot=player.limitShot;player.droneCount=player.limitDrones;player.orbit=player.limitOrbit;player.dashCd=.7;player.explosion=.85;player.echoShots=.75;player.novaGain=1.55;player.crit=1;player.drillDecay=.10;\n return {normal:selectable(SKILLS).map(c=>c.id),minor:selectable(POWERS).map(c=>c.id),exhaustedSupply:(()=>{const saved=SKILLS.map(c=>c.available);return skillHasRoom(SKILLS.find(c=>c.id==='fire'));})()};},\nfreeze(){\n const e=spawnEnemy('brute',{x:W-35,y:H-35});player.freezeDuration=15;const original=Math.random;Math.random=()=>0;\n chillEnemy(e,2,1);Math.random=original;const initial={frozen:e.frozen,resist:e.freezeResist};\n chillEnemy(e,3,1);const refresh=e.frozen;\n for(let i=0;i<130;i++){e.slow=0;drive(1/60)}\n const thaw={frozen:e.frozen,resist:e.freezeResist};\n const saved=Math.random;Math.random=()=>0;chillEnemy(e,3,1);Math.random=saved;\n return {initial,refresh,thaw,retryFrozen:e.frozen};\n},\nbomb(){\n const e=spawnEnemy('bomber',{x:player.x+75,y:player.y});e.hp=100000;e.maxHp=100000;\n player.iframes=0;player.shieldMax=150;player.shield=150;player.hp=100;game.spawn=99999;\n const before=enemies.length;for(let i=0;i<90;i++)drive(1/60);\n return {dead:e.dead,shield:player.shield,hp:player.hp,enemyCount:enemies.length,before,hazards:hazards.filter(h=>h.type==='blast').length};\n},\nwarp(){\n const existing=spawnEnemy('guard',{x:52,y:73}),loc=[existing.x,existing.y];\n const raid={kind:'iso',effects:['iso'],tier:2};game.raid=raid;\n const e=spawnIsoArrival(raid,'shooter');\n return {oldMoved:existing.x!==loc[0]||existing.y!==loc[1],created:!!e,portal:e?.isoWarp,untouchable:e?isVisibleAutoTarget(e):null,initialCount:enemies.length};\n},\nbalance(){return {early:enemySpawnInterval(8),late:enemySpawnInterval(38),hpEarly:1+8*.36+8*8*.061+8**3*.00085,hpLate:1+38*.36+38*38*.061+38**3*.00085,weights8:enemyWeightsAt(8),weights38:enemyWeightsAt(38),pop8:enemyPopulationLimit(8),pop38:enemyPopulationLimit(38)}},\ncodex(){return enemyCodexList()}\n};";
async function prepare(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('v13.3 test-injection anchor changed');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('shield HUD is between HP and NOVA and reflects current/max values',async({page})=>{
 const errors=await prepare(page);
 const result=await page.evaluate(()=>{window.__v133.reset(2);player.shieldMax=250;player.shield=125;return window.__v133.hud()});
 expect(result.shield).toBe('125 / 250');expect(result.fill).toBe('50%');
 expect(await page.locator('#shieldText').count()).toBe(1);
 const order=await page.locator('#hpFill,#shieldFill,#energyFill').evaluateAll(nodes=>nodes.map(n=>n.id));
 expect(order).toEqual(['hpFill','shieldFill','energyFill']);expect(errors).toEqual([]);
});
test('maxed skills are excluded but useful damage upgrades remain',async({page})=>{
 const errors=await prepare(page);
 const r=await page.evaluate(()=>{window.__v133.reset(7);return window.__v133.cap()});
 for(const id of ['fire','fan','minorDrone','squad','dash','blast','echo','battery','critical'])expect(r.normal).not.toContain(id);
 for(const id of ['escort','satellite'])expect(r.minor).not.toContain(id);
 expect(r.normal).toContain('damage');
 expect(errors).toEqual([]);
});
test('freeze lasts 2 seconds maximum, is not refreshed and has cooldown',async({page})=>{
 const errors=await prepare(page);
 const r=await page.evaluate(()=>{window.__v133.reset(3);return window.__v133.freeze()});
 expect(r.initial.frozen).toBeLessThanOrEqual(2);expect(r.initial.frozen).toBeGreaterThan(0);
 expect(r.refresh).toBe(r.initial.frozen);
 expect(r.thaw.frozen).toBe(0);expect(r.thaw.resist).toBeGreaterThan(0);
 expect(r.retryFrozen).toBe(0);expect(errors).toEqual([]);
});
test('crawler stops and shield absorbs its player-only explosion',async({page})=>{
 const errors=await prepare(page);
 const r=await page.evaluate(()=>{window.__v133.reset(15);return window.__v133.bomb()});
 expect(r.dead).toBe(true);
 expect(r.shield).toBeLessThan(150);
 expect(r.hp).toBe(100);
 expect(errors).toEqual([]);
});
test('ISO protocol warns at spawn point without moving existing enemy; late shooter pressure grows',async({page})=>{
 const errors=await prepare(page);
 const r=await page.evaluate(()=>{window.__v133.reset(30);return {warp:window.__v133.warp(),balance:window.__v133.balance()}});
 expect(r.warp.oldMoved).toBe(false);expect(r.warp.created).toBe(true);expect(r.warp.portal.time).toBeGreaterThan(0);
 expect(r.warp.untouchable).toBe(false);
 expect(r.balance.late).toBeLessThan(r.balance.early);
 expect(r.balance.pop38).toBeGreaterThan(r.balance.pop8);
 const shooter=(a)=>a.find(x=>x.type==='shooter').weight;
 expect(shooter(r.balance.weights38)).toBeGreaterThan(shooter(r.balance.weights8));
 expect(errors).toEqual([]);
});
test('final boss codex is accessible after first clear while save retains old records',async({page})=>{
 const errors=await prepare(page);
 expect(await page.evaluate(()=>AnkinArchive.read().clears.length)).toBe(0);
 await page.evaluate(()=>{
 const r=AnkinArchive.read();r.clears.unshift({id:'win-1',mode:'normal',date:'2026-10-27T00:00:00Z',level:48,time:1800,damage:400000,ship:'shot'});
 AnkinArchive.write(r);
 });
 await page.evaluate(()=>{window.__v133.reset(3);});
 const html=await page.evaluate(()=>window.__v133.codex());
 expect(html).toContain('THE・END・OF・ANKIN');
 expect(errors).toEqual([]);
});
