import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogHarness} from '../scripts/catalog-harness.mjs';
const h=catalogHarness(),T=h.ctx.AnkinTactics;
function pilot(ship,...ids){h.ctx.selectedShip=ship;const p=h.eval('initialP()');for(const id of ids)T.apply(p,id);return p;}
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('60 ship-specific one-off skills: 12 per ship, four modest normals, real recipes',()=>{
 assert.equal(T.cards.length,60);assert.equal(new Set(T.cards.map(c=>c.id)).size,60);
 for(const ship of ['shot','laser','charge','drill','dog']){
  const cards=T.cards.filter(c=>c.shipOnly===ship);assert.equal(cards.length,12);
  const normals=cards.filter(c=>['uncommon','rare'].includes(c.rarity));assert.equal(normals.length,4);
  for(const c of normals)assert.equal(c.stats.length,0,c.id);
  for(const c of cards){assert(c.tags.includes('一度限り'));assert(c.desc.length<100);assert(!/テスト|実装|調整予定/.test(c.desc));
   for(const other of ['shot','laser','charge','drill','dog'].filter(x=>x!==ship))assert.equal(T.available(pilot(other),c.id),false);
   h.ctx.player=pilot(ship);h.ctx.player.dogChicks=1;
   const bucket={power:'powers',legendary:'legends',unique:'uniques',relic:'relics'}[c.rarity]||'skills';
   assert.equal(h.eval(`eligible([skillById('${c.id}')]).length`),1,c.id);
   h.ctx.game[bucket][c.id]=1;assert.equal(h.eval(`eligible([skillById('${c.id}')]).length`),0,c.id);delete h.ctx.game[bucket][c.id];
  }
  const r=h.ctx.recipes.find(r=>r.shipOnly===ship&&r.id.startsWith('tacEvo'));assert(r);
  for(const id of [r.power,r.legend])assert(cards.some(c=>c.id===id));
 }
});
test('preview flags are copied; passive application never creates or resets combat timers',()=>{
 const p=pilot('shot','tacShotFar');T.tick(p,2,true);const s=p.tacticState,preview={...p};T.apply(preview,'tacShotNear');
 assert.equal(p.tacticFlags.shotNear,undefined);assert.equal(p.tacticState,s);assert.equal(s.clock,2);
 T.apply(p,'tacShotStrafe');assert.equal(p.tacticState,s);T.evolve(p,'shot');assert.equal(p.tacticState,s);
});
test('shot counter consumes exactly one volley after dash, expires and caps combined damage',()=>{
 const p=pilot('shot','tacShotPierce','tacShotRearm','tacShotLane','tacShotStar','tacShotFar','tacShotOpener');
 p.dashTime=.2;T.onDash(p,[]);p.dashTime=0;T.tick(p,.2,true);
 const v=T.shotVolley(p);assert.equal(v.pierce,3);close(v.damage,1.8);assert.equal(T.shotVolley(p).damage,1);
 const e={x:p.x+300,y:p.y,hp:100,maxHp:100};close(T.damageMultiplier(p,e,{tacticalPrimary:true,tacticalVolleyFactor:v.damage})*v.damage,1.8);
 T.onDash(p,[]);T.tick(p,.01,false);for(let i=0;i<240;i++)T.tick(p,1/120,false);assert.equal(T.shotVolley(p).damage,1);
 assert.equal(T.damageMultiplier(p,e,{source:'nova'}),1);
});
test('laser lock tracks primary target, resets on change/obstruction and distinguishes initial acquisition',()=>{
 const p=pilot('laser','tacLaserLock','tacLaserSwitch','tacLaserCycle','tacLaserBrace');p.dashLeft=2;
 const a={x:p.x+200,y:p.y,hp:100,maxHp:100},b={...a};T.laserTarget(p,a);T.tick(p,.5,true);
 close(T.damageMultiplier(p,a,{source:'laser'}),1);T.tick(p,.51,true);close(T.damageMultiplier(p,a,{source:'laser'}),1.07);close(p.dashLeft,1.92);close(T.shieldMultiplier(p),1.5);
 a.dead=true;T.tick(p,.01,true);T.laserTarget(p,b);close(T.damageMultiplier(p,b,{source:'laser'}),1.08);
 T.laserTarget(p,null);T.tick(p,1,true);close(T.shieldMultiplier(p),1);T.laserTarget(p,a);assert.equal(p.tacticState.laserAge,0);
});
test('charge has bounded partial-release windows, NOVA isolation and cooldown throttling',()=>{
 const p=pilot('charge','tacChargeMid','tacChargeMidPower','tacChargeFeather','tacChargeVent','tacChargeCover','tacChargeBastion','tacChargeMobile');p.dashLeft=2;
 close(T.chargeFire(p,.4,false).damage,1.57);assert.equal(T.chargeFire(p,.85,false).pierce,1);assert.equal(T.chargeFire(p,.851,false).pierce,0);
 assert.equal(T.chargeFire(p,1,true),null);close(p.dashLeft,2);T.chargeFire(p,1,false);T.chargeFire(p,1,false);close(p.dashLeft,1.7);T.tick(p,1.5,false);T.chargeFire(p,1,false);close(p.dashLeft,1.4);
 p.charge=.5;p.chargeStationary=true;close(T.incomingMultiplier(p),.78);p.dashTime=.2;assert.equal(T.incomingMultiplier(p),1);
 close(T.mobileCharge(p),.18);p.relicChargeMomentum=1;close(T.mobileCharge(p),.25);
});
test('drill refunds consumed plasma once, takes highest refund and cannot recycle overdrive',()=>{
 const p=pilot('drill','tacDrillReserve','tacDrillRelease','tacDrillFlywheel','tacDrillMark','tacDrillRhythm');
 p.drillPlasma=.8;p.dashTime=.24;T.onDash(p,[]);p.drillPlasma=0;p.dashTime=0;T.tick(p,.25,true);close(p.drillPlasma,.144);T.tick(p,1,true);close(p.drillPlasma,.144);
 p.drillOverdriveTime=3;p.drillPlasma=1;T.onDash(p,[]);T.tick(p,.25,true);close(p.drillPlasma,1);
 const a={hp:1,maxHp:1},b={...a};T.onContact(p,a);close(T.damageMultiplier(p,a,{source:'drill',tacticalRush:true}),1.06);assert.equal(T.damageMultiplier(p,b,{source:'drill',tacticalRush:true}),1);
 T.tick(p,1.21,true);assert.equal(T.damageMultiplier(p,a,{source:'drill',tacticalRush:true}),1);
});
test('DOG recalls existing normal bones only; catch/energy are throttled and exclude NOVA/extra damage',()=>{
 const p=pilot('dog','tacDogRecall','tacDogCatch','tacDogPiyo','tacDogRetrieve','tacDogWelcome','tacDogLeader');
 const normal={kind:'bone',ttl:1,hit:new Set([1])},nova={kind:'bone',ttl:1,novaBone:true,hit:new Set([1])};p.dashTime=.2;T.onDash(p,[normal,nova]);assert.equal(normal.returning,true);assert.equal(normal.hit.size,0);assert.equal(normal.ttl,1);assert.equal(nova.returning,undefined);
 p.dashTime=0;p.dashLeft=2;p.shieldMax=100;p.shield=0;T.tick(p,.21,true);T.onCatch(p,nova);assert.equal(T.eggMultiplier(p),1);
 T.onCatch(p,normal);T.onCatch(p,normal);close(p.shield,10);close(p.dashLeft,1.82);close(T.speedMultiplier(p),1.06);close(T.eggMultiplier(p),.9);
 const e={x:p.x,y:p.y,hp:100,maxHp:100};close(T.damageMultiplier(p,e,{source:'dogEgg'}),1.35);
 let energy=0;const gain=n=>energy+=n;T.damageMultiplier(p,e,{source:'bone',tacticalReturning:true},gain);T.damageMultiplier(p,e,{source:'bone',tacticalReturning:true,tacticalExtra:true},gain);T.damageMultiplier(p,e,{source:'nova',tacticalReturning:true},gain);T.damageMultiplier(p,e,{source:'bone',tacticalReturning:true},gain);close(energy,.5);
 T.tick(p,1.51,false);assert.equal(T.eggMultiplier(p),1);assert.equal(T.damageMultiplier(p,e,{source:'dogEgg'}),1);
});
test('simulation timers agree across one-step and two-step frame scheduling',()=>{
 const a=pilot('dog','tacDogCatch'),b=pilot('dog','tacDogCatch');T.onCatch(a,{});T.onCatch(b,{});
 for(let frame=0;frame<60;frame++)T.tick(a,1/120,true);
 for(let frame=0;frame<30;frame++)for(let step=0;step<2;step++)T.tick(b,1/120,true);
 close(a.tacticState.clock,b.tacticState.clock);close(T.speedMultiplier(a),T.speedMultiplier(b));

});


