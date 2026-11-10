import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`window.__reward1326={
 show(kind){
  selectedShip='dog';newRun();
  if(['major','minor','unique','relic','normal'].includes(kind)){
    game.lastChoice=kind;
    const pool=kind==='major'?LEGENDS:kind==='minor'?POWERS:kind==='unique'?UNIQUE_SKILLS:kind==='relic'?RELICS:SKILLS;
    choices=pool.slice(0,kind==='normal'||kind==='relic'?3:4);
    state('choice');return {mode,count:choices.length};
  }
  if(kind==='uniqueReward'){lastUniqueCard=UNIQUE_SKILLS[0];state('uniqueReward');return {mode};}
  if(kind==='fusion'){pendingFusion=FUSIONS[0];state('fusion');return {mode};}
  if(kind==='elementResult'){
    game.elementCombos=[{main:'fire',sub:'ice',weapon:'A',cards:6,resonance:10}];
    state('elementResult');return {mode};
  }
  throw Error('Unknown reward mode: '+kind);
 }
};`;
async function launch(page,isMobile){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  expect(html).toContain(anchor);
  await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');
 if(isMobile)await page.locator('[data-control="mobile"]').click();
 return errors;
}
const sizes=[
 {width:1280,height:800},
 {width:960,height:540},
 {width:390,height:844},
 {width:320,height:568},
 {width:390,height:490}
];

test('LEGENDARY, POWER, UNIQUE, RELIC and level-up cards preserve complete explanations',async({page,isMobile})=>{
 const errors=await launch(page,isMobile);
 for(const size of sizes){
  await page.setViewportSize(size);
  for(const kind of ['major','minor','unique','relic','normal']){
   const state=await page.evaluate(k=>window.__reward1326.show(k),kind);
   expect(state.mode).toBe('choice');
   const cards=page.locator('.choice-grid .choice');
   await expect(cards).toHaveCount(kind==='normal'||kind==='relic'?3:4);
   const g=await page.evaluate(()=>{
    const panel=document.querySelector('.choice-panel');
    const card=panel.querySelector('.choice');
    card.insertAdjacentHTML('beforeend',
      '<div class="synergy-note"><span class="synergy-effect-line">'+('長いシナジー効果。'.repeat(130))+'</span></div>'+
      '<div class="evolve"><div class="recipe-effect">'+('進化合成の詳細説明。'.repeat(130))+'</div></div>');
    const pr=panel.getBoundingClientRect(),a=panel.querySelector(':scope > .actions').getBoundingClientRect();
    const cr=card.getBoundingClientRect(),style=getComputedStyle(card);
    return {ptop:pr.top,pbottom:pr.bottom,atop:a.top,abottom:a.bottom,
      ctop:cr.top,cbottom:cr.bottom,overflow:style.overflowY,
      scrollable:card.scrollHeight>card.clientHeight,
      evolutionMax:getComputedStyle(card.querySelector('.evolve')).maxHeight,
      synergyClamp:getComputedStyle(card.querySelector('.synergy-effect-line')).webkitLineClamp};
   });
   expect(g.ptop).toBeGreaterThanOrEqual(-1);
   expect(g.pbottom).toBeLessThanOrEqual(size.height+1);
   expect(g.abottom).toBeLessThanOrEqual(size.height+1);
   expect(g.atop).toBeGreaterThanOrEqual(0);
   expect(g.ctop).toBeGreaterThanOrEqual(g.ptop-1);
   expect(g.cbottom).toBeLessThanOrEqual(g.pbottom+1);
   expect(g.overflow).toBe('auto');
   expect(g.scrollable).toBe(true);
   expect(g.evolutionMax).toBe('none');
   expect(g.synergyClamp).toBe('none');
  }
 }
 expect(errors).toEqual([]);
});

test('UNIQUE acquisition and fusion completion keep Continue fixed while details scroll',async({page,isMobile})=>{
 const errors=await launch(page,isMobile);
 for(const size of sizes){
  await page.setViewportSize(size);
  for(const [kind,continueId] of [['uniqueReward','uniqueContinue'],['fusion','fusionNext'],['elementResult','elementContinue']]){
   const state=await page.evaluate(k=>window.__reward1326.show(k),kind);
   expect(state.mode).toBe(kind);
   const button=page.locator('#'+continueId);
   await expect(button).toBeVisible();
   const geometry=await page.evaluate(()=>{
    const pane=document.querySelector('.reward-reveal-panel'),body=pane.querySelector('.reward-reveal-body');
    const action=pane.querySelector('.reward-reveal-actions'),button=action.querySelector('button');
    body.insertAdjacentHTML('beforeend','<div class="reward-overflow-probe">'+('詳細な報酬効果と進化内容。'.repeat(350))+'</div>');
    const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom}};
    return {panel:rect(pane),body:rect(body),button:rect(button),overflow:getComputedStyle(body).overflowY,
      scrollable:body.scrollHeight>body.clientHeight};
   });
   expect(geometry.panel.top).toBeGreaterThanOrEqual(-1);
   expect(geometry.panel.bottom).toBeLessThanOrEqual(size.height+1);
   expect(geometry.button.top).toBeGreaterThanOrEqual(0);
   expect(geometry.button.bottom).toBeLessThanOrEqual(size.height+1);
   expect(geometry.body.bottom).toBeLessThan(geometry.button.top+2);
   expect(geometry.overflow).toBe('auto');
   expect(geometry.scrollable).toBe(true);
  }
 }
 expect(errors).toEqual([]);
});
