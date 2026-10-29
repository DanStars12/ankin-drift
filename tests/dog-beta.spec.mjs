import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`
window.__dogTest={
 reset(mode='normal'){
  selectedShip='dog';selectedGameMode=mode;newRun();state('playing');
  game.total=0;game.spawn=999999;game.nextBossAt=999999;game.nextRaidAt=999999;game.nextRelicAt=999999;game.nextVacuumAt=999999;
  enemies=[];shots=[];hostile=[];zones=[];gusts=[];boss=null;player.iframes=100;soundOn=false;
 },
 catalog(){
  this.reset();
  return {
   ship:SHIPS.dog.jp,beta:SHIPS.dog.sub.includes('β'),
   dogSkillCount:SKILLS.filter(x=>x.shipOnly==='dog').length,
   dogPowerCount:POWERS.filter(x=>x.shipOnly==='dog').length,
   dogLegendCount:LEGENDS.filter(x=>x.shipOnly==='dog').length,
   dogRelics:RELICS.filter(x=>x.shipOnly==='dog').length,
   dogFusions:activeFusions().filter(x=>x.shipOnly==='dog').length,
   dogSynergies:activeSynergies().filter(x=>x.shipOnly==='dog').length,
   dogOnly:selectable(SKILLS).filter(x=>x.shipOnly==='dog').map(x=>x.id),
   noOtherDrone:!selectable(SKILLS).some(x=>['minorDrone','squad','orbit','rocket','iceBall'].includes(x.id)),
   exact:!!skillById('dogFox')&&skillById('dogFox').name==='フォックスミサイル'&&skillById('dogHamMeteor').name==='ハム・スターメテオ'&&skillById('dogDuet').name==='ドルフィン・デュエット'
  };
 },
 bone(){
  this.reset();shoot();
  const first=shots[0],origin={count:shots.length,kind:first?.kind,pierce:first?.pierce,range:first?.range};player.shotTimer=99999;
  for(let i=0;i<160;i++)drive(.016);
  return {...origin,remainingBones:shots.filter(b=>b.kind==='bone').length};
 },
 nova(){
  this.reset();player.energy=100;player.novaCooldown=0;nova();
  return {bones:shots.filter(b=>b.kind==='bone'&&b.novaBone).length,energy:player.energy,cooldown:player.novaCooldown};
 },
 chick(){
  this.reset();player.dogChicks=4;game.total=899.9;tickDogChicks(.01);const before=player.dogChickenEvolved;
  game.total=900.1;tickDogChicks(.01);const evolved=player.dogChickenEvolved;
  player.dogChicks++;tickDogChicks(.01);const newCount=player.dogChicks;
  this.reset('challenge');player.dogChicks=2;game.total=479.9;tickDogChicks(.01);const early=player.dogChickenEvolved;
  game.total=480.1;tickDogChicks(.01);
  return {before,evolved,newCount,early,challenge:player.dogChickenEvolved};
 },
 attacks(){
  this.reset();
  ['dogDolphin','dogDuet','dogHurricane','dogFox','dogPawLava','dogRabbit','dogCat','dogHamMeteor','dogHedgehog','dogChick'].forEach(id=>{
   const c=skillById(id);c.apply(player);game.skills[id]=1;
  });
  game.total=20;game.spawn=99999;
  const e=spawnEnemy('drone',{x:player.x+130,y:player.y});e.hp=e.maxHp=100000;refreshEnemyIndex();
  tickIndependentElements(.2);tickDogChicks(2.5);tickGusts(.2);
  const initial={orbit:player.orbit,duet:player.dogDolphinDuet,wind:player.windCount,fox:player.rocketCd,
   lava:player.magmaLevel,ice:player.iceBallCount,cat:player.rockWalls,ham:player.meteorCount,
   emp:player.empRadius,chicks:player.dogChicks,eggShots:shots.filter(b=>b.kind==='dogEgg').length};
  for(let i=0;i<150;i++)drive(.016);
  return {...initial,foxShots:shots.filter(b=>b.kind==='rocket').length,meteorDamage:player.meteorDamage};
 },
 archive(){
  const r=record.read();
  const all=['fragile','onslaught','armored','swift','vicious','ironclad','ballistic','famine','novaTax','dashTax','repairTax'];
  r.clears.unshift({id:'dog-test-clear',mode:'normal',time:1800,level:18,damage:1100,date:'2026-10-27T08:00:00.000Z',ship:'dog',challenges:all});
  const ok=record.write(r),saved=record.read().clears[0],ending=AnkinEnding.create({ship:'dog',mode:'normal',level:18,seconds:1800,damage:1100,kills:200,damageStats:{shot:700,dogEgg:400}});
  return {ok,ship:saved.ship,challenges:saved.challenges,endingShip:ending.frameName||ending.title||'',awards:AnkinArchive.progress().filter(x=>x.id==='dog_clear').length};
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('DOG beta injection anchor changed');
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('dog neon ship is playable from title and displays build LAB',async({page,isMobile})=>{
 const errors=await setup(page);
 await expect(page.locator('[data-ship="dog"]')).toBeVisible();
 await expect(page.locator('[data-ship="dog"] .dog-frame-icon path')).toHaveCount(9);
 await expect(page.locator('[data-ship="dog"] .dog-beta')).toHaveCount(0);
 await page.locator('[data-ship="dog"]').click();
 await page.locator('#openTitleLab').click();
 await expect(page.locator('#atlasResults')).toBeVisible();
 await page.locator('#back').click();
 await page.locator('#start').click();
 await expect(page.locator('#guideContinue')).toBeVisible();
 await page.locator('#guideContinue').click();
 await expect(page.locator('#hud')).toBeVisible();
 await expect(page.locator('#overlay')).toBeHidden();
 await page.waitForTimeout(480);
 expect(errors).toEqual([]);
});
test('dog skill pools contain dedicated animals, eleven relics and expanded fusions',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__dogTest.catalog());
 expect(x.beta).toBeFalsy();
 expect(x.dogSkillCount).toBeGreaterThanOrEqual(24);
 expect(x.dogPowerCount).toBeGreaterThanOrEqual(6);
 expect(x.dogLegendCount).toBeGreaterThanOrEqual(5);
 expect(x.dogRelics).toBeGreaterThanOrEqual(11);expect(x.dogFusions).toBeGreaterThanOrEqual(4);
 expect(x.dogSynergies).toBeGreaterThanOrEqual(5);
 expect(x.noOtherDrone&&x.exact).toBeTruthy();
 expect(x.dogOnly).toContain('dogChick');expect(errors).toEqual([]);
});
test('bone shots actually return and BOW SHOCK fires exactly eight bones',async({page})=>{
 const errors=await setup(page),a=await page.evaluate(()=>window.__dogTest.bone());
 expect(a.count).toBe(1);expect(a.kind).toBe('bone');
 expect(a.pierce).toBeGreaterThan(100);expect(a.remainingBones).toBe(0);
 const b=await page.evaluate(()=>window.__dogTest.nova());
 expect(b.bones).toBe(8);expect(b.energy).toBe(0);expect(b.cooldown).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('chick flock collectively evolves at 15:00 normal / 8:00 challenge',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__dogTest.chick());
 expect(x).toEqual({before:false,evolved:true,newCount:5,early:false,challenge:true});
 expect(errors).toEqual([]);
});
test('dog animal skills enable real projectiles, cat defense and fox attacks',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__dogTest.attacks());
 expect(x).toMatchObject({orbit:1,duet:1,wind:1,fox:1,lava:1,ice:1,cat:1,ham:1,chicks:1});
 expect(x.emp).toBeGreaterThan(0);
 expect(x.eggShots).toBeGreaterThan(0);
 expect(x.meteorDamage).toBeGreaterThan(70);
 expect(errors).toEqual([]);
});
test('archive records dog clears and all eleven trial choices',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__dogTest.archive());
 expect(x.ok).toBeTruthy();expect(x.ship).toBe('dog');
 expect(x.challenges).toHaveLength(11);expect(x.awards).toBe(1);
 expect(x.endingShip).toMatch(/ドッグ|BONE BUDDY/);
 expect(errors).toEqual([]);
});