test('actual damage pipeline preserves final-boss core HP floor after tactical bonuses',()=>{
 const h=catalogHarness();Object.assign(h.ctx,{ultimatePartsAlive:()=>1,hasBossSuper:()=>false,engageBarrierBlocks:()=>false,trackBalanceDamage:()=>{},gainNovaEnergy:()=>{}});
 h.eval(h.declaration('DAMAGE_LABELS'));h.eval(h.declaration('damageEnemy'));h.ctx.player=h.eval('initialP()');h.ctx.AnkinTactics.apply(h.ctx.player,'tacShotFar');
 Object.assign(h.ctx.game,{damage:0,damageStats:{},bossDamage:0});h.ctx.enemy={x:h.ctx.player.x+300,y:h.ctx.player.y,hp:1000,maxHp:1000,invulnFloor:999,type:'ultimate'};
 h.eval("damageEnemy(enemy,100,{source:'shot',tacticalPrimary:true})");assert.equal(h.ctx.enemy.hp,999);assert.equal(h.ctx.game.damage,1);assert.equal(h.ctx.game.bossDamage,1);
 h.eval("damageEnemy(enemy,100,{source:'shot',tacticalPrimary:true})");assert.equal(h.ctx.enemy.hp,999);assert.equal(h.ctx.game.damage,1);
});
