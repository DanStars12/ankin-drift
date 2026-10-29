import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const inject=[
"window.__fusionReforgeProbe={",
"reset(level=12,elements=['ice','fire']){",
" selectedShip='shot';newRun();state('playing');game.level=level;game.rewards=[];game.pendingLevels=0;game.bossQueue=[];soundOn=false;",
" const map={fire:'emberSeed',ice:'iceBall',thunder:'empPulse',wind:'windOrigin',rock:'stoneSeed',spike:'frostSpike',bolt:'lightningBolt'};",
" for(const e of elements){const card=skillById(map[e]);if(!card)throw Error('Missing '+e);game.skills[card.id]=1;game.acquisitionLog.push(card.id);card.apply(player);}",
" processTransitions();return this.info();",
"},",
"info(){return{mode,level:game.level,stage:fusionStageIndex(),fused:game.elementCombos.length,results:[...game.fusionMilestoneResults],",
" combos:game.elementCombos.map(c=>({main:c.main,sub:c.sub,weapon:c.weapon})),available:availableElementPairs().length,bonus:player.fusionOutputBonus,",
" burnt:player.elementMods?.spikeBurn||0,spikes:player.spikeCount,rocket:player.rocketCd,damage:player.spikeDamage,",
" resonance:game.elementCombos.at(-1)?.resonanceRewards||[]};},",
"skip(){skipElementFusion();return this.info();},",
"next28(){state('playing');game.level=28;processTransitions();return this.info();},",
"step(main,sub){chooseFusionMain(main);selectElementFusion(sub);return {...elementChoice};},",
"fusion(main,sub,slot){chooseFusionMain(main);selectElementFusion(sub);selectFusionWeapon(slot);const selected={...elementChoice};",
" confirmElementFusion();return{...this.info(),selected};},",
"rebuild(){restorePlayerBuild();return this.info();},",
"catalog(){return {a:ELEMENT_FUSION_RECIPES.length,b:Object.keys(FUSION_B_VARIANTS).length,",
"  cases:Object.keys(ELEMENTS).flatMap(main=>Object.keys(ELEMENTS).filter(sub=>sub!==main).flatMap(sub=>['A','B'].map(slot=>({main,sub,slot,outcome:!!fusionOutcome(main,sub,slot)}))))};},",
"allStats(){const data=[];for(const main of Object.keys(ELEMENTS)){for(const sub of Object.keys(ELEMENTS)){if(main===sub)continue;",
" for(const slot of ['A','B']){const p=initialP();const w=FUSION_WEAPON_CHOICES[main][slot==='A'?0:1];p[w[2]]=1;",
" applyElementFusionStats(p,{main,sub,weapon:slot,resonance:6,cards:2});",
" data.push({main,sub,slot,bonus:p.fusionOutputBonus,weaponValue:p[w[2]],modCount:Object.keys(p.elementMods||{}).length});",
" }}}return data;}",
"};"
].join('\n');
async function setup(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/ankin-drift/',async route=>{
 const response=await route.fetch(),html=await response.text();if(!html.includes(anchor))throw Error('fusion probe anchor changed');
 await route.fulfill({response,body:html.replace(anchor,inject+'\n'+anchor)});
 });await page.goto('./');return errors;}
test('all 40 directed weapon fusion variants exist and produce finite stats',async({page})=>{
 const errors=await setup(page),result=await page.evaluate(()=>({catalog:window.__fusionReforgeProbe.catalog(),stats:window.__fusionReforgeProbe.allStats()}));
 expect(result.catalog.a).toBe(20);expect(result.catalog.b).toBe(20);expect(result.catalog.cases).toHaveLength(40);
 expect(result.catalog.cases.every(x=>x.outcome)).toBe(true);expect(result.stats).toHaveLength(40);
 expect(result.stats.every(x=>Math.abs(x.bonus-.17)<.0001&&Number.isFinite(x.weaponValue)&&x.weaponValue>0)).toBe(true);
 expect(errors).toEqual([]);
});
test('explicit Lv12 skip never grants two later fusions',async({page})=>{
 const errors=await setup(page);const at12=await page.evaluate(()=>window.__fusionReforgeProbe.reset(12,['ice','fire','thunder','wind']));
 expect(at12.mode).toBe('elementChoice');expect(at12.stage).toBe(0);
 const skip=await page.evaluate(()=>window.__fusionReforgeProbe.skip());
 expect(skip.mode).toBe('playing');expect(skip.results[0]).toBe('skipped');expect(skip.stage).toBe(1);expect(skip.fused).toBe(0);
 const next=await page.evaluate(()=>window.__fusionReforgeProbe.next28());
 expect(next.mode).toBe('elementChoice');expect(next.stage).toBe(1);
 const fused=await page.evaluate(()=>window.__fusionReforgeProbe.fusion('ice','fire','A'));
 expect(fused.stage).toBe(2);expect(fused.fused).toBe(1);expect(fused.results).toEqual(['skipped','fused']);
 expect(fused.bonus).toBeCloseTo(.17,4);expect(errors).toEqual([]);
});
test('ice spike B fusion consumes fire but retains inherited burn and exactly two resonance awards',async({page})=>{
 const errors=await setup(page);const before=await page.evaluate(()=>window.__fusionReforgeProbe.reset(12,['spike','fire']));
 expect(before.mode).toBe('elementChoice');
 await expect(page.locator('[data-element-main="ice"]')).toBeEnabled();
 const after=await page.evaluate(()=>window.__fusionReforgeProbe.fusion('ice','fire','B'));
 expect(after.selected).toEqual({main:'ice',sub:'fire',weapon:'B'});expect(after.fused).toBe(1);
 expect(after.rocket).toBe(0);expect(after.spikes).toBeGreaterThan(0);expect(after.burnt).toBe(1);
 expect(after.resonance).toHaveLength(2);
 const rebuild=await page.evaluate(()=>window.__fusionReforgeProbe.rebuild());
 expect(rebuild.damage).toBeCloseTo(after.damage,3);expect(rebuild.bonus).toBeCloseTo(after.bonus,4);expect(rebuild.burnt).toBe(1);
 expect(errors).toEqual([]);
});
test('unowned B weapon is disabled during fusion weapon selection',async({page})=>{
 const errors=await setup(page);
 await page.evaluate(()=>{window.__fusionReforgeProbe.reset(12,['ice','fire']);window.__fusionReforgeProbe.step('ice','fire');});
 await expect(page.locator('[data-fusion-weapon="A"]')).toBeEnabled();
 await expect(page.locator('[data-fusion-weapon="B"]')).toBeDisabled();
 expect(errors).toEqual([]);
});
