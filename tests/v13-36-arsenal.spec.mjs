import {test,expect} from '@playwright/test';
import {BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const PROBE=String.raw`
window.__arsenalQA={
 reset(ship){selectedShip=ship;selectedGameMode='normal';newRun();mode='playing';soundOn=false;t=0;
  game.autoBank=true;game.spawn=game.nextBossAt=game.nextRaidAt=game.nextRelicAt=game.nextVacuumAt=1e9;
  enemies=[];hostile=[];hazards=[];boss=null;player.iframes=1e6;},
 grant(c){if(c.shipOnly==='dog'&&AnkinArsenal.cards.find(d=>d.id===c.id)?.requires==='dogChicks'&&!player.dogChicks)this.grant(skillById('dogChick'));
  game.lastChoice='normal';choices=[c];mode='choice';choose(0);for(let n=0;n<20&&mode!=='playing';n++){if(mode==='fusion')dismissFusion();else if(mode==='uniqueReward'||mode==='elementResult')continueAfterReward();else throw Error('Unhandled grant menu '+mode);}},
 all(){const out=[];for(const def of AnkinArsenal.cards){this.reset(def.shipOnly||'shot');
  const c=skillById(def.id);this.grant(c);
  const duplicate=selectable([c]).length;
  spawnEnemy('drone',{x:player.x+70,y:player.y});enemies[0].hp=1e8;enemies[0].maxHp=1e8;
  game.activeChallenges=['doubleTime'];for(let i=0;i<30;i++)advanceSimulation(1/60);
  const fields=[...new Set(def.effects.map(e=>e[0]))].filter(k=>k!=='hp'&&k!=='shield');
  const before=Object.fromEntries(fields.map(k=>[k,player[k]]));restorePlayerBuild();
  const after=Object.fromEntries(fields.map(k=>[k,player[k]]));
  out.push({id:c.id,before,after,duplicate,finite:Object.values(after).every(Number.isFinite),tags:c.tags});
 }mode='menu';return out;},
 fusion(ship){this.reset(ship);const recipe=ARSENAL_FUSIONS.find(r=>r.shipOnly===ship);
  this.grant(skillById(recipe.power));this.grant(skillById(recipe.legend));
  const before=JSON.stringify(game.fusions);activateUpgrades();
  const active=Object.keys(game.fusions).filter(id=>id===recipe.id).length;
  mode='menu';return {active,same:before===JSON.stringify(game.fusions),name:recipe.name};},
 catalog(){return ALL_SKILL_DEFS().map(c=>({id:c.id,name:c.name,desc:c.desc,tags:c.tags,ship:c.shipOnly,rarity:c.rarity,arsenal:!!c.arsenal}));},
 offer(ship,kind){this.reset(ship);game.level=30;game.total=700;
  const out=offerCards(kind).map(c=>({id:c.id,supply:!!c.isSupply,tags:c.tags,rarity:c.rarity,arsenal:!!c.arsenal}));mode='menu';return out;}
};
`;
// Controlled, equal-card-budget normal loadouts, using actual shipped card applications.
const BUDGET=String.raw`
function arsenalBudget(){
 if(window.__arsenalUniqueBudget){
  const reference={shot:'limitBreak',laser:'lUniqueLimit',charge:'cUniqueLimit',drill:'dUnique',dog:'dogUniquePack'};
  const id=window.__arsenalUniqueBudget==='new'?'arsUnique'+player.shipType[0].toUpperCase()+player.shipType.slice(1):reference[player.shipType];
  const c=skillById(id);c.apply(player);game.uniques[c.id]=1;game.acquisitionLog.push(c.id);return;
 }
 const api=typeof AnkinArsenal==='undefined'?null:AnkinArsenal;
 const definitions=api?.cards.filter(c=>['common','uncommon','rare','epic'].includes(c.rarity))||[];
 const eligible=definitions.map(d=>skillById(d.id)).filter(c=>c&&fitsShip(c)&&(!c.available||c.available(player)));
 const reference=['damage','speed','hp','pickup','battery','dash','regen','critical','barrier','xp','armor','radius'];
 const count=eligible.length||12;
 const cards=window.__arsenalBudget==='new'?eligible:window.__arsenalBudget==='reference'?reference.slice(0,count).map(skillById):[];
 for(const c of cards){c.apply(player);game.skills[c.id]=(game.skills[c.id]||0)+1;game.acquisitionLog.push(c.id);}
}
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();expect(html).toContain(BALANCE_HARNESS_ANCHOR);
  const ai=BALANCE_AI_HARNESS.replace('if(initialNovaReady)player.energy=100;', 'arsenalBudget();if(initialNovaReady)player.energy=100;')
   .replaceAll('drive(dt);','advanceSimulation(dt);')
   .replace("selectedGameMode=runMode;selectedShip=ship;newRun();mode='playing';",
    "selectedGameMode=runMode;selectedShip=ship;newRun();mode='playing';t=0;");
  await route.fulfill({response,body:html.replace(BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS+'\n'+ai+'\n'+BUDGET+'\n'+PROBE+'\n'+BALANCE_HARNESS_ANCHOR)});
 });await page.goto('./');return errors;
}
test('all 59 cards: actual acquisition, no duplicate, 2x combat, finite stats and rebuild parity',async({page})=>{
 const errors=await setup(page);const rows=await page.evaluate(()=>window.__arsenalQA.all());expect(rows).toHaveLength(59);
 for(const r of rows){expect(r.duplicate,r.id).toBe(0);expect(r.finite,r.id).toBe(true);expect(r.after,r.id).toEqual(r.before);expect(r.tags).toContain('一度限り');}
 expect(errors).toEqual([]);
});
test('five new evolutions activate once, and all reward pools keep complete tagged choices',async({page})=>{
 const errors=await setup(page);
 for(const ship of ['shot','laser','charge','drill','dog']){
  const fusion=await page.evaluate(s=>window.__arsenalQA.fusion(s),ship);expect(fusion.active).toBe(1);expect(fusion.same).toBe(true);
  for(const kind of ['normal','minor','major','unique','relic']){
   const offer=await page.evaluate(({ship,kind})=>window.__arsenalQA.offer(ship,kind),{ship,kind});
   expect(offer).toHaveLength(['minor','major'].includes(kind)?4:3);
   expect(offer.every(c=>!c.supply&&c.tags.length>0)).toBe(true);expect(new Set(offer.map(c=>c.id)).size).toBe(offer.length);
   expect(offer.filter(c=>c.arsenal).length).toBeLessThanOrEqual(1);
  }
 }
 expect(errors).toEqual([]);
});
test('new skills and concise descriptions are searchable in BUILD LAB at all screen sizes',async({page})=>{
 const errors=await setup(page);await page.locator('#openTitleLab').click();await page.locator('[data-tab="atlas"]').click();
 await page.locator('#atlasSearch').fill('ほねっこ・きらきら大冒険');
 await expect(page.locator('.atlas-card')).toHaveCount(1);await expect(page.locator('.atlas-card')).toContainText('一度限り');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('normal skill budget: five ships, two live conditions, three seeded pairs',async({page},testInfo)=>{
 test.setTimeout(180000);const errors=await setup(page),rows=[];
 for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(const seed of [1,2,3]){
  const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({ship,scenario,seed,budget})=>{
   window.__arsenalBudget=budget;return window.__ankinBalanceAI.runEncounter({ship,scenario,seed,phase:10,seconds:10});
  },{ship,scenario,seed,budget}));
  for(const r of pair){expect(Number.isFinite(r.dps)).toBe(true);expect(r.playerHp).toBeGreaterThanOrEqual(0);}rows.push({ship,scenario,seed,pair});
 }
 await testInfo.attach('normal-budget-comparison.json',{body:JSON.stringify(rows,null,2),contentType:'application/json'});expect(errors).toEqual([]);
});
test('arsenal standard balance: ten seeds x early/mid/late x five ships x two real conditions',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_STANDARD!=='1','Runs in the dedicated arsenal balance job.');
 test.setTimeout(900000);const errors=await setup(page),rows=[];
 for(const phase of [0,10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(let seed=1;seed<=10;seed++){
  const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({ship,scenario,seed,phase,budget})=>{
   window.__arsenalBudget=budget;return window.__ankinBalanceAI.runEncounter({ship,scenario,seed,phase,seconds:20});
  },{ship,scenario,seed,phase,budget}));rows.push({ship,scenario,seed,phase,pair});
 }
 const summary=[];
 for(const phase of [0,10,20])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss']){
  const group=rows.filter(r=>r.phase===phase&&r.ship===ship&&r.scenario===scenario);
  const avg=(i,key)=>group.reduce((s,r)=>s+Number(r.pair[i][key]),0)/group.length;
  summary.push({phase,ship,scenario,referenceDps:avg(0,'dps'),newDps:avg(1,'dps'),referenceAlive:avg(0,'alive'),newAlive:avg(1,'alive'),referenceDamageTaken:avg(0,'damageTaken'),newDamageTaken:avg(1,'damageTaken')});
 }
 await mkdir('artifacts/arsenal',{recursive:true});await writeFile('artifacts/arsenal/'+testInfo.project.name+'-standard.json',JSON.stringify({rows,summary},null,2));
 console.log('ARSENAL_BALANCE='+JSON.stringify(summary));expect(rows).toHaveLength(300);expect(errors).toEqual([]);
});

test('arsenal unique peer budgets: five machines, early/mid combat and ten seeds',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_STANDARD!=='1','Runs in the dedicated arsenal balance job.');
 test.setTimeout(600000);const errors=await setup(page),rows=[];
 for(const phase of [0,10])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss'])for(let seed=1;seed<=10;seed++){
  const pair=[];for(const budget of ['reference','new'])pair.push(await page.evaluate(({phase,ship,seed,scenario,budget})=>{
   window.__arsenalUniqueBudget=budget;return window.__ankinBalanceAI.runEncounter({phase,ship,seed,scenario,seconds:20});
  },{phase,ship,seed,scenario,budget}));rows.push({phase,ship,seed,scenario,pair});
 }
 const summary=[];
 for(const phase of [0,10])for(const ship of ['shot','laser','charge','drill','dog'])for(const scenario of ['live-pack','live-boss']){
  const group=rows.filter(r=>r.phase===phase&&r.ship===ship&&r.scenario===scenario),avg=(i,k)=>group.reduce((s,r)=>s+Number(r.pair[i][k]),0)/group.length;
  summary.push({phase,ship,scenario,referenceDps:avg(0,'dps'),newDps:avg(1,'dps'),referenceAlive:avg(0,'alive'),newAlive:avg(1,'alive'),referenceDamageTaken:avg(0,'damageTaken'),newDamageTaken:avg(1,'damageTaken')});
 }
 await mkdir('artifacts/arsenal',{recursive:true});await writeFile('artifacts/arsenal/'+testInfo.project.name+'-unique-peers.json',JSON.stringify({rows,summary},null,2));
 console.log('ARSENAL_UNIQUE_PEERS='+JSON.stringify(summary));expect(rows).toHaveLength(200);expect(errors).toEqual([]);
});
test('arsenal full progression: paired seeds, both real modes, actual random rewards',async({page},testInfo)=>{
 test.skip(process.env.ANKIN_ARSENAL_FULL!=='1','Full base/candidate comparison runs in the dedicated progression job.');
 const seedCount=Number(process.env.ANKIN_ARSENAL_FULL_SEEDS||3);
 expect(Number.isInteger(seedCount)&&seedCount>=3&&seedCount<=20).toBe(true);
 const seeds=Array.from({length:seedCount},(_,i)=>17+i);
 const modes=process.env.ANKIN_ARSENAL_MODE?[process.env.ANKIN_ARSENAL_MODE]:['normal','challenge'];
 expect(modes.every(m=>['normal','challenge'].includes(m))).toBe(true);
 const ships=process.env.ANKIN_ARSENAL_SHIP?[process.env.ANKIN_ARSENAL_SHIP]:['shot','laser','charge','drill','dog'];
 expect(ships.every(s=>['shot','laser','charge','drill','dog'].includes(s))).toBe(true);
 test.setTimeout(2100000);const errors=await setup(page),rows=[];
 const saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
 for(const gameMode of modes)for(const ship of ships)for(const seed of seeds){
  const r=await page.evaluate(args=>window.__ankinBalanceAI.runFull({...args,fusionPolicy:'always'}),{ship,gameMode,seed});
  expect(r.stopReason.startsWith('unhandled-menu'),JSON.stringify({ship,gameMode,seed,stop:r.stopReason,time:r.simulationTime})).toBe(false);expect(Number.isFinite(r.dps)).toBe(true);rows.push(r);
 }
 const summary=rows.map(r=>({ship:r.ship,gameMode:r.gameMode,seed:r.seed,seconds:r.simulationTime,result:r.stopReason,fusions:r.elementFusions,choices:r.menuChoices,clear:r.clearCount,boss:r.reachedFinalBoss}));
 console.log('ARSENAL_PROGRESSION='+JSON.stringify(summary));
 await mkdir('artifacts/arsenal',{recursive:true});await writeFile('artifacts/arsenal/'+testInfo.project.name+'-progression.json',JSON.stringify({rows,summary},null,2));
 expect(rows).toHaveLength(modes.length*ships.length*seedCount);expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(saved);expect(errors).toEqual([]);
});
