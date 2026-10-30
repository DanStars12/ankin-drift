import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook="window.__codex1323={\n audit(){return VISUAL_CODEX.filter(v=>v.ship==='dog'&&(v.group==='animal'||v.group==='mutation'))\n .map(v=>{\n  const fusion=VISUAL_DOG_APEX_RECIPE_IDS[v.id];\n  const source=fusion?FUSIONS.find(r=>r.id===fusion):skillById(v.card);\n  return {id:v.id,group:v.group,name:v.name,expected:source?.name,\n   fallback:v.fallbackName,sourceId:fusion||v.card,hasSource:!!source};\n });},\n progress(){return JSON.stringify({damage:player?.dmg,skills:game?.skills,\n  powers:game?.powers,legends:game?.legends,fusions:game?.fusions,save:AnkinArchive.exported()});}\n};";
async function openLab(page){
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.route('**/ankin-drift/',async route=>{
  const result=await route.fetch(),html=await result.text();
  expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response:result,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-ship="dog"]').click();
 await page.locator('#openTitleLab').click();
 await expect(page.locator('.lab-release-line')).toContainText('v13.24');
 return errors;
}

test('all DOG animal and evolution preview names match the real skill or fusion names in the DOM',async({page},testInfo)=>{
 const errors=await openLab(page);
 await page.locator('[data-tab="visual"]').click();
 await page.locator('[data-visual-ship="dog"]').click();
 const rows=await page.evaluate(()=>window.__codex1323.audit());
 expect(rows.length).toBeGreaterThanOrEqual(22);
 const names=await page.locator('.visual-choice[data-visual-id]').evaluateAll(nodes=>
  Object.fromEntries(nodes.map(node=>[node.dataset.visualId,node.querySelector('span')?.textContent])));
 for(const r of rows){
  if(r.id==='dogChicken'){expect(r.name).toContain('ニワトリ');continue;}
  expect(r.hasSource,'source missing: '+r.id).toBe(true);
  expect(r.name,r.id).toBe(r.expected);
  expect(names[r.id],r.id).toBe(r.expected);
 }
 const renamed={
  dogHam:'ころころ・ハムスターメテオ',
  dogHedge:'びりびり・ハリネズミ',
  dogMoon:'おつきさま・ムーンラビット行進',
  dogNine:'こんこん・九尾のちから',
  dogArmor:'ころころ・ギガハム・スターメテオ',
  dogMoonApex:'永月・フロストヘア',
  dogViperApex:'おおあらしのだいじゃ',
  dogNineApex:'いなりのかみさま',
  dogHamApex:'ちいさなおうさま'
 };
 for(const [id,name] of Object.entries(renamed))expect(names[id],id).toBe(name);
 const snapshot=await page.evaluate(()=>window.__codex1323.progress());
 await page.locator('[data-visual-group="mutation"]').click();
 await page.locator('[data-visual-id="dogMoonApex"]').click();
 await expect(page.locator('.visual-stage-heading strong')).toHaveText('永月・フロストヘア');
 await page.locator('.visual-stage-details summary').click();
 await expect(page.locator('[data-evo-peek="dogMoonApex"]')).toContainText('永月・フロストヘア');
 if(testInfo.project.name==='desktop')await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath('codex-user-renamed-apex.png')});
 await page.locator('[data-visual-id="dogViperApex"]').click();
 await expect(page.locator('.visual-stage-heading strong')).toHaveText('おおあらしのだいじゃ');
 expect(await page.evaluate(()=>window.__codex1323.progress())).toBe(snapshot);
 expect(errors).toEqual([]);
});

test('skill atlas, synergy and evolution pages show the renamed data, not stale copies',async({page})=>{
 const errors=await openLab(page);
 await page.locator('[data-tab="atlas"]').click();
 await expect(page.locator('[data-atlas-card="dogHamMeteor"] .atlas-head')).toContainText('ころころ・ハムスターメテオ');
 await expect(page.locator('[data-atlas-card="dogHedgehog"] .atlas-head')).toContainText('びりびり・ハリネズミ');
 await expect(page.locator('[data-atlas-card="dogEndEggCare"] .atlas-head')).toContainText('たまごのお世話係');
 await page.locator('[data-tab="evolution"]').click();
 await expect(page.locator('#recipeResults')).toContainText('いなりのかみさま');
 await expect(page.locator('#recipeResults')).toContainText('永月・フロストヘア');
 await expect(page.locator('#recipeResults')).toContainText('ちいさなおうさま');
 await expect(page.locator('#recipeResults')).toContainText('きゅうびの・フォックスストーム');
 await expect(page.locator('#recipeResults')).not.toContainText('星穿つ装甲獣');
 await page.locator('[data-tab="synergy"]').click();
 await expect(page.locator('#recipeResults')).toContainText('こんこん・肉球マーク');
 await expect(page.locator('#recipeResults')).toContainText('キング・サンダースネーク');
 await expect(page.locator('#recipeResults')).toContainText('ごろごろキャッスル');
 await page.locator('[data-tab="visual"]').click();
 await page.locator('[data-visual-ship="dog"]').click();
 await expect(page.locator('.visual-choice-grid')).not.toContainText('皇雷大蛇');
 expect(errors).toEqual([]);
});

test('tag help is concise, ending has no DOG beta and updates refresh online HTML',async({page})=>{
 const errors=await openLab(page);
 await page.locator('[data-tab="atlas"]').click();
 await page.locator('#atlasAttr').selectOption('継戦');
 await page.locator('[data-atlas-card="dogEndBoneTorque"] [data-attr-peek="継戦"]').click();
 await expect(page.locator('.peek-title')).toContainText('継戦');
 await expect(page.locator('.attr-stats')).not.toContainText('具体例');
 await expect(page.locator('.attr-stats')).not.toContainText('このタグを持つスキル：');
 const [worker,ending,html]=await Promise.all([
  readFile(new URL('../sw.js',import.meta.url),'utf8'),
  readFile(new URL('../v13-ending.js',import.meta.url),'utf8'),
  readFile(new URL('../index.html',import.meta.url),'utf8')
 ]);
 expect(worker).toContain("cache:'no-store'");
 expect(worker).toContain("cache:'reload'");
 expect(html).toContain("updateViaCache:'none'");
 expect(ending).not.toContain('BONE BUDDY β');
 expect(ending).not.toContain('チック・タックの卵');
 expect(errors).toEqual([]);
});
