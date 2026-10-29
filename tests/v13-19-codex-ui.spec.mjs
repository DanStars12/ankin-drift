import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook="window.__codex1319={\n snapshot(){return JSON.stringify({ship:selectedShip,run:game?.total,skills:game?.skills,\n  powers:game?.powers,fusions:game?.fusions,damage:player?.dmg,save:AnkinArchive.exported()});},\n snake(form){\n  const g=document.createElement('canvas').getContext('2d',{willReadFrequently:true});\n  g.canvas.width=190;g.canvas.height=110;g.globalAlpha=.81;g.lineWidth=3;\n  const p={dogViper:form!=='normal',dogViperAscended:form==='apex'};\n  const before={alpha:g.globalAlpha,lineWidth:g.lineWidth,transform:g.getTransform().toString()};\n  drawDogLightningSnake(p,{x:20,y:57,x2:157,y2:55,life:.32},g,1);\n  const after={alpha:g.globalAlpha,lineWidth:g.lineWidth,transform:g.getTransform().toString()};\n  const pixels=g.getImageData(0,0,190,110).data;\n  let count=0,hash=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>5)count++;\n   hash=(hash*33+pixels[i]+3*pixels[i+1]+5*pixels[i+2]+pixels[i+3])>>>0;}\n  return {count,hash,before,after};\n }\n};";
async function open(page,{probe=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(probe)await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');await page.locator('#openTitleLab').click();
 await page.locator('[data-tab="visual"]').click();return errors;
}

test('LAB tabs stay one row and weapon preview appears before weapon choices',async({page})=>{
 const errors=await open(page);
 const result=await page.evaluate(()=>{
  const tabs=document.querySelector('.lab-tabs'),stage=document.querySelector('.visual-stage'),
   browse=document.querySelector('.visual-browser'),canvas=document.querySelector('#weaponVisualCanvas');
  return {tabCount:tabs.querySelectorAll('[data-tab]').length,
   rowCount:new Set([...tabs.querySelectorAll('.lab-tab')].map(n=>Math.round(n.getBoundingClientRect().top))).size,
   stageTop:stage.getBoundingClientRect().top,browseTop:browse.getBoundingClientRect().top,
   canvasTop:canvas.getBoundingClientRect().top,viewport:window.innerHeight,
   compact:document.querySelector('.lab-panel').classList.contains('visual-lab'),
   overflow:document.documentElement.scrollWidth-window.innerWidth};
 });
 expect(result.tabCount).toBe(8);expect(result.rowCount).toBe(1);
 expect(result.stageTop).toBeLessThanOrEqual(result.browseTop+3);
 expect(result.canvasTop).toBeLessThan(result.viewport*.9);
 expect(result.compact).toBe(true);expect(result.overflow).toBeLessThanOrEqual(2);
 expect(errors).toEqual([]);
});

test('DOG mutations can be compared using previous/next controls and a compact description',async({page},testInfo)=>{
 const errors=await open(page);
 await page.locator('[data-visual-ship="dog"]').click();
 await page.locator('[data-visual-group="mutation"]').click();
 const first=await page.locator('.visual-stage-heading strong').textContent();
 await page.locator('[data-visual-step="1"]').click();
 const second=await page.locator('.visual-stage-heading strong').textContent();
 expect(first).not.toBe(second);
 await page.locator('[data-visual-step="-1"]').click();
 await expect(page.locator('.visual-stage-heading strong')).toHaveText(first);
 await page.locator('.visual-stage-details summary').click();
 await expect(page.locator('#visualWeaponDescription')).toBeVisible();
 await page.locator('[data-visual-id="dogViper"]').click();
 await expect(page.locator('.visual-stage-heading strong')).toContainText('ヴァイパー');
 await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath('cute-snake-preview.png')});
 expect(errors).toEqual([]);
});

test('snake morph preserves Canvas state and gallery does not modify player or archive',async({page})=>{
 const errors=await open(page,{probe:true});
 const before=await page.evaluate(()=>window.__codex1319.snapshot());
 const snakes=await page.evaluate(()=>['normal','mutation','apex'].map(form=>window.__codex1319.snake(form)));
 for(const s of snakes){expect(s.before).toEqual(s.after);expect(s.count).toBeGreaterThan(500);}
 expect(new Set(snakes.map(s=>s.hash)).size).toBe(3);
 await page.locator('[data-visual-ship="dog"]').click();
 for(const group of ['animal','mutation']){
  await page.locator('[data-visual-group="'+group+'"]').click();
  await page.locator('[data-visual-step="1"]').click();
 }
 const after=await page.evaluate(()=>window.__codex1319.snapshot());
 expect(after).toBe(before);expect(errors).toEqual([]);
});
