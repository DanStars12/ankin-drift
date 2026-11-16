import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeHarness} from '../scripts/runtime-vm-harness.mjs';
function setup(ship){const h=runtimeHarness();h.api.reset(ship);h.api.stopSpawns();h.api.clear();h.eval('Math.random=()=>.5');return h;}
function saturate(h){for(let i=0;i<290;i++)h.api.shots.push({ttl:10});}
test('a saturated projectile pool retains the charged shot without spending discharge benefits, then releases once',()=>{
 const h=setup('charge');h.api.acquire('tacChargeVent');h.api.acquire('rChargeEcho');let p=h.api.player;
 Object.assign(p,{charge:1,chargeStationary:true,shotTimer:0,dashLeft:2});saturate(h);
 h.api.updateCharge(1/60,1);assert.equal(p.charge,1);assert.equal(p.chargeStationary,false);assert.equal(p.chargeReleasePending,true);assert.equal(p.dashLeft,2);assert.equal(p.relicEchoQueue.length,0);
 h.api.restorePlayerBuild();p=h.api.player;assert.equal(p.chargeReleasePending,true);assert.equal(p.charge,1);
 h.api.shots.length=0;h.api.updateCharge(1/60,1);assert.equal(p.charge,0);assert.equal(p.chargeReleasePending,false);assert.equal(p.relicEchoQueue.length,1);assert.equal(p.dashLeft,1.7);
 const count=h.api.shots.length;h.api.updateCharge(1/60,1);assert.equal(h.api.shots.length,count);assert.equal(p.relicEchoQueue.length,1);
});
test('a waiting discharge can stop and resume charging without gaining the stationary defense while moving',()=>{
 const h=setup('charge'),p=h.api.player;h.api.acquire('tacChargeBastion');Object.assign(p,{charge:.7,chargeStationary:true});saturate(h);
 h.api.updateCharge(1/60,1);assert.equal(h.ctx.AnkinTactics.incomingMultiplier(p),1);
 h.api.updateCharge(.1,0);assert.ok(p.charge>.7);assert.equal(p.chargeReleasePending,false);assert.equal(p.chargeStationary,true);assert.ok(Math.abs(h.ctx.AnkinTactics.incomingMultiplier(p)-.82)<1e-12);
});
test('rebuilding a charge build preserves the live echo queue and emits its pending comet exactly once',()=>{
 const h=setup('charge');h.api.acquire('rChargeEcho');h.api.fireComet(1);const echo=h.api.player.relicEchoQueue[0];echo.time=.1;
 h.api.restorePlayerBuild();assert.equal(h.api.player.relicEchoQueue[0],echo);h.api.tickEchoShots(h.api.player,.11);const count=h.api.shots.length;
 assert.equal(h.api.player.relicEchoQueue.length,0);h.api.tickEchoShots(h.api.player,.11);assert.equal(h.api.shots.length,count);
});
test('CHARGE NOVA clears a pending normal discharge and still creates NOVA shots at the projectile cap',()=>{
 const h=setup('charge'),p=h.api.player;Object.assign(p,{charge:1,chargeReleasePending:true,chargeStationary:false});saturate(h);h.api.nova(true);
 assert.equal(p.charge,0);assert.equal(p.chargeReleasePending,false);assert.ok(h.api.shots.some(b=>b.kind==='novaCharge'));assert.ok(h.api.shots.length<=290);
});
function boneHit({returning=false,nova=false,crit=0,bossBane=1,returnScale=2}={}){
 const h=setup('dog'),p=h.api.player;Object.assign(p,{crit,critMult:2,bossBane,dogBoneReturn:returnScale});h.eval('Math.random=()=>0');
 const e=h.api.enemy('drone',{type:'major',x:p.x+100,y:p.y,hp:1e6,maxHp:1e6,spd:0});
 h.api.projectileHit({kind:'bone',source:nova?'nova':'shot',novaBone:nova,returning,damage:100,vx:-300,vy:0,x:e.x,y:e.y,pierce:999},e);return h.api.game.damage;
}
test('DOG return bonus shares the critical and boss multipliers with the complete normal-bone hit',()=>{
 assert.equal(boneHit({returning:true,crit:1,bossBane:1.5}),600);
 assert.equal(boneHit({returning:false,crit:1,bossBane:1.5}),300);
 assert.equal(boneHit({returning:true}),200);
});
test('DOG NOVA bones ignore normal bone return, critical and boss-only upgrades',()=>{
 assert.equal(boneHit({returning:true,nova:true,crit:1,bossBane:2,returnScale:5}),100);
});
function contact(bane,nova=false,type='major'){
 const h=setup('drill'),p=h.api.player;Object.assign(p,{dx:1,dy:0,crit:0,bossBane:bane,drillOverdriveTime:nova?3:0});
 h.api.enemy('drone',{type,x:p.x+45,y:p.y,hp:1e6,maxHp:1e6,spd:0});h.api.updateDrill(1/60,1,p.x,p.y,false);return h.api.game.damage;
}
test('DRILL basic contact receives boss damage once and ordinary contact stays unchanged',()=>{
 assert.ok(contact(1)>0);assert.equal(contact(2),contact(1)*2);assert.equal(contact(2,false,'drone'),contact(1,false,'drone'));
});
test('DRILL NOVA contact uses NOVA output independently of boss-only basic attack upgrades',()=>{
 assert.ok(contact(1,true)>0);assert.equal(contact(2,true),contact(1,true));
});

