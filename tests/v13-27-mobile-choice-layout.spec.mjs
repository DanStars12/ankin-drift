import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`window.__reward1327={
 prepare(kind='normal'){
  selectedShip='shot';newRun();game.lastChoice=kind;
  const syn=activeSynergies().find(a=>a.need?.length===2&&a.need.every(id=>{
    const c=skillById(id);return c&&c.rarity!=='power'&&c.rarity!=='legendary'&&fitsShip(c);
  }));
  if(!syn)throw Error('No compatible synergy found');
  game.skills[syn.need[1]]=1;
  const c=skillById(syn.need[0]);
  if(!choiceSynergyReady(c))throw Error('Expected a real ready synergy');
  const pool=kind==='minor'?POWERS:kind==='major'?LEGENDS:kind==='unique'?UNIQUE_SKILLS:SKILLS;
  choices=[{...c,name:'超・長い名前のスキル【融合 × 連携】テスト'}];
  for(const card of pool)if(card.id!==c.id&&fitsShip(card)&&choices.length<(kind==='normal'?3:4))choices.push(card);
  state('choice');
  return {mode,ready:choiceSynergyReady(c),count:choices.length};
 }
};`;
async function setup(page,isMobile){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  expect(html).toContain(anchor);
  await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');
 if(isMobile)await page.locator('[data-control="mobile"]').click();
 return errors;
}
const viewportSizes=[{width:320,height:568},{width:390,height:844},{width:390,height:490},{width:360,height:640},{width:960,height:540}];

test('real synergy-ready card and long Japanese skill name never occupy the same visual row',async({page,isMobile})=>{
 const errors=await setup(page,isMobile);
 for(const size of viewportSizes){
  await page.setViewportSize(size);
  for(const kind of ['normal','major']){
   const state=await page.evaluate(k=>window.__reward1327.prepare(k),kind);
   expect(state).toEqual({mode:'choice',ready:true,count:kind==='normal'?3:4});
   const info=await page.evaluate(()=>{
    const pane=document.querySelector('.choice-panel');
    const card=pane.querySelector('.choice');
    const head=card.querySelector('.choice-head');
    const label=card.querySelector('.choice-name');
    // Simulate rare simultaneous evolution + synergy readiness.
    const evo=document.createElement('span');
    evo.className='evolution-ready-banner';evo.textContent='◇ 進化合成可能！';
    head.append(evo);
    label.textContent='超長い日本語スキル名・シナジー完成・進化合成の組み合わせ・テスト';
    const box=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
    const badges=[...card.querySelectorAll('.synergy-ready-banner,.evolution-ready-banner')].map(box);
    const t=box(label),b=box(card),p=box(pane),actions=box(pane.querySelector(':scope > .actions'));
    const layout=getComputedStyle(card).display, row=getComputedStyle(card.querySelector('.choice-skill-head')).display;
    return {layout,row,badges,title:t,card:b,panel:p,actions,
      cardOverflow:getComputedStyle(card).overflowY,
      widthOverflow:card.scrollWidth-card.clientWidth,
      hasName:label.textContent.includes('超長い日本語')};
   });
   expect(info.hasName).toBe(true);
   expect(info.panel.top).toBeGreaterThanOrEqual(-1);
   expect(info.panel.bottom).toBeLessThanOrEqual(size.height+1);
   expect(info.actions.bottom).toBeLessThanOrEqual(size.height+1);
   expect(info.widthOverflow).toBeLessThanOrEqual(2);
   expect(info.cardOverflow).toBe('auto');
   if(size.width<=600){
    expect(info.layout).toBe('flex');
    expect(info.row).toBe('flex');
    expect(info.badges).toHaveLength(2);
    for(const flag of info.badges){
      expect(flag.bottom).toBeLessThanOrEqual(info.title.top+1);
      expect(flag.left).toBeGreaterThanOrEqual(info.card.left-1);
      expect(flag.right).toBeLessThanOrEqual(info.card.right+1);
    }
    expect(info.title.left).toBeGreaterThanOrEqual(info.card.left-1);
    expect(info.title.right).toBeLessThanOrEqual(info.card.right+1);
   }
  }
 }
 expect(errors).toEqual([]);
});

test('choice detail tags and effects remain accessible rather than hidden on short mobiles',async({page,isMobile})=>{
 const errors=await setup(page,isMobile);
 await page.setViewportSize({width:320,height:490});
 await page.evaluate(()=>window.__reward1327.prepare('normal'));
 const g=await page.evaluate(()=>{
  const card=document.querySelector('.choice-grid .choice'),attrs=card.querySelector('.choice-attrs');
  const desc=card.querySelector('.choice-desc');
  const label=card.querySelector('.choice-name'),badge=card.querySelector('.synergy-ready-banner');
  return {attrs:getComputedStyle(attrs).display,desc:getComputedStyle(desc).display,
    visibleText:label.textContent.length>0&&badge.textContent.includes('シナジー'),
    scroll:getComputedStyle(card).overflowY};
 });
 expect(g.attrs).not.toBe('none');
 expect(g.desc).not.toBe('none');
 expect(g.visibleText).toBe(true);
 expect(g.scroll).toBe('auto');
 expect(errors).toEqual([]);
});
