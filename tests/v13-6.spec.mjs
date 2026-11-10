import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`
window.__trialProbe={
 snapshot(){return {mode,back:!!menuLabBackup,game:!!game,ship:player?.shipType||null,opened:ankinTrialOpen,selected:[...selectedChallenges]}},
 unlock(){
  const old=record.read;
  record.read=()=>{const r=old();return {...r,clears:r.clears?.length?r.clears:[{id:'trial-test-clear',mode:'normal',ship:'shot',time:1800,level:8,date:'2026-10-27',damage:1000}]};};
  drawOverlay();
 },
 begin(){newRun();return {trials:[...game.activeChallenges],dash:player.dashCd}},
 effects(){
  newRun();game.total=1;game.spawn=99999;game.nextBossAt=99999;game.nextRaidAt=99999;game.nextRelicAt=99999;
  enemies=[];shots=[];hostile=[];zones=[];boss=null;
  game.activeChallenges=[];
  const baseline=spawnEnemy('drone',{x:player.x+110,y:player.y});
  game.activeChallenges=['ironclad','vicious'];
  const hard=spawnEnemy('drone',{x:player.x+150,y:player.y});
  hostile=[];game.activeChallenges=[];hostileShot(0,0,0,100,10,5,'#fff');
  const bulletNormal=hostile[0].vx;
  hostile=[];game.activeChallenges=['ballistic'];hostileShot(0,0,0,100,10,5,'#fff');
  const bulletFast=hostile[0].vx;
  game.need=99999;game.xp=0;game.activeChallenges=[];addExp(50);const xpNormal=game.xp;
  game.xp=0;game.activeChallenges=['famine'];addExp(50);const xpLow=game.xp;
  player.energy=0;game.activeChallenges=[];gainNovaEnergy(40);const novaNormal=player.energy;
  player.energy=0;game.activeChallenges=['novaTax'];gainNovaEnergy(40);const novaLow=player.energy;
  return {hpNormal:baseline.maxHp,hpTrial:hard.maxHp,dmgNormal:baseline.dmg,dmgTrial:hard.dmg,
    bulletNormal,bulletFast,xpNormal,xpLow,novaNormal,novaLow};
 },
 restore(){
  newRun();const prevGame=game,prevPlayer=player;state('menu');
  openTitleLab();const preview=!!menuLabBackup&&game!==prevGame&&player!==prevPlayer;
  state('menu');return {preview,restoredGame:game===prevGame,restoredPlayer:player===prevPlayer};
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('Trial injection anchor changed');
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('title LAB previews recipe and codex safely',async({page})=>{
 const errors=await setup(page);
 await expect(page.locator('#openTitleLab')).toBeVisible();
 expect((await page.evaluate(()=>window.__trialProbe.snapshot())).game).toBe(false);
 await page.locator('#openTitleLab').click();
 expect(await page.evaluate(()=>window.__trialProbe.snapshot())).toMatchObject({mode:'build',back:true,game:true});
 await expect(page.locator('.lab-panel')).toBeVisible();
 await expect(page.locator('#hud')).toBeHidden();
 await expect(page.locator('#atlasResults')).toBeVisible();
 await page.locator('[data-tab="evolution"]').click();
 await expect(page.locator('#recipeResults')).toBeVisible();
 await expect(page.locator('[data-target]')).toHaveCount(0);
 await page.locator('[data-tab="synergy"]').click();
 await expect(page.locator('#recipeResults')).toBeVisible();
 await page.locator('[data-tab="enemies"]').click();
 await expect(page.locator('#enemyCodexResults')).toBeVisible();
 await page.locator('#back').click();
 expect(await page.evaluate(()=>window.__trialProbe.snapshot())).toMatchObject({mode:'menu',back:false,game:false});
 await expect(page.locator('#start')).toBeVisible();expect(errors).toEqual([]);
});
test('ANKIN TRIAL is a compact collapsible eleven-choice area with unlock',async({page})=>{
 const errors=await setup(page),trial=page.locator('#ankinTrial');
 await expect(trial).not.toHaveAttribute('open','');
 await expect(trial.locator('summary')).toContainText('ANKIN TRIAL');
 await trial.locator('summary').click();
 await expect(trial).toHaveAttribute('open','');
 await expect(trial.locator('[data-v13-challenge]')).toHaveCount(11);
 await expect(trial.locator('[data-v13-challenge="swift"]')).toBeDisabled();
 await page.evaluate(()=>window.__trialProbe.unlock());
 await expect(page.locator('#ankinTrial')).toHaveAttribute('open','');
 for(const id of ['swift','vicious','dashTax'])await page.locator('[data-v13-challenge="'+id+'"]').click();
 await expect(page.locator('#ankinTrial .trial-counter')).toContainText('3 / 11');
 await expect(page.locator('[data-v13-challenge="swift"]')).toHaveAttribute('aria-pressed','true');
 const snapshot=await page.evaluate(()=>window.__trialProbe.begin());
 expect(snapshot.trials).toEqual(expect.arrayContaining(['swift','vicious','dashTax']));
 expect(snapshot.dash).toBeCloseTo(3.45,2);
 expect(errors).toEqual([]);
});
test('selected trial mechanics affect HP, damage, bullets, experience and NOVA',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__trialProbe.effects());
 expect(x.hpTrial/x.hpNormal).toBeCloseTo(1.2,1);
 expect(x.dmgTrial/x.dmgNormal).toBeCloseTo(1.2,1);
 expect(x.bulletFast/x.bulletNormal).toBeCloseTo(1.2,2);
 expect(x.xpLow/x.xpNormal).toBeCloseTo(.8,2);
 expect(x.novaLow/x.novaNormal).toBeCloseTo(.7,2);
 expect(errors).toEqual([]);
});
test('menu LAB restores any earlier game/player objects',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__trialProbe.restore());
 expect(x).toEqual({preview:true,restoredGame:true,restoredPlayer:true});expect(errors).toEqual([]);
});
