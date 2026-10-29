import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`
window.__dogReforge={
 reset(ship='dog'){
  selectedShip=ship;selectedGameMode='normal';newRun();state('playing');
  game.level=36;game.total=1900;game.spawn=1e8;game.nextBossAt=1e8;game.nextRaidAt=1e8;
  enemies=[];shots=[];hostile=[];gusts=[];zones=[];boss=null;soundOn=false;
  return this.snapshot();
 },
 add(id){
  const c=skillById(id);if(!c)throw Error('Missing card '+id);
  const bucket=c.rarity==='power'?game.powers:c.rarity==='legendary'?game.legends:c.rarity==='relic'?game.relics:c.rarity==='unique'?game.uniques:game.skills;
  if(c.available&&!c.available(player))throw Error('Prerequisite not met: '+id);
  if(isSealedCard(c))throw Error('Sealed: '+id);
  c.apply(player);bucket[id]=(bucket[id]||0)+1;game.acquisitionLog.push(id);activateUpgrades();
  return this.snapshot();
 },
 seal(element){game.sealedElements.push(element);restorePlayerBuild();clearConsumedElementAttacks(element);return this.snapshot();},
 snapshot(){return {ship:player.shipType,wind:player.windCount,spike:player.spikeCount,
  bolt:player.boltCount,fox:player.rocketCd,meteor:player.meteorCount,rock:player.rockWalls,
  mods:[!!player.dogWhale,!!player.dogMoon,!!player.dogViper,!!player.dogNineTailMorph,!!player.dogArmorHam],
  fusions:Object.keys(game.fusions),relics:Object.keys(game.relics),sealed:[...game.sealedElements]};},
 reapply(){restorePlayerBuild();return this.snapshot();},
 pool(){return {ordinary:selectable(SKILLS).map(c=>c.id),power:selectable(POWERS).map(c=>c.id),
  legendary:selectable(LEGENDS).map(c=>c.id),relic:selectable(RELICS).map(c=>c.id)};},
 meta(){return {elements:Object.fromEntries(Object.keys(DOG_ELEMENT_ASSETS).map(k=>[k,DOG_ELEMENT_ASSETS[k].map(id=>({id,element:elementFromCard(skillById(id)),sealed:isSealedCard(skillById(id))}))])),
  mutationIds:SKILLS.filter(c=>c.mutation).map(c=>c.id),evolutions:FUSIONS.filter(c=>c.id.endsWith('Apex')).map(c=>c.id)};},
 prereqs(){
  return ['dogMutWhale','dogMutMoon','dogMutViper','dogMutNineTail','dogMutHam'].map(id=>({id,ready:!!skillById(id).available(player)}));
 },
 whale(){
  player.windTimer=0;gusts=[];tickGusts(.016);
  return gusts.map(g=>({whale:!!g.whale,r:g.r,bonus:g.bonus,kind:g.kind||'wind'}));
 },
 repeatedOffers(n=80){let bad=0,dogMax=0,minSize=10;
  for(let i=0;i<n;i++){const pool=offerCards('normal');minSize=Math.min(minSize,pool.length);
   const count=pool.filter(x=>x.shipOnly==='dog').length;dogMax=Math.max(dogMax,count);
   if(pool.some(x=>isSealedCard(x)||(x.mutation&&(!x.available||!x.available(player)))))bad++;
  }return{minSize,dogMax,bad};
 }
};`;
async function setup(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const r=await route.fetch(),html=await r.text();
  if(!html.includes(anchor))throw Error('DOG EVOLUTION test hook missing');
  await route.fulfill({response:r,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}

test('five DOG attributes have explicit owners and sealed cards stay out of every reward pool',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();
  const before=p.meta(),results={};
  for(const element of Object.keys(DOG_ELEMENT_ASSETS)){
   p.reset();p.seal(element);
   const all=Object.values(p.pool()).flat(),metadata=p.meta().elements[element];
   results[element]={typed:metadata.every(c=>c.element===element&&c.sealed),excluded:metadata.every(c=>!all.includes(c.id)),bone:!isSealedCard(skillById('dogBonePack'))};
  }
  return{before,results};
 });
 expect(result.before.mutationIds).toHaveLength(5);expect(result.before.evolutions).toHaveLength(5);
 for(const r of Object.values(result.results))expect(r).toEqual({typed:true,excluded:true,bone:true});
 expect(errors).toEqual([]);
});

