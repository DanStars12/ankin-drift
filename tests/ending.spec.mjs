import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
function injectScenario(){
 return [
 "window.__runPersonalEnding=(variant)=>{",
 "newRun();game.ultimateEncounterAt=1800;game.lastClearAt=0;",
 "game.level=54;game.total=1800;game.kills=1400;",
 "game.damage=1800000;game.bossDamage=780000;",
 "player.hp=variant==='close'?Math.round(player.maxHp*.08):Math.round(player.maxHp*.95);",
 "game.damageStats=variant==='close'?{drill:980000,magma:820000}:{laser:1550000,nova:250000};",
 "game.combatLog={dashCount:variant==='close'?38:7,novaCount:variant==='close'?5:2,hits:variant==='close'?11:0,damageTaken:variant==='close'?220:0};",
 "game.elementCombos=variant==='close'?[{main:'fire',sub:'wind'}]:[{main:'thunder',sub:'ice'}];",
 "game.fusions={fancyEvolution:true};game.relics={relicA:true};",
 "player.reviveUsed=0;",
 "game.finisherSource=variant==='close'?'drill':'laser';",
 "recordVictory();",
 "return {title:game.lastClear.title,story:game.lastClear.ending.story,ending:game.lastClear.ending,",
 " saved:AnkinArchive.read().clears.length,mode};",
 "};"
 ].join('\n');
}
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  if(!html.includes(anchor))throw Error('Personal Ending injection anchor changed');
  await route.fulfill({response:res,body:html.replace(anchor,injectScenario()+'\n'+anchor)});
 });
 await page.goto('./');
 return errors;
}
test('PERSONAL ENDING appears on victory and full reasons survive archive and reload',async({page,isMobile})=>{
 const errors=await setup(page);
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 const a=await page.evaluate(()=>window.__runPersonalEnding('close'));
 expect(a.title).toContain('紅蓮');
 expect(a.title).toContain('死線の生還者');
 expect(a.story).toContain('THE・END・OF・ANKIN');
 expect(a.ending.metrics.hits).toBe(11);
 expect(a.ending.metrics.dashCount).toBe(38);
 expect(a.ending.finisherSource).toBe('drill');
 await expect(page.locator('.personal-ending')).toContainText(a.title);
 await expect(page.locator('.personal-ending')).toContainText('THE・END・OF・ANKIN');
 await page.locator('#openArchive').click();
 const log=page.locator('.personal-log').first();
 await expect(log.locator('summary')).toContainText(a.title);
 await log.locator('summary').click();
 await expect(log).toContainText('ダッシュ 38');
 await expect(log).toContainText('被弾 11');
 await expect(log).toContainText('近接ドリル');
 await expect(log).toContainText('THE・END・OF・ANKIN');
 await page.reload();await page.locator('#openArchive').click();
 const restored=page.locator('.personal-log').first();
 await expect(restored.locator('summary')).toContainText(a.title);
 await restored.locator('summary').click();
 await expect(restored).toContainText(a.ending.story);
 const json=await page.evaluate(()=>AnkinArchive.exported());
 expect(JSON.parse(json).record.clears[0].ending.styleId).toBe('near_death');
 expect(errors).toEqual([]);
});
test('different fight styles generate distinct saved titles without altering older ones',async({page})=>{
 const errors=await setup(page);
 const first=await page.evaluate(()=>window.__runPersonalEnding('close'));
 const second=await page.evaluate(()=>window.__runPersonalEnding('other'));
 expect(first.title).not.toEqual(second.title);
 expect(second.title).toContain('無傷の伝説');
 await page.locator('#openArchive').click();
 const logs=page.locator('.personal-log');
 await expect(logs).toHaveCount(2);
 await expect(logs.nth(0)).toContainText(second.title);
 await expect(logs.nth(1)).toContainText(first.title);
 const stored=await page.evaluate(()=>AnkinArchive.read().clears.map(c=>c.title));
 expect(stored).toEqual([second.title,first.title]);
 expect(errors).toEqual([]);
});
test('v13.1 legacy clear remains readable with no invented combat lore',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ankin_drift_pilot_archive',JSON.stringify({
  format:'ankin-drift-archive',schemaVersion:2,updatedAt:'2026-10-25T00:00:00.000Z',
  record:{damage:900000,time:1800,level:37,runs:[],clears:[{
   id:'old-clear',ship:'shot',mode:'normal',time:1800,level:37,damage:900000,
   title:'以前のクリア称号',date:'2026-10-25T00:00:00.000Z'}]},
  profile:{started:true,totalClears:1},awards:{first_clear:'2026-10-25T00:00:00.000Z'}
 })));
 await page.goto('./');await page.locator('#openArchive').click();
 const log=page.locator('.personal-log').first();
 await expect(log.locator('summary')).toContainText('以前のクリア称号');
 await log.locator('summary').click();
 await expect(log).toContainText('旧バージョンの記録');
 expect((await page.evaluate(()=>AnkinArchive.read())).clears[0].ending).toBeNull();
 expect(errors).toEqual([]);
});