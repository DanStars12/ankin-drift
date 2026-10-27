import {test,expect} from '@playwright/test';

test('v13 migrates old clear, exports JSON and restores without duplication',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ankin_drift_v96_damage_records',JSON.stringify({
  damage:54000,time:1900,level:46,clears:[{mode:'normal',time:1801,level:43,damage:54000,
  date:'2026-10-25T18:30:00.000Z',endless:false}],runs:[] })));
 await page.goto('./');
 await expect(page).toHaveTitle(/ANKIN DRIFT v13\.[0-9]+/);
 await page.locator('#openArchive').click();
 await expect(page.getByText('初めての勝利')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.locator('#v13Export').click();
 expect((await download).suggestedFilename()).toMatch(/ankin-drift-save-\d{4}-\d\d-\d\d\.json/);
 const json=await page.evaluate(()=>AnkinArchive.exported());
 const archive=JSON.parse(json);
 expect(archive.schemaVersion).toBe(2);
 expect(archive.record.damage).toBe(54000);
 expect(archive.record.clears).toHaveLength(1);
 await page.locator('#v13ImportFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.locator('#v13Merge')).toBeVisible();
 page.once('dialog',d=>d.accept());
 await page.locator('#v13Merge').click();
 await expect(page.getByText('復元が完了しました。')).toBeVisible();
 expect((await page.evaluate(()=>AnkinArchive.read())).clears).toHaveLength(1);
 await page.reload();await page.locator('#openArchive').click();
 expect((await page.evaluate(()=>AnkinArchive.read())).clears).toHaveLength(1);
 expect(errors).toEqual([]);
});

test('v13 optional trials produce GOLD legacy and achievements that survive reload',async({page,isMobile})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('v13 victory probe anchor changed');
  const code=[
   "window.__v13WinTest=()=>{",
   "const modifiers=[...(game.activeChallenges||[])];",
   "game.ultimateEncounterAt=1800;game.lastClearAt=0;game.damage=123456;game.level=45;",
   "game.damageStats={laser:123456};game.elementCombos=[{main:'thunder',sub:'wind'}];",
   "game.fusions={evoThunder:true,evoWind:true};recordVictory();",
   "return {modifiers,rank:game.lastClear.rank,title:game.lastClear.title,clears:record.read().clears.length};",
   "};"
  ].join('\n');
  await route.fulfill({response,body:html.replace(anchor,code+'\n'+anchor)});
 });
 await page.addInitScript(()=>localStorage.setItem('ankin_drift_v96_damage_records',JSON.stringify({
  damage:500,time:1800,level:45,clears:[{mode:'normal',time:1800,level:45,damage:500,date:'2026-10-24T00:00:00.000Z'}]})));
 await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#ankinTrial summary').click();
 await expect(page.locator('#ankinTrial')).toHaveAttribute('open','');
 await page.locator('[data-v13-challenge="fragile"]').click();
 await page.locator('[data-v13-challenge="onslaught"]').click();
 await expect(page.locator('[data-v13-challenge="fragile"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 const result=await page.evaluate(()=>window.__v13WinTest());
 expect(result.modifiers).toEqual(['fragile','onslaught']);
 expect(result.rank).toBe('GOLD');
 expect(result.title).toContain('雷鳴');
 expect(result.clears).toBe(2);
 await expect(page.locator('.v13-victory-badge')).toContainText('GOLD');
 await page.locator('#openArchive').click();
 await expect(page.getByText('試練の征服者')).toBeVisible();
 await expect(page.locator('.v13-achievement[data-achievement-id="evolution_master"]')).toContainText('究極の進化');
 await page.reload();await page.locator('#openArchive').click();
 expect((await page.evaluate(()=>AnkinArchive.read())).clears).toHaveLength(2);
 expect(errors).toEqual([]);
});