test('mutation cards require the corresponding owned animal and persist after build reconstruction',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();
  const before=p.prereqs();
  ['dogHurricane','dogHare','dogSnake','dogFox','dogHamMeteor'].forEach(id=>p.add(id));
  const unlocked=p.prereqs();
  ['dogMutWhale','dogMutMoon','dogMutViper','dogMutNineTail','dogMutHam'].forEach(id=>p.add(id));
  const after=p.snapshot(),restored=p.reapply();
  return {before,unlocked,after,restored};
 });
 expect(result.before.every(x=>!x.ready)).toBe(true);
 expect(result.unlocked.every(x=>x.ready)).toBe(true);
 expect(result.after.mods).toEqual([true,true,true,true,true]);
 expect(result.restored.mods).toEqual(result.after.mods);
 expect(errors).toEqual([]);
});

test('whale mutation consolidates up to seven cyclones into exactly one bounded, stronger projectile',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();
  p.add('dogHurricane');const normal=p.whale();
  p.add('dogHurricane');p.add('dogHurricane');p.add('dogHurricane');p.add('dogMutWhale');
  const whale=p.whale();for(let i=0;i<10;i++)p.whale();
  return{normal,whale,active:gusts.length,shape:ANIMAL_OUTLINES.whale,paint:dogAnimalPalette('whale',player)};
 });
 expect(result.normal).toHaveLength(1);expect(result.normal[0].whale).toBe(false);
 expect(result.whale).toHaveLength(1);expect(result.whale[0].whale).toBe(true);
 expect(result.whale[0].bonus).toBeGreaterThan(result.normal[0].bonus);
 expect(result.whale[0].r).toBeGreaterThanOrEqual(result.normal[0].r);
 expect(result.whale[0].r).toBeLessThanOrEqual(165);
 expect(result.active).toBeLessThanOrEqual(16);
 expect(result.shape).toContain('C ');expect(result.paint).toHaveLength(2);expect(errors).toEqual([]);
});

test('five apex evolutions unlock on 3 materials and do not double-stack on restore',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();
  ['dogHurricane','dogHare','dogSnake','dogFox','dogHamMeteor'].forEach(id=>p.add(id));
  ['dogMutWhale','dogMutMoon','dogMutViper','dogMutNineTail','dogMutHam'].forEach(id=>p.add(id));
  ['dogPwrDolphin','dogHarePower','dogSnakeLegend','dogPwrFox','dogLegendHam'].forEach(id=>p.add(id));
  const after=p.snapshot(),stat={wind:player.windDps,spike:player.spikeDamage,bolt:player.boltDamage,rocket:player.missileBurnBonus,meteor:player.meteorDamage};
  p.reapply();
  const statAfter={wind:player.windDps,spike:player.spikeDamage,bolt:player.boltDamage,rocket:player.missileBurnBonus,meteor:player.meteorDamage};
  return{after,stat,statAfter,styles:[!!player.dogWhaleAscended,!!player.dogMoonAscended,!!player.dogViperAscended,!!player.dogNineTailAscended,!!player.dogArmorHamAscended]};
 });
 expect(result.after.fusions.filter(x=>x.endsWith('Apex'))).toHaveLength(5);
 expect(result.statAfter).toEqual(result.stat);
 expect(result.styles).toEqual([true,true,true,true,true]);
 expect(errors).toEqual([]);
});

test('consuming secondary wind stops whale and even owned wind legendaries while leaving neutral bones',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();p.add('dogHurricane');p.add('dogMutWhale');p.add('dogLegendSea');
  const before=p.snapshot();const sealed=p.seal('wind');const choices=p.pool(),rebuild=p.reapply();
  return{before,sealed,rebuild,choices,neutralSealed:isSealedCard(skillById('dogRelicReturnBone'))};
 });
 expect(result.before.mods[0]).toBe(true);
 expect(result.sealed.wind).toBe(0);expect(result.sealed.mods[0]).toBe(false);
 expect(result.rebuild.wind).toBe(0);expect(result.rebuild.mods[0]).toBe(false);
 for(const cards of Object.values(result.choices))expect(cards).not.toContain('dogLegendSea');
 expect(result.neutralSealed).toBe(false);expect(errors).toEqual([]);
});

test('late DOG offers remain complete, exclude invalid mutation prerequisites and include universal choices',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>{
  const p=window.__dogReforge;p.reset();
  const start=p.repeatedOffers();
  p.add('dogHurricane');p.add('dogHare');p.add('dogMutWhale');p.add('dogMutMoon');
  const built=p.repeatedOffers();
  return{start,built};
 });
 expect(result.start.minSize).toBe(3);expect(result.start.dogMax).toBeLessThanOrEqual(2);expect(result.start.bad).toBe(0);
 expect(result.built.minSize).toBe(3);expect(result.built.dogMax).toBeLessThanOrEqual(2);expect(result.built.bad).toBe(0);
 expect(errors).toEqual([]);
});
