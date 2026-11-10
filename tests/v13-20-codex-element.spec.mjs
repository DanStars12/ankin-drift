import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook="window.__weapon1320={\n metadata(){\n  return {\n   rows:VISUAL_CODEX.map(v=>({id:v.id,ship:v.ship,kind:v.kind})),\n   colors:Object.fromEntries(['shot','laser','charge','drill','dog'].map(ship=>\n    [ship,Object.fromEntries(['pulse','plasma','cryo','arc'].map(mode=>[mode,weaponElementPalette(ship,mode).accent]))])),\n   evolution:weaponElementPalette('laser','arc','#ffffff'),\n   tags:Object.fromEntries(ALL_SKILL_DEFS().map(c=>[c.id,c.tags||[]])),\n   original:JSON.stringify({player:player?.dmg,game:game?.skills,archive:AnkinArchive.exported()})\n  };\n },\n canvasHash(){\n  visualLastFrame=0;drawWeaponVisualPreview(12345);\n  const c=document.querySelector('#weaponVisualCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;\n  let hash=0,pixels=0;for(let i=0;i<d.length;i+=4){hash=(Math.imul(hash,31)+d[i]+d[i+1]*3+d[i+2]*7+d[i+3])>>>0;if(d[i+3]>0)pixels++;}\n  return {hash,pixels};\n },\n archive(){return JSON.stringify({player:player?.dmg,game:game?.skills,archive:AnkinArchive.exported()});}\n};";
async function open(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');await page.locator('#openTitleLab').click();
 await page.locator('[data-tab="visual"]').click();return errors;
}

test('common skills are listed once, independent of the five ship-specific conversions',async({page})=>{
 const errors=await open(page),metadata=await page.evaluate(()=>window.__weapon1320.metadata());
 await expect(page.locator('[data-visual-ship]')).toHaveCount(6);
 const common=metadata.rows.filter(r=>r.ship==='common');
 expect(common.map(v=>v.id).sort()).toEqual(['blade','bolt','cyclone','emp','iceball','magma','meteor','rocket','spike','wall']);
 for(const ship of ['shot','laser','charge','drill','dog']){
  expect(metadata.rows.filter(v=>v.ship===ship&&v.kind.includes(':'))).toHaveLength(3);
  await page.locator('[data-visual-ship="'+ship+'"]').click();
  await expect(page.locator('[data-visual-id="magma"]')).toHaveCount(0);
  await page.locator('[data-visual-group="element"]').click();
  await expect(page.locator('[data-visual-id]')).toHaveCount(3);
 }
 await page.locator('[data-visual-ship="common"]').click();
 await expect(page.locator('[data-visual-id="wall"]')).toHaveCount(1);
 await expect(page.locator('[data-visual-id="meteor"]')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('all conversion palettes are distinct including dark purple thunder laser and red-orange comet',async({page})=>{
 const errors=await open(page),meta=await page.evaluate(()=>window.__weapon1320.metadata());
 for(const [ship,colors] of Object.entries(meta.colors)){
  expect(new Set(Object.values(colors)).size,ship).toBe(4);
 }
 expect(meta.colors.laser.arc).toBe('#6720ce');
 expect(meta.colors.charge.plasma).toBe('#ff4a3d');
 expect(meta.evolution.overridden).toBe(true);
 expect(meta.evolution.accent).toBe('#ffffff');
 const snapshot=meta.original;
 for(const [ship,a,b] of [['shot','shotPlasma','shotArc'],['laser','laserPlasma','laserArc'],
  ['charge','chargePlasma','chargeArc'],['drill','drillPlasma','drillCryo'],['dog','dogPlasma','dogCryo']]){
  await page.locator('[data-visual-ship="'+ship+'"]').click();
  await page.locator('[data-visual-group="element"]').click();
  await page.locator('[data-visual-id="'+a+'"]').click();
  const first=await page.evaluate(()=>window.__weapon1320.canvasHash());
  await page.locator('[data-visual-id="'+b+'"]').click();
  const second=await page.evaluate(()=>window.__weapon1320.canvasHash());
  expect(first.pixels).toBeGreaterThan(10000);
  expect(first.hash,ship).not.toBe(second.hash);
 }
 expect(await page.evaluate(()=>window.__weapon1320.archive())).toBe(snapshot);
 expect(errors).toEqual([]);
});

test('rock wall rotates three defenders; rabbit, hare and small snake render on mobile/desktop',async({page},testInfo)=>{
 const errors=await open(page);
 await page.locator('[data-visual-ship="common"]').click();
 for(const id of ['wall','meteor']){
  await page.locator('[data-visual-id="'+id+'"]').click();
  const result=await page.evaluate(()=>window.__weapon1320.canvasHash());
  expect(result.pixels).toBeGreaterThan(10000);
  if(testInfo.project.name==='desktop')await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath(id+'.png')});
 }
 await page.locator('[data-visual-ship="dog"]').click();
 for(const id of ['dogRabbit','dogHare','dogSnake','dogViperApex']){
  await page.locator('[data-visual-group="'+(id==='dogViperApex'?'mutation':'animal')+'"]').click();
  await page.locator('[data-visual-id="'+id+'"]').click();
  expect((await page.evaluate(()=>window.__weapon1320.canvasHash())).pixels).toBeGreaterThan(10000);
  if(testInfo.project.name==='desktop')await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath(id+'.png')});
 }
 expect(errors).toEqual([]);
});

test('skill tags are deduplicated, grouped and do not conflate snow rabbit with frost hare',async({page})=>{
 const errors=await open(page);
 const tags=(await page.evaluate(()=>window.__weapon1320.metadata())).tags;
 for(const [id,values] of Object.entries(tags)){
  expect(new Set(values).size,id).toBe(values.length);
  for(const bad of ['専用：DOG','機体専用','弾丸','オプション','後方射撃','側方射撃'])expect(values,id).not.toContain(bad);
 }
 expect(tags.dogRabbit).toContain('アイスボール');
 expect(tags.dogRabbit).not.toContain('フロストスパイク');
 expect(tags.dogHare).toContain('フロストスパイク');
 expect(tags.dogMutViper).toContain('ヘビ');
 await page.locator('[data-tab="atlas"]').click();
 await expect(page.locator('#atlasAttr optgroup')).toHaveCount(5);
 await page.locator('#atlasAttr').selectOption('ウサギ');
 await expect(page.locator('#atlasResults')).toContainText('スノー・ラビット');
 expect(errors).toEqual([]);
});
