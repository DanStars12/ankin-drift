import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`window.__fusion1324={
 prepare(level=12,withElements=true,reward=null){
   selectedShip='dog';newRun();game.level=level;game.need=expNeed(level);
   if(withElements)for(const id of ['dogFox','dogRabbit']){
     const skill=skillById(id);if(!skill)throw Error('Missing DOG skill: '+id);
     skill.apply(player);game.skills[id]=1;game.acquisitionLog.push(id);
   }
   game.pendingLevels=1;
   if(reward)game.rewards.push(reward);
   state('playing');processTransitions();
 },
 status(){return {mode,level:game.level,kind:game.lastChoice,stage:fusionStageIndex(),
   combos:game.elementCombos.length,results:game.fusionMilestoneResults.slice(),
   pending:game.pendingLevels,rewards:game.rewards.slice(),choiceDone:game.choiceBatchDone};}
};`;
async function install(page){
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/ankin-drift/',async route=>{
    const response=await route.fetch(),html=await response.text();
    expect(html).toContain(anchor);
    await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
  });
  await page.goto('./');
  return errors;
}

test('normal level-up offers a stored fusion ticket without auto-triggering',async ({page})=>{
  const errors=await install(page);
  await page.evaluate(()=>window.__fusion1324.prepare(12,true));
  const state=await page.evaluate(()=>window.__fusion1324.status());
  expect(state.mode).toBe('choice');expect(state.kind).toBe('normal');
  expect(state.stage).toBe(0);expect(state.combos).toBe(0);
  await expect(page.locator('.fusion-level-ticket')).toContainText('属性融合権');
  await expect(page.locator('#fusionFromLevel')).toBeEnabled();
  const viewport=await page.evaluate(()=>{
    const panel=document.querySelector('.choice-panel'),rect=panel.getBoundingClientRect();
    const actions=panel.querySelector(':scope > .actions').getBoundingClientRect();
    const cards=[...panel.querySelectorAll('.choice')].map(e=>{
      const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};
    });
    return {panel:rect.toJSON(),actions:actions.toJSON(),cards,height:innerHeight};
  });
  expect(viewport.panel.top).toBeGreaterThanOrEqual(-1);
  expect(viewport.panel.bottom).toBeLessThanOrEqual(viewport.height+1);
  expect(viewport.actions.bottom).toBeLessThanOrEqual(viewport.height+1);
  expect(viewport.cards).toHaveLength(3);
  expect(viewport.cards.every(c=>c.height>20&&c.top>=viewport.panel.top-1&&c.bottom<=viewport.panel.bottom+1)).toBe(true);
  expect(errors).toEqual([]);
});

test('DOG fusion preview uses animal weapons; cancel retains ticket and confirm consumes one level choice',async ({page})=>{
  const errors=await install(page);
  await page.evaluate(()=>window.__fusion1324.prepare(12,true));
  await page.locator('#fusionFromLevel').click();
  expect((await page.evaluate(()=>window.__fusion1324.status())).mode).toBe('elementChoice');
  await page.locator('[data-element-main="fire"]').click();
  await page.locator('[data-element-sub="ice"]').click();
  await expect(page.locator('.fusion-weapon-grid')).toBeVisible();
  await expect(page.locator('.fusion-weapon-grid')).toContainText('フォックスミサイル');
  await expect(page.locator('.fusion-weapon-grid')).toContainText('融合後');
  await page.locator('#fusionSkip').click();
  const afterCancel=await page.evaluate(()=>window.__fusion1324.status());
  expect(afterCancel.mode).toBe('choice');expect(afterCancel.stage).toBe(0);
  expect(afterCancel.combos).toBe(0);expect(afterCancel.choiceDone).toBe(0);
  await expect(page.locator('#fusionFromLevel')).toBeEnabled();

  await page.locator('#fusionFromLevel').click();
  await page.locator('[data-element-main="fire"]').click();
  await page.locator('[data-element-sub="ice"]').click();
  await page.locator('[data-fusion-weapon="A"]').click();
  await expect(page.locator('.fusion-confirm-gain')).toContainText('フォックスミサイル');
  await expect(page.locator('.fusion-confirm-loss')).toContainText('氷属性');
  await page.locator('#fusionConfirm').click();
  const afterConfirm=await page.evaluate(()=>window.__fusion1324.status());
  expect(afterConfirm.mode).toBe('elementResult');expect(afterConfirm.stage).toBe(1);
  expect(afterConfirm.combos).toBe(1);expect(afterConfirm.choiceDone).toBe(1);
  await page.locator('#elementContinue').click();
  expect((await page.evaluate(()=>window.__fusion1324.status())).mode).toBe('playing');
  expect(errors).toEqual([]);
});

test('boss POWER/LEGENDARY choice cannot be intercepted by fusion and pending level remains',async ({page})=>{
  const errors=await install(page);
  await page.evaluate(()=>window.__fusion1324.prepare(12,true,'major'));
  const state=await page.evaluate(()=>window.__fusion1324.status());
  expect(state.mode).toBe('choice');expect(state.kind).toBe('major');
  expect(state.pending).toBe(1);
  await expect(page.locator('#fusionFromLevel')).toHaveCount(0);
  await expect(page.locator('.choice')).toHaveCount(4);
  await page.locator('[data-choice="0"]').click();
  const next=await page.evaluate(()=>window.__fusion1324.status());
  expect(['playing','choice','fusion','uniqueReward']).toContain(next.mode);
  if(next.mode==='choice'){
    expect(next.kind).toBe('normal');
    await expect(page.locator('#fusionFromLevel')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('PILOT ARCHIVE has independent collapsed clear history and more beginner awards',async ({page})=>{
  const errors=await install(page);
  await page.locator('#openArchive').click();
  await expect(page.locator('.v13-clear-legacy')).toHaveCount(1);
  await expect(page.locator('.v13-clear-legacy')).not.toHaveAttribute('open',/.+/);
  await expect(page.locator('.v13-ach-tier-group')).toHaveCount(4);
  await expect(page.locator('.v13-ach-tier-group').first()).toHaveAttribute('open',/.*/);
  await expect(page.locator('.v13-ach-tier-group').nth(1)).not.toHaveAttribute('open',/.+/);
  await expect(page.locator('.v13-ach-tier-group').first().locator('.v13-achievement')).toHaveCount(17);
  await page.locator('.v13-clear-legacy summary').click();
  await expect(page.locator('.v13-clear-legacy')).toHaveAttribute('open',/.*/);
  expect(errors).toEqual([]);
});
