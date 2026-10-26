import {test,expect} from '@playwright/test';

const oldClear={mode:'normal',time:1800,level:40,damage:125000,
 date:'2026-10-22T10:00:00.000Z',ship:'shot'};
function problems(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',req=>errors.push(req.url()+' '+req.failure()?.errorText));
 return errors;
}

test('first playable session unlocks bronze 新人パイロット and survives reload',async({page,isMobile})=>{
 const errors=problems(page);await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 expect(await page.locator('#achievementFeed').innerHTML()).toBe('');
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 const toast=page.locator('#achievementFeed [data-achievement-id="new_pilot"]');
 await expect(toast).toBeVisible();
 await expect(toast).toHaveAttribute('data-tier','bronze');
 await expect(toast).toContainText('🏆実績解除🏆');
 await expect(toast).toContainText('新人パイロット');
 await expect(toast).toContainText('初めて出撃する');
 await expect(toast).toContainText('達成！');
 expect((await page.evaluate(()=>AnkinArchive.current().awards)).new_pilot).toBeTruthy();
 await page.reload();
 await page.locator('#openArchive').click();
 await expect(page.locator('.v13-achievement[data-achievement-id="new_pilot"]')).toHaveAttribute('data-tier','bronze');
 await expect(page.locator('.v13-achievement[data-achievement-id="new_pilot"]')).toContainText('解除済み');
 expect(errors).toEqual([]);
});

test('v13 save import upgrades to v2 and displays 1 / 10 bar, first clear rainbow border',async({page})=>{
 const errors=problems(page);
 await page.addInitScript(legacy=>{
  localStorage.setItem('ankin_drift_pilot_archive',JSON.stringify({
   format:'ankin-drift-archive',schemaVersion:1,updatedAt:'2026-10-22T12:00:00.000Z',
   record:{damage:125000,time:1800,level:40,runs:[],clears:[legacy]},
   awards:{first_clear:'2026-10-22T12:00:00.000Z'}
  }));
 },oldClear);
 await page.goto('./');
 await page.locator('#openArchive').click();
 const ten=page.locator('.v13-achievement[data-achievement-id="ten_clears"]');
 await expect(ten).toContainText('1 / 10');
 const bar=ten.locator('[role="progressbar"]');
 await expect(bar).toHaveAttribute('aria-valuenow','1');
 await expect(bar.locator('span')).toHaveAttribute('style','width:10%');
 await expect(page.locator('.v13-achievement[data-achievement-id="first_clear"]')).toHaveAttribute('data-tier','rainbow');
 await expect(page.locator('.v13-achievement[data-achievement-id="new_pilot"]')).toHaveAttribute('data-tier','bronze');
 await expect(page.locator('.v13-achievement[data-achievement-id="pilot_sense"]')).toHaveAttribute('data-tier','rainbow');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ankin_drift_pilot_archive')));
 expect(saved.schemaVersion).toBe(2);expect(saved.record.clears).toHaveLength(1);
 expect(errors).toEqual([]);
});

test('first boss clear immediately reveals rainbow trophy even if other achievements are queued',async({page,isMobile})=>{
 const errors=problems(page);
 await page.route('**/ankin-drift/',async route=>{
  const original=await route.fetch(),html=await original.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('achievement probe anchor moved');
  const code=[
   'window.__awardWinTest=()=>{',
   ' game.ultimateEncounterAt=1800;game.lastClearAt=0;',
   ' game.level=48;game.kills=1200;game.total=1800;game.damage=1200000;',
   ' game.damageStats={laser:1200000};recordVictory();',
   ' return {clearId:game.lastUnlocked.find(a=>a.id==="first_clear")?.id,',
   ' toast:document.querySelector("#achievementFeed [data-achievement-id]")?.dataset.achievementId,',
   ' award:AnkinArchive.current().awards.first_clear};',
   '};'
  ].join('\n');
  await route.fulfill({response:original,body:html.replace(anchor,code+'\n'+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#start').click();await page.locator('#guideContinue').click();
 const data=await page.evaluate(()=>window.__awardWinTest());
 expect(data.clearId).toBe('first_clear');
 expect(data.toast).toBe('first_clear');
 expect(data.award).toBeTruthy();
 await expect(page.locator('[data-first-clear-award]')).toContainText('初クリア虹枠実績');
 await expect(page.locator('#achievementFeed [data-achievement-id="first_clear"]')).toHaveAttribute('data-tier','rainbow');
 await page.locator('#openArchive').click();
 await expect(page.locator('.v13-achievement[data-achievement-id="first_clear"]')).toContainText('解除済み');
 expect(errors).toEqual([]);
});
