import {test,expect} from '@playwright/test';
import {BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const PROBE=String.raw`
window.__tacticalQA={
 reset(ship){selectedShip=ship;selectedGameMode='normal';newRun();mode='playing';soundOn=false;t=0;
 game.autoBank=true;game.spawn=game.nextBossAt=game.nextRaidAt=game.nextRelicAt=game.nextVacuumAt=1e9;
 enemies=[];hostile=[];hazards=[];boss=null;player.iframes=1e6;},
 grant(c){if(c.shipOnly==='dog'&&!player.dogChicks&&AnkinTactics.cards.find(x=>x.id===c.id)?.requires){this.grant(skillById('dogChick'));}
 game.lastChoice='normal';choices=[c];mode='choice';choose(0);for(let n=0;n<20&&mode!=='playing';n++){if(mode==='fusion')dismissFusion();else if(mode==='uniqueReward'||mode==='elementResult')continueAfterReward();else throw Error('Unhandled grant menu '+mode);}},
 all(){const out=[];for(const def of AnkinTactics.cards){this.reset(def.shipOnly);const c=skillById(def.id);this.grant(c);
 const duplicate=selectable([c]).length;spawnEnemy('drone',{x:player.x+70,y:player.y});enemies[0].hp=enemies[0].maxHp=1e8;
 game.activeChallenges=['doubleTime'];for(let i=0;i<30;i++)advanceSimulation(1/60);
 const fields=[...new Set(def.stats.map(e=>e[0]))].filter(k=>k!=='hp'&&k!=='shield');
 const before=Object.fromEntries(fields.map(k=>[k,player[k]])),flags={...player.tacticFlags},runtime=player.tacticState;
 restorePlayerBuild();const after=Object.fromEntries(fields.map(k=>[k,player[k]]));
 out.push({id:c.id,duplicate,before,after,flags,restoredFlags:player.tacticFlags,statePreserved:runtime===player.tacticState,combatClock:player.tacticState?.clock||0});}mode='menu';return out;},
 fusion(ship){this.reset(ship);const r=TACTICAL_FUSIONS.find(r=>r.shipOnly===ship);this.grant(skillById(r.power));this.grant(skillById(r.legend));
 activateUpgrades();const before=JSON.stringify(player.tacticFlags);restorePlayerBuild();activateUpgrades();
 const result={active:!!game.fusions[r.id],same:before===JSON.stringify(player.tacticFlags)};mode='menu';return result;},
 clocks(){const out=[];for(const ship of BALANCE_AI_SHIPS)for(const speed of [1,2]){this.reset(ship);
 for(const c of AnkinTactics.cards.filter(c=>c.shipOnly===ship))c&&this.grant(skillById(c.id));
 game.activeChallenges=speed===2?['doubleTime']:[];player.dashLeft=4;player.novaCooldown=4;
 let ts=1000;frame(ts);for(let i=0;i<60;i++){ts+=1000/60;frame(ts);}
 const total=game.total,clock=player.tacticState.clock;state('paused');frame(ts+10000);state('playing');frame(ts+20000);
 out.push({ship,speed,seconds:total,tacticClock:clock,paused:game.total-total,pausedTactic:player.tacticState.clock-clock,dash:player.dashLeft,nova:player.novaCooldown});}mode='menu';return out;},
 native(){const out={};
 this.reset('shot');for(const id of ['tacShotPierce','tacShotRearm'])this.grant(skillById(id));dash();for(let i=0;i<30;i++)advanceSimulation(1/120);fireFrom(player.x,player.y,{x:player.x+200,y:player.y},1,10,500,'primary');out.shot={counter:AnkinTactics.metrics(player).counterVolley||0,maxPierce:Math.max(...shots.map(b=>b.pierce))};
 this.reset('laser');this.grant(skillById('tacLaserPolaris'));spawnEnemy('drone',{x:player.x+130,y:player.y});const target=enemies[0];target.hp=target.maxHp=1e8;target.spd=0;target.shoot=1e9;
 for(let i=0;i<60;i++)advanceSimulation(1/60);const before=target.hp;damageEnemy(target,100,{special:true,source:'laser'});out.laser={locks:AnkinTactics.metrics(player).laserLock||0,hits:AnkinTactics.metrics(player).laserLockedHit||0,damage:before-target.hp};
 this.reset('shot');this.grant(skillById('tacShotFar'));spawnUltimateBoss();player.x=boss.x+300;player.y=boss.y;boss.hp=boss.invulnFloor+1;const parts=ultimatePartsAlive(),floor=boss.invulnFloor,damageBefore=game.damage;damageEnemy(boss,100,{source:'shot',tacticalPrimary:true});out.core={parts,floor,hp:boss.hp,damage:game.damage-damageBefore};
 this.reset('charge');this.grant(skillById('tacChargeBank'));player.charge=.7;player.chargeStationary=true;dash();updateCharge(1/120,1);out.charge={held:player.charge,shots:shots.length};player.dashTime=0;restorePlayerBuild();out.charge.stationary=player.chargeStationary;updateCharge(1/120,1);out.charge.released=shots.length;out.charge.after=player.charge;
 this.reset('drill');this.grant(skillById('tacDrillReserve'));player.drillPlasma=.8;dash();for(let i=0;i<30;i++)advanceSimulation(1/120);out.drill={refund:AnkinTactics.metrics(player).plasmaReturn||0,plasma:player.drillPlasma};
 this.reset('dog');this.grant(skillById('tacDogRecall'));fireDogBones();const n=shots.length;dash();out.dog={count:shots.length,before:n,returning:shots.filter(b=>b.returning).length};mode='menu';return out;
 }
};
`;
const BUDGET=String.raw`
function tacticalBudget(){
 const ship=player.shipType,reference={shot:'arsUniqueShot',laser:'arsUniqueLaser',charge:'arsUniqueCharge',drill:'arsUniqueDrill',dog:'arsUniqueDog'};
 const tactical=AnkinTactics.cards.filter(c=>c.shipOnly===ship);
 const tier=window.__tacticalTier,rarity=tier?.rarity;
 const definitions=tier?(tier.budget==='new'?tactical.filter(c=>c.rarity===rarity):AnkinArsenal.cards.filter(c=>c.rarity===rarity&&(c.shipOnly===ship||!c.shipOnly)).sort((a,b)=>(b.shipOnly===ship)-(a.shipOnly===ship)).slice(0,rarity==='power'?3:2)):
 window.__tacticalUniqueBudget?(window.__tacticalUniqueBudget==='new'?tactical.filter(c=>c.rarity==='unique'):[AnkinArsenal.cards.find(c=>c.id===reference[ship])]):
 window.__tacticalBudget==='new'?tactical.filter(c=>['uncommon','rare'].includes(c.rarity)):
 window.__tacticalBudget==='reference'?AnkinArsenal.cards.filter(c=>(c.shipOnly===ship||['arsGyro','arsPlating'].includes(c.id))&&['common','uncommon','rare','epic'].includes(c.rarity)).slice(0,4):[];
 if(ship==='dog'&&!player.dogChicks){const c=skillById('dogChick');c.apply(player);game.skills[c.id]=1;game.acquisitionLog.push(c.id);}
 for(const def of definitions){const c=skillById(def.id);c.apply(player);const bucket=c.rarity==='unique'?'uniques':'skills';game[bucket][c.id]=1;game.acquisitionLog.push(c.id);}
}
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  const ai=BALANCE_AI_HARNESS.replace('if(initialNovaReady)player.energy=100;', 'tacticalBudget();if(initialNovaReady)player.energy=100;')
   .replace('drillDiagnostics:balanceDrillReport(),','tacticalActivations:AnkinTactics.metrics(player),drillDiagnostics:balanceDrillReport(),')
   .replaceAll('drive(dt);','advanceSimulation(dt);')
   .replace("selectedGameMode=runMode;selectedShip=ship;newRun();mode='playing';",
    "selectedGameMode=runMode;selectedShip=ship;newRun();mode='playing';t=0;");
  await route.fulfill({response,body:html.replace(BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS+'\n'+ai+'\n'+BUDGET+'\n'+PROBE+'\n'+BALANCE_HARNESS_ANCHOR)});
 });await page.goto('./');return errors;
}

test('all 60 tactical cards: real acquisition, once-only, 2x combat and rebuild parity',async({page})=>{
 const errors=await setup(page),rows=await page.evaluate(()=>window.__tacticalQA.all());expect(rows).toHaveLength(60);
 for(const r of rows){expect(r.duplicate,r.id).toBe(0);expect(r.after,r.id).toEqual(r.before);expect(r.restoredFlags,r.id).toEqual(r.flags);expect(r.statePreserved,r.id).toBe(true);expect(r.combatClock,r.id).toBeGreaterThan(.99);}expect(errors).toEqual([]);
});
test('five tactical evolutions preserve flags through rebuild and activate once',async({page})=>{
 const errors=await setup(page);for(const ship of ['shot','laser','charge','drill','dog']){
 const r=await page.evaluate(s=>window.__tacticalQA.fusion(s),ship);expect(r.active,ship).toBe(true);expect(r.same,ship).toBe(true);}expect(errors).toEqual([]);
});
test('tactical simulation clocks and cooldowns pause and run at exact 1x/2x ratios',async({page})=>{
 const errors=await setup(page),rows=await page.evaluate(()=>window.__tacticalQA.clocks());for(const r of rows){
 expect(r.seconds,r.ship).toBeCloseTo(r.speed,1);expect(r.tacticClock,r.ship).toBeCloseTo(r.seconds,5);expect(r.paused).toBe(0);expect(r.pausedTactic).toBe(0);expect(r.dash).toBeCloseTo(4-r.speed,1);expect(r.nova).toBeCloseTo(4-r.speed,1);}expect(errors).toEqual([]);
});
test('native ship actions trigger tactical effects without adding emitters or clearing charge',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__tacticalQA.native());expect(r.shot.counter).toBe(1);expect(r.shot.maxPierce).toBeGreaterThan(0);expect(r.laser.locks).toBeGreaterThan(0);expect(r.laser.hits).toBeGreaterThan(0);expect(r.laser.damage).toBeCloseTo(145,5);expect(r.core.parts).toBe(3);expect(r.core.hp).toBe(r.core.floor);expect(r.core.damage).toBeCloseTo(1,6);expect(r.charge.held).toBe(.7);expect(r.charge.shots).toBe(0);expect(r.charge.stationary).toBe(true);expect(r.charge.released).toBe(1);expect(r.charge.after).toBe(0);expect(r.drill.refund).toBe(1);expect(r.drill.plasma).toBeGreaterThanOrEqual(.8*.04);expect(r.dog.count).toBe(r.dog.before);expect(r.dog.returning).toBe(r.dog.count);expect(errors).toEqual([]);
});
test('ship-specific tactical skills are searchable with complete tags at all widths',async({page})=>{
 const errors=await setup(page);await page.locator('#openTitleLab').click();await page.locator('[data-tab="atlas"]').click();await page.locator('#atlasSearch').fill('ほねっこ・みんなの帰る場所');
 await expect(page.locator('.atlas-card')).toHaveCount(1);await expect(page.locator('.atlas-card')).toContainText('一度限り');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('tactical standard balance: ten seeds x early/mid/late x five ships x two real conditions',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_STANDARD!=='1','Runs in the dedicated arsenal balance job.');
 test.setTimeout(900000);const errors=await setup(page),rows=[];
 for(const phase of [0,10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(let seed=1;seed<=10;seed++){
  const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({ship,scenario,seed,phase,budget})=>{
   window.__tacticalBudget=budget;return window.__ankinBalanceAI.runEncounter({ship,scenario,seed,phase,seconds:20});
  },{ship,scenario,seed,phase,budget}));rows.push({ship,scenario,seed,phase,pair});
 }
 const summary=[];
 for(const phase of [0,10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss']){
  const group=rows.filter(r=>r.phase===phase&&r.ship===ship&&r.scenario===scenario);
  const avg=(i,key)=>group.reduce((s,r)=>s+Number(r.pair[i][key]),0)/group.length;
  summary.push({phase,ship,scenario,referenceDps:avg(0,'dps'),newDps:avg(1,'dps'),referenceAlive:avg(0,'alive'),newAlive:avg(1,'alive'),referenceDamageTaken:avg(0,'damageTaken'),newDamageTaken:avg(1,'damageTaken')});
 }
 await mkdir('artifacts/tactics',{recursive:true});await writeFile('artifacts/tactics/'+testInfo.project.name+'-standard.json',JSON.stringify({rows,summary},null,2));
 console.log('TACTICAL_BALANCE='+JSON.stringify(summary));expect(rows).toHaveLength(300);expect(errors).toEqual([]);
});

test('tactical unique peer budgets: five machines, early/mid combat and twenty seeds',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_STANDARD!=='1','Runs in the dedicated arsenal balance job.');
 test.setTimeout(600000);const errors=await setup(page),rows=[];
 for(const phase of [0,10])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(let seed=1;seed<=20;seed++){
  const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({phase,ship,seed,scenario,budget})=>{
   window.__tacticalUniqueBudget=budget;const result=window.__ankinBalanceAI.runEncounter({phase,ship,seed,scenario,seconds:20});return result;
  },{phase,ship,seed,scenario,budget}));rows.push({phase,ship,seed,scenario,pair});
 }
 const summary=[];
 for(const phase of [0,10])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss']){
  const group=rows.filter(r=>r.phase===phase&&r.ship===ship&&r.scenario===scenario),avg=(i,k)=>group.reduce((s,r)=>s+Number(r.pair[i][k]),0)/group.length;
  summary.push({phase,ship,scenario,referenceDps:avg(0,'dps'),newDps:avg(1,'dps'),referenceAlive:avg(0,'alive'),newAlive:avg(1,'alive'),referenceDamageTaken:avg(0,'damageTaken'),newDamageTaken:avg(1,'damageTaken')});
 }
 await mkdir('artifacts/tactics',{recursive:true});await writeFile('artifacts/tactics/'+testInfo.project.name+'-unique-peers.json',JSON.stringify({rows,summary},null,2));
 console.log('TACTICAL_UNIQUE_PEERS='+JSON.stringify(summary));expect(rows).toHaveLength(400);expect(errors).toEqual([]);
});

// Same card counts and starting companion in both budgets; unchanged combat AI.
test('tactical upper-tier peer budgets: POWER LEGENDARY RELIC in mid/late combat',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_STANDARD!=='1','Runs in the dedicated balance job.');
 test.setTimeout(900000);const errors=await setup(page),rows=[];
 for(const phase of [10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(const rarity of ['power','legendary','relic'])for(let seed=1;seed<=10;seed++){
 const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({phase,ship,scenario,seed,rarity,budget})=>{
 window.__tacticalTier={rarity,budget};return window.__ankinBalanceAI.runEncounter({phase,ship,scenario,seed,seconds:20});
 },{phase,ship,scenario,seed,rarity,budget}));rows.push({phase,ship,scenario,seed,rarity,pair});
 }
 const summary=[];for(const phase of [10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(const rarity of ['power','legendary','relic']){
 const g=rows.filter(r=>r.phase===phase&&r.ship===ship&&r.scenario===scenario&&r.rarity===rarity),avg=(i,k)=>g.reduce((s,r)=>s+Number(r.pair[i][k]),0)/g.length;
 summary.push({phase,ship,scenario,rarity,referenceDps:avg(0,'dps'),newDps:avg(1,'dps'),referenceAlive:avg(0,'alive'),newAlive:avg(1,'alive'),referenceDamageTaken:avg(0,'damageTaken'),newDamageTaken:avg(1,'damageTaken')});}
 await mkdir('artifacts/tactics',{recursive:true});await writeFile('artifacts/tactics/'+testInfo.project.name+'-upper-peers.json',JSON.stringify({rows,summary},null,2));
 console.log('TACTICAL_UPPER_PEERS='+JSON.stringify(summary));expect(rows).toHaveLength(600);expect(errors).toEqual([]);
});
