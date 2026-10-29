import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`
window.__visualAudit={
 state(){
  return JSON.stringify({ship:selectedShip,mode,run:game?.total,level:game?.level,
   skills:game?.skills,powers:game?.powers,legends:game?.legends,uniques:game?.uniques,
   relics:game?.relics,sealed:game?.sealedElements,attack:player?.dmg,
   wind:player?.windCount,bones:player?.dogBones});
 },
 metadata(){return {rows:VISUAL_CODEX.map(v=>({id:v.id,group:v.group,ship:v.ship,kind:v.kind})),
  mutations:VISUAL_CODEX.filter(v=>v.group==='mutation').length,
  triple:FUSIONS.filter(x=>(x.required||[]).length).map(x=>({id:x.id,ingredients:fusionMaterials(x).length})),
  gameCanvas:canvas,visualShip};},
 recipes(){return FUSIONS.filter(x=>x.id.endsWith('Apex')).map(r=>({id:r.id,materialCount:fusionMaterials(r).length,display:recipeBuild().includes(r.name)}));}
};`;

async function openCodex(page){
 await page.goto('./');
 await page.locator('#openTitleLab').click();
 await page.locator('[data-tab="visual"]').click();
 await expect(page.locator('#weaponVisualCanvas')).toBeVisible();
}

test('title BUILD LAB contains a responsive animated weapon preview, separate from gameplay',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await openCodex(page);
 await expect(page.locator('[data-visual-ship]')).toHaveCount(5);
 const canvas=page.locator('#weaponVisualCanvas');
 await expect.poll(()=>canvas.evaluate(node=>{
  const c=node.getContext('2d'),pixels=c.getImageData(0,0,node.width,node.height).data;
  return pixels[2000]+pixels[2001]+pixels[2002];
 })).toBeGreaterThan(0);
 const first=await canvas.evaluate(node=>node.toDataURL('image/png'));
 await page.locator('[data-visual-group="element"]').click();
 await page.locator('[data-visual-id="cyclone"]').click();
 await expect(page.locator('.visual-stage-heading strong')).toContainText('サイクロン');
 await expect.poll(()=>canvas.evaluate(node=>node.toDataURL('image/png'))).not.toBe(first);
 expect(errors).toEqual([]);
});

test('all five frames and DOG animals/mutations render with no JS errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await openCodex(page);
 const basics={shot:'shotPulse',laser:'laserRay',charge:'chargeComet',drill:'drillAuger',dog:'dogBone'};
 for(const [ship,id] of Object.entries(basics)){
  await page.locator('[data-visual-ship="'+ship+'"]').click();
  await expect(page.locator('[data-visual-id="'+id+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#weaponVisualCanvas')).toBeVisible();
 }
 await page.locator('[data-visual-group="animal"]').click();
 const animalIds=await page.locator('[data-visual-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.visualId));
 expect(animalIds.length).toBeGreaterThanOrEqual(10);
 for(const id of animalIds){await page.locator('[data-visual-id="'+id+'"]').click();await page.waitForTimeout(55);}
 await page.locator('[data-visual-group="mutation"]').click();
 const mutationIds=await page.locator('[data-visual-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.visualId));
 expect(mutationIds.length).toBe(10);
 for(const id of mutationIds){await page.locator('[data-visual-id="'+id+'"]').click();await page.waitForTimeout(55);}
 expect(errors).toEqual([]);
});

test('opening codex and switching visual models never grants weapons or changes a run',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');
 const start=page.locator('#start');await start.click();
 if(await page.locator('#guideContinue').isVisible())await page.locator('#guideContinue').click();
 await page.locator('#pauseButton').click();await page.locator('#inspect').click();
 const first=await page.evaluate(()=>window.__visualAudit.state());
 await page.locator('[data-tab="visual"]').click();
 for(const ship of ['shot','laser','charge','drill','dog'])await page.locator('[data-visual-ship="'+ship+'"]').click();
 await page.locator('[data-visual-group="mutation"]').click();
 await page.locator('[data-visual-id="dogWhaleApex"]').click();
 const last=await page.evaluate(()=>window.__visualAudit.state());
 expect(last).toBe(first);expect(errors).toEqual([]);
});

test('three-part DOG evolutions display all required materials in guide and tooltips',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');await page.locator('#openTitleLab').click();
 const m=await page.evaluate(()=>window.__visualAudit.metadata());
 expect(m.mutations).toBe(10);expect(m.triple.length).toBe(5);
 expect(m.triple.every(r=>r.ingredients===3)).toBe(true);
 await page.locator('[data-tab="evolution"]').click();
 await expect(page.locator('#recipeResults')).toContainText('深海の巨鯨');
 await expect(page.locator('#recipeResults')).toContainText('永月フロスト・ヘア');
 await expect(page.locator('#recipeResults')).toContainText('必要 3 種類');
 expect(errors).toEqual([]);
});

test('mobile gallery stays inside its scroll viewport',async({page})=>{
 await openCodex(page);
 const geometry=await page.evaluate(()=>{
  const box=document.querySelector('.lab-scroll'),stage=document.querySelector('.visual-stage'),canvas=document.querySelector('#weaponVisualCanvas');
  return {body:document.documentElement.scrollWidth,viewport:window.innerWidth,
   canvas:canvas.getBoundingClientRect().width,stage:stage.getBoundingClientRect().width,
   content:box.scrollWidth,client:box.clientWidth};
 });
 expect(geometry.canvas).toBeLessThanOrEqual(geometry.stage);
 expect(geometry.content).toBeLessThanOrEqual(geometry.client+2);
});
