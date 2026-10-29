import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook="window.__dogGuide1321={\n dogCards(){\n  return ALL_SKILL_DEFS().filter(c=>c.shipOnly==='dog').map(c=>({id:c.id,name:c.name,\n    rarity:c.rarity,hasTag:c.tags.length>0}));\n },\n tagGuide(tag){return attrDetails(tag);},\n everyTag(){\n  const tags=[...new Set(ALL_SKILL_DEFS().flatMap(c=>c.tags||[]))];\n  return tags.map(tag=>({tag,...attrDetails(tag)}));\n },\n snake(form='normal'){\n  const c=document.createElement('canvas');c.width=180;c.height=100;\n  const g=c.getContext('2d',{willReadFrequently:true});\n  g.globalAlpha=.83;g.lineWidth=2.3;const before={alpha:g.globalAlpha,width:g.lineWidth,tf:g.getTransform().toString()};\n  const p={dogViper:form!=='normal',dogViperAscended:form==='apex'};\n  drawDogLightningSnake(p,{x:22,y:50,x2:116,y2:50,life:.33},g,1);\n  const after={alpha:g.globalAlpha,width:g.lineWidth,tf:g.getTransform().toString()};\n  const d=g.getImageData(0,0,c.width,c.height).data;\n  const dark=(xa,xb,ya,yb)=>{let count=0,sum=0;\n   for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){const i=(y*c.width+x)*4;\n    if(d[i]<100&&d[i+1]<100&&d[i+2]<100&&d[i+3]>160){count++;sum+=y;}}\n   return {count,center:count?sum/count:null};};\n  const upper=dark(116,124,40,47),lower=dark(116,124,53,60);\n  let hash=0,pixels=0;for(let i=0;i<d.length;i+=4){hash=(Math.imul(hash,33)+d[i]+d[i+1]*3+d[i+2]*5+d[i+3])>>>0;if(d[i+3]>0)pixels++;}\n  return {before,after,upper,lower,hash,pixels};\n },\n snapshot(){return JSON.stringify({selectedShip,playerDmg:player?.dmg,skills:game?.skills,\n  powers:game?.powers,legends:game?.legends,saved:AnkinArchive.exported()});}\n};";
async function launch(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');await page.locator('#openTitleLab').click();return errors;
}
test('all 75 DOG-only cards have cute unique names and unchanged ID-based skills',async({page})=>{
 const errors=await launch(page),cards=await page.evaluate(()=>window.__dogGuide1321.dogCards());
 expect(cards).toHaveLength(75);
 expect(new Set(cards.map(c=>c.id)).size).toBe(75);
 expect(new Set(cards.map(c=>c.name)).size).toBe(75);
 expect(cards.every(c=>c.name.length>2&&c.hasTag)).toBe(true);
 const byId=Object.fromEntries(cards.map(c=>[c.id,c.name]));
 expect(byId.dogFox).toContain('こんこん');
 expect(byId.dogHamMeteor).toContain('ころころ');
 expect(byId.dogSnake).toContain('ライトニング・スネーク');
 expect(byId.dogHare).toContain('フロスト・ヘア');
 expect(byId.dogRabbit).toContain('スノー・ラビット');
 expect(byId.dogMutViper).toContain('ヴァイパー');
 expect(errors).toEqual([]);
});
test('long-run tag explains unlock time, repeated upgrade limits, and concrete examples',async({page})=>{
 const errors=await launch(page);
 const tag=await page.evaluate(()=>window.__dogGuide1321.tagGuide('継戦'));
 expect(tag.desc).toContain('長時間');
 expect(tag.details.join(' ')).toContain('Lv20');
 expect(tag.details.join(' ')).toContain('600秒');
 expect(tag.details.join(' ')).toContain('上限');
 expect(tag.details.some(x=>x.includes('具体例｜'))).toBe(true);
 await page.locator('[data-tab="atlas"]').click();
 await page.locator('#atlasAttr').selectOption('継戦');
 await expect(page.locator('#atlasResults')).toContainText('ほねっこ・もっとパワー');
 await page.locator('[data-atlas-card="dogEndBoneTorque"] [data-attr-peek="継戦"]').click();
 await expect(page.locator('.peek-title')).toContainText('継戦');
 await expect(page.locator('.attr-stats')).toContainText('Lv20');
 expect(errors).toEqual([]);
});
test('every live skill tag has meaningful, actionable description plus actual card examples',async({page})=>{
 const errors=await launch(page);
 const guides=await page.evaluate(()=>window.__dogGuide1321.everyTag());
 expect(guides.length).toBeGreaterThan(45);
 for(const g of guides){
  expect(g.desc.length,g.tag).toBeGreaterThan(20);
  expect(g.details.length,g.tag).toBeGreaterThanOrEqual(3);
  expect(g.details.some(x=>x.startsWith('具体例｜')),g.tag).toBe(true);
  expect(g.details.at(-1),g.tag).toContain('タグ');
 }
 expect(errors).toEqual([]);
});
test('small tapered snake has separated eyes, keeps original tongue, and preserves canvas state',async({page},testInfo)=>{
 const errors=await launch(page);
 const before=await page.evaluate(()=>window.__dogGuide1321.snapshot());
 const shapes=await page.evaluate(()=>['normal','mutation','apex'].map(x=>window.__dogGuide1321.snake(x)));
 for(const s of shapes){
  expect(s.before).toEqual(s.after);
  expect(s.pixels).toBeGreaterThan(250);
  expect(s.upper.count).toBeGreaterThan(3);
  expect(s.lower.count).toBeGreaterThan(3);
  expect(s.lower.center-s.upper.center).toBeGreaterThan(10);
 }
 expect(new Set(shapes.map(s=>s.hash)).size).toBe(3);
 await page.locator('[data-tab="visual"]').click();
 await page.locator('[data-visual-ship="dog"]').click();
 await page.locator('[data-visual-group="animal"]').click();
 await page.locator('[data-visual-id="dogSnake"]').click();
 if(testInfo.project.name==='desktop')await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath('snake-normal-wedge.png')});
 await page.locator('[data-visual-group="mutation"]').click();
 for(const id of ['dogViper','dogViperApex']){
  await page.locator('[data-visual-id="'+id+'"]').click();
  if(testInfo.project.name==='desktop')await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath(id+'-wedge.png')});
 }
 expect(await page.evaluate(()=>window.__dogGuide1321.snapshot())).toBe(before);
 expect(errors).toEqual([]);
});
