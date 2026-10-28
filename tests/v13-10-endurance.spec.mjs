import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe="\nwindow.__enduranceV1310={\n reset(ship='dog'){\n  selectedShip=ship;selectedGameMode='normal';newRun();state('playing');\n  game.total=1800;game.level=64;game.spawn=999999;\n  game.nextBossAt=999999;game.nextRaidAt=999999;game.nextRelicAt=999999;\n  enemies=[];hostile=[];shots=[];gusts=[];zones=[];particles=[];boss=null;\n  player.iframes=100;player.shotTimer=99999;soundOn=false;\n },\n fused(){\n  game.elementCombos=[{main:'fire',sub:'ice',resonance:4,cards:3},{main:'wind',sub:'rock',resonance:3,cards:2}];\n  game.sealedElements=['ice','rock'];\n },\n inspect(ship){\n  this.reset(ship);const before=selectable(SKILLS);\n  const preResonance=before.filter(c=>c.tags?.includes('共鳴')).map(c=>c.id);\n  this.fused();const eligible=selectable(SKILLS);\n  const late=ENDURANCE_SKILLS.filter(c=>eligible.includes(c)).map(c=>c.id);\n  const sealed=eligible.filter(c=>isSealedCard(c)).map(c=>c.id);\n  const draws=Array.from({length:20},()=>offerCards('normal').map(c=>c.id));\n  return {ship,preResonance,eligible:eligible.length,late,sealed,draws,\n   notDog:ship==='dog'?eligible.filter(c=>c.shipOnly&&c.shipOnly!=='dog').map(c=>c.id):[]};\n },\n cap(){\n  this.reset('dog');this.fused();\n  const a=skillById('dogEndBoneTorque'),b=skillById('endFireFuel'),c=skillById('dogEndEggCare');\n  const start={bone:player.dogBonePower,fire:player.magmaDps};\n  a.apply(player);game.skills[a.id]=1;player.magmaLevel=1;\n  b.apply(player);game.skills[b.id]=1;\n  game.skills[a.id]=9;game.skills[b.id]=7;\n  const eligible=selectable(SKILLS);\n  return {start,after:{bone:player.dogBonePower,fire:player.magmaDps},\n   capped:[eligible.some(x=>x.id===a.id),eligible.some(x=>x.id===b.id)],\n   noChick:eligible.some(x=>x.id===c.id)};\n },\n mainElements(){\n  this.reset('dog');const summary={};\n  for(const name of ['fire','ice','thunder','wind','rock']){\n   game.sealedElements=[];game.elementCombos=[{main:name,sub:'other',resonance:4,cards:3}];\n   summary[name]=selectable(SKILLS).filter(c=>c.tags?.includes('共鳴')).map(c=>c.id);\n  }return summary;\n },\n staleChoice(){\n  this.reset('dog');this.fused();\n  const c=skillById('dogRabbit');choices=[c];state('choice');choose(0);\n  return {taken:!!game.skills.dogRabbit,stillChoice:mode==='choice',sealed:game.sealedElements.slice()};\n },\n crowded(){\n  this.reset('dog');this.fused();\n  for(const c of ENDURANCE_SKILLS.filter(c=>selectable(SKILLS).includes(c)).slice(0,12)){\n   c.apply(player);game.skills[c.id]=(game.skills[c.id]||0)+1;\n  }\n  settings.fx='simple';renderHeavyLoad=true;player.empRadius=108;player.empDps=130;\n  const start=performance.now();\n  for(let i=0;i<4;i++){drawTeslaField(player);render();}\n  return {ms:performance.now()-start,hp:player.hp,maxHp:player.maxHp,\n   stats:[player.dmg,player.novaDamage,player.empDps,player.dogBonePower].every(Number.isFinite)};\n }\n};\n";
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  if(!html.includes(anchor))throw Error('v13.10 probe anchor changed');
  await route.fulfill({response:res,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
for(const ship of ['shot','laser','charge','drill','dog']){
 test('late-game fused skill pool retains 3 real choices for '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(ship=>window.__enduranceV1310.inspect(ship),ship);
  expect(r.preResonance).toEqual([]);expect(r.eligible).toBeGreaterThan(12);
  expect(r.late).toContain('endHull');expect(r.late).toContain('endFireFuel');
  expect(r.late).toContain('endWindCurrent');
  expect(r.late).not.toContain('endIceCrystal');expect(r.late).not.toContain('endRockCore');
  expect(r.sealed).toEqual([]);expect(r.notDog).toEqual([]);
  for(const draw of r.draws){expect(draw).toHaveLength(3);expect(draw.every(id=>!id.startsWith('supply_'))).toBe(true);}
  expect(errors).toEqual([]);
 });
}
test('each primary fusion unlocks exactly two matching resonance cards',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__enduranceV1310.mainElements());
 for(const [main,ids] of Object.entries(r)){expect(ids).toHaveLength(2);expect(ids.every(id=>id.toLowerCase().includes(main))).toBe(true);}
 expect(errors).toEqual([]);
});
test('capped stacks and unmet animal prerequisites do not waste selection slots',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__enduranceV1310.cap());
 expect(r.after.bone).toBeGreaterThan(r.start.bone);expect(r.after.fire).toBeGreaterThan(r.start.fire);
 expect(r.capped).toEqual([false,false]);expect(r.noChick).toBe(false);expect(errors).toEqual([]);
});
test('stale choices cannot re-activate a consumed secondary element',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__enduranceV1310.staleChoice());
 expect(r.taken).toBe(false);expect(r.stillChoice).toBe(true);expect(r.sealed).toContain('ice');
 expect(errors).toEqual([]);
});
test('new endurance rewards stay out of the opening pool and unlock by level 20',async({page})=>{
 const errors=await setup(page);
 const r=await page.evaluate(()=>{
  window.__enduranceV1310.reset('dog');game.level=1;game.total=0;
  const early=selectable(SKILLS).filter(c=>c.id.startsWith('end')||c.id.startsWith('dogEnd')).map(c=>c.id);
  game.level=20;
  const middle=selectable(SKILLS).filter(c=>c.id.startsWith('end')||c.id.startsWith('dogEnd')).map(c=>c.id);
  return {early,middle};
 });
 expect(r.early).toEqual([]);expect(r.middle).toContain('endHull');
 expect(r.middle).toContain('dogEndBoneTorque');expect(errors).toEqual([]);
});
test('dense dog effects and new upgrades remain finite in SIMPLE mode',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__enduranceV1310.crowded());
 expect(r.ms).toBeLessThan(5000);expect(r.stats).toBe(true);expect(r.hp).toBeLessThanOrEqual(r.maxHp);
 expect(errors).toEqual([]);
});
