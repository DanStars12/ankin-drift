import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe="window.__v134={\nreset(){newRun();state('playing');game.total=300;game.nextBossAt=999999;game.spawn=999999;game.nextRaidAt=999999;game.nextRelicAt=999999;game.nextVacuumAt=999999;enemies=[];shots=[];hostile=[];zones=[];gusts=[];boss=null;player.iframes=100;player.shotTimer=99999;return {freezeChance:player.freezeChance}},\nfamilies(){\n const defaults=window.__v134.reset();const items=['missileFlare','magmaPulse','iceBall','empPulse','meteorSeed'];const found={};\n for(const id of items){const p=initialP();applyShipPreset(p);skillById(id).apply(p);found[id]={rocket:p.rocketCd,magma:p.magmaLevel,ice:p.iceBallCount,pulse:p.empRadius,meteor:p.meteorCount,tags:skillById(id).tags};}\n return {defaults,found};\n},\nice(){window.__v134.reset();const e=spawnEnemy('brute',{x:player.x+105,y:player.y});e.hp=e.maxHp=100000;\n player.iceBallCount=1;player.iceBallTimer=0;tickIndependentElements(1/60);\n const ball=shots.find(x=>x.kind==='iceball');const original=Math.random;Math.random=()=>0;projectileHit(ball,e);Math.random=original;\n const hit={slow:e.slow,frozen:e.frozen,kind:ball.kind,source:ball.source};\n const other=spawnEnemy('drone',{x:player.x+135,y:player.y});other.hp=100000;applySlow(other,2);const slow={slow:other.slow,frozen:other.frozen};\n return {hit,slow};\n},\nrock(){window.__v134.reset();player.meteorCount=1;player.meteorTimer=0;tickIndependentElements(.02);const m=shots.find(b=>b.kind==='meteor');\n const initial=m?.r,damage=m?.damage,again=shots.length;player.meteorTimer=0;tickIndependentElements(.02);\n const multiple=shots.filter(b=>b.kind==='meteor').length;\n m.meteorDistance+=300;m.r=Math.min(m.meteorMaxRadius,12+m.meteorDistance*.065);\n const grown=m.r;const before=player.rockWalls;applyElementFusionStats(player,{main:'rock',sub:'ice',resonance:8});\n return {initial,grown,damage,afterDamage:m.damage,multiple,meteor:player.meteorCount,wallBefore:before,wallAfter:player.rockWalls,diamond:!!player.elementMods?.diamondWall};\n},\nfire(){window.__v134.reset();player.magmaLevel=3;player.burnChance=0;const e=spawnEnemy('brute',{x:player.x+75,y:player.y});e.hp=e.maxHp=100000;\n projectileHit({x:e.x,y:e.y,vx:10,vy:10,damage:100,kind:'rocket',source:'rocket'},e);\n return {magmaZones:zones.filter(z=>z.type==='magma').length,burn:e.burn};\n},\nfusion(){window.__v134.reset();player.rockWalls=1;player.meteorCount=1;applyElementFusionStats(player,{main:'rock',sub:'fire',resonance:8});return {wall:player.rockWalls,meteor:player.meteorCount,meteorWall:player.elementMods.meteorWall};},\nmeta(){return {recipes:ELEMENT_FUSION_RECIPES.length,iceBall:!!skillById('iceBall'),emp:!!skillById('empPulse'),meteor:!!skillById('meteorSeed'),diamond:ELEMENT_FUSION_RECIPES.find(r=>r.id==='rock_ice')?.name,wind:skillById('windOrigin').name};}\n};";
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('Elemental probe anchor changed');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('independent elemental attack families and correct skill tags',async({page})=>{
 const errors=await setup(page);const v=await page.evaluate(()=>window.__v134.families());
 expect(v.defaults.freezeChance).toBe(0);
 expect(v.found.missileFlare.rocket).toBeGreaterThan(0);expect(v.found.missileFlare.magma).toBe(0);
 expect(v.found.magmaPulse.magma).toBeGreaterThan(0);expect(v.found.magmaPulse.rocket).toBe(0);
 expect(v.found.iceBall.ice).toBe(1);expect(v.found.iceBall.pulse).toBe(0);
 expect(v.found.empPulse.pulse).toBeGreaterThan(0);expect(v.found.empPulse.ice).toBe(0);
 expect(v.found.meteorSeed.meteor).toBe(1);expect(v.found.meteorSeed.magma).toBe(0);
 expect(v.found.iceBall.tags).toContain('アイスボール');expect(v.found.empPulse.tags).toContain('パルス');
 expect(v.found.meteorSeed.tags).toContain('隕石');expect(errors).toEqual([]);
});
test('iceball freezes without SLOW; independent SLOW does not freeze',async({page})=>{
 const errors=await setup(page);const v=await page.evaluate(()=>window.__v134.ice());
 expect(v.hit.kind).toBe('iceball');expect(v.hit.source).toBe('iceball');
 expect(v.hit.frozen).toBeGreaterThan(0);expect(v.hit.slow).toBe(0);
 expect(v.slow.slow).toBeGreaterThan(0);expect(v.slow.frozen).toBe(0);expect(errors).toEqual([]);
});
test('only one growing piercing meteor; Diamond Rock now upgrades the owned wall A weapon',async({page})=>{
 const errors=await setup(page);const v=await page.evaluate(()=>window.__v134.rock());
 expect(v.initial).toBe(12);expect(v.grown).toBeGreaterThan(v.initial);
 expect(v.afterDamage).toBe(v.damage);expect(v.multiple).toBe(1);
 expect(v.diamond).toBe(true);expect(v.meteor).toBe(1);
 expect(v.wallAfter).toBeGreaterThan(v.wallBefore);expect(errors).toEqual([]);
});
test('missile burns without generating magma; Meteo Shield buffs walls without deleting meteor',async({page})=>{
 const errors=await setup(page);const fire=await page.evaluate(()=>window.__v134.fire());
 expect(fire.magmaZones).toBe(0);expect(fire.burn).toBeGreaterThan(0);
 const rock=await page.evaluate(()=>window.__v134.fusion());
 expect(rock.wall).toBeGreaterThan(1);expect(rock.meteor).toBe(1);expect(rock.meteorWall).toBe(1);
 expect(errors).toEqual([]);
});
test('five elements, twenty directed fusions and renamed cyclone/diamond',async({page})=>{
 const errors=await setup(page);const v=await page.evaluate(()=>window.__v134.meta());
 expect(v.recipes).toBe(20);expect(v.iceBall&&v.emp&&v.meteor).toBe(true);
 expect(v.diamond).toBe('ダイヤモンド・ロック');expect(v.wind).toBe('サイクロン');
 expect(errors).toEqual([]);
});
