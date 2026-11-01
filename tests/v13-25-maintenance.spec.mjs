import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`window.__maintenance1325={
  boss(){
    selectedShip='dog';newRun();game.level=12;game.lastChoice='minor';
    choices=selectable(POWERS).slice(0,4);state('choice');
    return {count:choices.length};
  },
  volley(ship,stacks,napalm=false){
    selectedShip=ship;newRun();player.rocketCd=stacks;player.gigaNapalm=napalm?1:0;
    shots=[];const target={x:player.x+180,y:player.y};
    const count=missileVolleyCount(player);
    fireFrom(player.x,player.y,target,count,player.dmg*2.6,player.shotSpeed*.7,'rocket');
    return {count,shots:shots.length,napalm:!!shots[0]?.napalm,stored:player.rocketCd};
  },
  fox(start){
    selectedShip='dog';newRun();player.rocketCd=start;
    skillById('dogPwrFox').apply(player);
    return {stacks:player.rocketCd,volley:missileVolleyCount(player)};
  },
  power(){
    selectedShip='laser';newRun();const c=skillById('boomerang');
    const before={dmg:player.dmg,boss:player.bossBane,nova:player.novaDamage};
    const fit=fitsShip(c);c.apply(player);
    return {id:c.id,fit,before,after:{dmg:player.dmg,boss:player.bossBane,nova:player.novaDamage}};
  },
  atlas(){
    return {legacy:ALL_SKILL_DEFS().some(c=>c.id==='endFireFuel'),
      visible:ATLAS_SKILL_DEFS().some(c=>c.id==='endFireFuel'),
      all:ALL_SKILL_DEFS().length,atlas:ATLAS_SKILL_DEFS().length};
  }
};`;
async function open(page,isMobile=false){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/ankin-drift/',async route=>{
    const res=await route.fetch(),html=await res.text();
    expect(html).toContain(anchor);
    await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
  });
  await page.goto('./');
  if(isMobile)await page.locator('[data-control="mobile"]').click();
  return errors;
}

test('four boss reward cards keep synergy and evolution readable with independent scroll',async({page,isMobile})=>{
  const errors=await open(page,isMobile);
  expect((await page.evaluate(()=>window.__maintenance1325.boss())).count).toBe(4);
  await expect(page.locator('.choice-grid.four-choice .choice')).toHaveCount(4);
  const geometry=await page.evaluate(()=>{
    const card=document.querySelector('.choice-grid.four-choice .choice');
    // Simulate an unusually long evolution/synergy explanation independently of random card rolls.
    card.insertAdjacentHTML('beforeend','<div class="synergy-note"><div class="synergy-effect-line">'+('シナジーの説明。'.repeat(180))+'</div></div><div class="evolve">'+('進化合成の追加効果。'.repeat(180))+'</div>');
    const style=getComputedStyle(card),synergy=card.querySelector('.synergy-effect-line'),
      evolve=card.querySelector('.evolve');
    const box=card.getBoundingClientRect();
    return {overflow:style.overflowY,scrollable:card.scrollHeight>card.clientHeight,
      synergyMax:getComputedStyle(synergy).webkitLineClamp,evolveMax:getComputedStyle(evolve).maxHeight,
      inside:box.top>=-1&&box.bottom<=innerHeight+1};
  });
  expect(geometry.overflow).toBe('auto');
  expect(geometry.scrollable).toBe(true);
  expect(geometry.synergyMax).toBe('none');
  expect(geometry.evolveMax).toBe('none');
  expect(geometry.inside).toBe(true);
  expect(errors).toEqual([]);
});

test('missiles actually fire 5-8 projectiles, preserve napalm consolidation and convert excess stacks',async({page})=>{
  const errors=await open(page);
  const data=await page.evaluate(()=>({
    normal:[1,4,6,8,10].map(n=>window.__maintenance1325.volley('shot',n)),
    dog:window.__maintenance1325.volley('dog',8),
    napalm:window.__maintenance1325.volley('dog',8,true),
    fox:window.__maintenance1325.fox(7)
  }));
  expect(data.normal.map(x=>x.shots)).toEqual([1,4,6,8,8]);
  expect(data.normal[4].stored).toBe(10);
  expect(data.dog.shots).toBe(8);
  expect(data.napalm.shots).toBe(1);
  expect(data.napalm.napalm).toBe(true);
  expect(data.fox).toEqual({stacks:9,volley:8});
  expect(errors).toEqual([]);
});

test('obsolete ricochet POWER ID remains save-compatible while granting universal usable stats',async({page})=>{
  const errors=await open(page);
  const r=await page.evaluate(()=>window.__maintenance1325.power());
  expect(r.id).toBe('boomerang');expect(r.fit).toBe(true);
  expect(r.after.dmg).toBeCloseTo(r.before.dmg+32*.94);
  expect(r.after.boss).toBeGreaterThan(r.before.boss);
  expect(r.after.nova).toBeCloseTo(r.before.nova+45*.94);
  expect(errors).toEqual([]);
});

test('legacy resonance is not listed as a separate atlas card, and full auto-effects live in fusion lab',async({page,isMobile})=>{
  const errors=await open(page,isMobile);
  const r=await page.evaluate(()=>window.__maintenance1325.atlas());
  expect(r.legacy).toBe(true);expect(r.visible).toBe(false);
  expect(r.all-r.atlas).toBe(10);
  await page.locator('#openTitleLab').click();
  await page.locator('[data-tab="atlas"]').click();
  await expect(page.locator('[data-atlas-card="endFireFuel"]')).toHaveCount(0);
  await page.locator('[data-tab="element"]').click();
  await expect(page.locator('.lab-scroll')).toContainText('共鳴カードの追加取得は不要');
  await expect(page.locator('.lab-scroll')).toContainText('ミサイル燃焼+18%');
  await expect(page.locator('.lab-scroll')).toContainText('サイクロン威力+56');
  expect(errors).toEqual([]);
});