test('the live DOG collision pipeline applies the return bonus once, with one damage event',()=>{
 const h=setup('dog'),p=h.api.player;Object.assign(p,{crit:1,critMult:2,dogBoneReturn:2,shotTimer:1e9});h.eval('Math.random=()=>0');
 const e=h.api.enemy('drone',{x:p.x+100,y:p.y,hp:1000,maxHp:1000,spd:0,shoot:1e9});
 h.api.shots.push({x:e.x,y:e.y,r:7,vx:-380,vy:0,damage:100,pierce:999,kind:'bone',source:'shot',returning:true,flight:1,range:245,homeSpeed:380,ttl:3,hit:new Set()});
 h.api.drive(1/60);assert.equal(h.api.game.damage,400);assert.equal(e.hp,600);assert.equal(h.api.game.damageStats.bone,400);
});

test('DRILL contact armor reduces real enemy body collisions, while projectiles keep their full damage',()=>{
 for(const ship of ['shot','laser','charge','drill','dog','phantom']){const h=setup(ship),p=h.api.player;Object.assign(p,{shield:0,shieldMax:0,regen:0,shotTimer:1e9});h.api.enemy('drone',{x:p.x,y:p.y,r:12,spd:0,dmg:40,hp:1e9,maxHp:1e9,shoot:1e9});const hp=p.hp;h.api.drive(1/60);assert.ok(Math.abs(hp-p.hp-(ship==='drill'?30:40))<1e-8,ship);p.iframes=0;const before=p.hp;h.api.loseHP(40);assert.ok(Math.abs(before-p.hp-40)<1e-8,ship+' projectile');}
});
test('eight normal DOG bones can focus four outbound hits on a stationary boss-sized target without adding projectiles',()=>{
 const h=setup('dog'),p=h.api.player;Object.assign(p,{dmg:100,dogBones:8,dogBonePower:1,crit:0,shotTimer:1e9});h.api.enemy('drone',{x:p.x+230,y:p.y,r:55,spd:0,hp:1e9,maxHp:1e9,shoot:1e9});h.api.shoot();assert.equal(h.api.shots.length,8);for(let i=0;i<38;i++)h.api.drive(1/60);assert.equal(h.api.game.damage,400);
});

test('DOG endurance cadence grows within its floor, rebuilds once, and never slows an already faster legacy build',()=>{
 const h=setup('dog');h.api.acquire('dogEndBoneFlight',8);const rate=h.api.player.rate;assert.ok(rate>=.65&&rate<1.12);h.api.restorePlayerBuild();assert.equal(h.api.player.rate,rate);const p=h.api.player;p.rate=.5;h.api.catalog.find(c=>c.id==='dogEndBoneFlight').apply(p);assert.equal(p.rate,.5);
});

test('relics with unmet prerequisites cannot spawn an empty reward and depleted offers supply a usable fallback',()=>{
 const h=setup('dog'),p=h.api.player;for(const c of h.api.catalog.filter(c=>c.rarity==='relic'&&c.shipOnly==='dog'))if(!['dogRelicMoonCharm','dogRelicSnakeSkin','dogRelicFoxTalisman'].includes(c.id))h.api.game.relics[c.id]=1;
 assert.equal(p.spikeCount,0);assert.equal(p.boltCount,0);assert.equal(p.rocketCd,0);assert.equal(h.api.spawnRelicEnemy(),false);const before=Object.keys(h.api.game.relics).length;const cards=h.api.offerCards('relic');assert.equal(cards.length,3);assert.ok(cards.every(c=>c.isSupply));p.hp=10;cards[0].apply(p);assert.ok(p.hp>10);assert.equal(Object.keys(h.api.game.relics).length,before);
});
test('per-offer recipe indexes preserve direct lookup order and rebuild after attribute sealing',()=>{
 const h=setup('phantom');for(const ship of ['shot','laser','charge','drill','dog','phantom']){h.api.reset(ship);for(const sealed of [false,true]){if(sealed)h.api.game.sealedElements.push('fire');const indexed=h.api.offerRecipeLookups();for(const id of ['hp','barrier','shieldEpic','damage','ph_core','ph_parade','field','seraph','plasma','lPowerLens','dogGoodBoy']){assert.deepEqual(Array.from(indexed.synergies.get(id)||[],r=>r.id),Array.from(h.api.synergiesFor(id),r=>r.id));assert.deepEqual(Array.from(indexed.fusions.get(id)||[],r=>r.id),Array.from(h.api.fusionFor(id),r=>r.id));}}}
});
