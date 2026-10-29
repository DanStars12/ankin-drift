import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=[
 "window.__fusionProbe={",
 "reset(level,elements=[],consumed=[]){",
 " newRun();game.level=level;game.pendingLevels=0;game.rewards=[];game.bossQueue=[];game.ultimatePending=false;",
 " game.skills={};game.acquisitionLog=[];game.elementCombos=[];game.sealedElements=[];game.fusionMilestoneIndex=0;game.fusionMilestoneResults=[];",
 " if(consumed.length){game.elementCombos.push({main:consumed[0],sub:consumed[1],weapon:'A',resonance:2,cards:1});game.sealedElements.push(consumed[1]);game.fusionMilestoneIndex=1;game.fusionMilestoneResults=['fused'];}",
 " state('playing');return window.__fusionProbe.add(elements);",
 "},",
 "add(elements=[]){",
 " for(const element of elements){",
 "  const id=({fire:'emberSeed',ice:'iceBall',thunder:'empPulse',wind:'windOrigin',rock:'stoneSeed'})[element];const c=skillById(id);",
 "  if(!c)throw Error('Missing elemental skill: '+element);",
 "  game.skills[c.id]=1;game.acquisitionLog.push(c.id);c.apply(player);",
 " }",
 " processTransitions();return window.__fusionProbe.inspect();",
 "},",
 "inspect(){return {mode,level:game.level,used:game.elementCombos.length,usable:ownedElementKeys(),pairs:availableElementPairs(),hasSelector:!!document.querySelector('.fusion-unlock'),pendingRewards:game.rewards.length};},",
 "reward(){game.rewards.push('minor');processTransitions();return window.__fusionProbe.inspect();}",
 "};"
].join('\n');
async function prepare(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('Fusion scheduler probe anchor changed');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');
 return errors;
}
test('0 or 1 attribute at Lv12 skips fusion and allows ordinary boss rewards',async({page})=>{
 const errors=await prepare(page);
 const none=await page.evaluate(()=>window.__fusionProbe.reset(12,[]));
 expect(none.mode).toBe('playing');expect(none.pairs).toHaveLength(0);expect(none.hasSelector).toBe(false);
 const single=await page.evaluate(()=>window.__fusionProbe.reset(12,['fire']));
 expect(single.mode).toBe('playing');expect(single.pairs).toHaveLength(0);
 const reward=await page.evaluate(()=>window.__fusionProbe.reward());
 expect(reward.mode).toBe('choice');
 await expect(page.locator('.fusion-unlock')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('Lv12 with two elements enters fusion; Lv28 skips with 1 unused until 2 exist',async({page})=>{
 const errors=await prepare(page);
 const two=await page.evaluate(()=>window.__fusionProbe.reset(12,['fire','ice']));
 expect(two.mode).toBe('elementChoice');expect(two.pairs.length).toBeGreaterThan(0);
 await expect(page.locator('[data-element-main="fire"]')).toBeEnabled();
 const second=await page.evaluate(()=>window.__fusionProbe.reset(28,['fire','ice','thunder'],['fire','ice']));
 expect(second.mode).toBe('playing');expect(second.usable).toEqual(['thunder']);
 const later=await page.evaluate(()=>window.__fusionProbe.add(['rock']));
 expect(later.mode).toBe('elementChoice');expect(later.pairs).toHaveLength(2);
 await expect(page.locator('[data-element-main="thunder"]')).toBeEnabled();
 await expect(page.locator('[data-element-main="rock"]')).toBeEnabled();
 expect(errors).toEqual([]);
});
test('fusion is level-gated and can be obtained after initial 0–1 attribute skip',async({page})=>{
 const errors=await prepare(page);
 const before=await page.evaluate(()=>window.__fusionProbe.reset(11,['fire','wind']));
 expect(before.mode).toBe('playing');expect(before.pairs).toHaveLength(0);
 const later=await page.evaluate(()=>{
  window.__fusionProbe.reset(12,['fire']);
  return window.__fusionProbe.add(['wind']);
 });
 expect(later.mode).toBe('elementChoice');
 expect(later.usable).toEqual(['fire','wind']);
 expect(errors).toEqual([]);
});