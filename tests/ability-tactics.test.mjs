import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideAbilityUse} from '../scripts/balance-ability-tactics.mjs';

const base={
 ship:'shot',hpRatio:1,energy:100,novaCooldown:0,dashLeft:0,dashTime:0,iframes:0,
 targetDist:450,bossDist:Infinity,novaRadius:215,laserReach:730,drillOverdrive:0,
 drillPlasmaRatio:0,enemiesInNova:0,enemiesNear:0,enemiesForward:0,
 threats:0,imminent:0,safeApproach:true
};
const decide=extra=>decideAbilityUse({...base,...extra});
test('do not burn shot NOVA simply because boss exists beyond its radius',()=>{
 assert.equal(decide({bossDist:500}).novaReason,null);
 assert.equal(decide({bossDist:180}).novaReason,'boss-in-radius');
 assert.equal(decide({enemiesInNova:3}).novaReason,'crowd-in-radius');
});
test('laser uses overdrive when a boss is reachable, not outside beam range',()=>{
 assert.equal(decide({ship:'laser',bossDist:900}).novaReason,null);
 assert.equal(decide({ship:'laser',bossDist:420}).novaReason,'boss-overdrive');
});
test('charge requires aligned enemies, boss or projectile emergency',()=>{
 assert.equal(decide({ship:'charge',bossDist:1000,enemiesForward:0}).novaReason,null);
 assert.equal(decide({ship:'charge',enemiesForward:3}).novaReason,'comet-volley');
 assert.equal(decide({ship:'charge',imminent:2}).novaReason,'projectile-clear');
});
test('drill reserves overdrive and expends plasma only on worthwhile approach',()=>{
 assert.equal(decide({ship:'drill',bossDist:280}).novaReason,'boss-overdrive');
 assert.equal(decide({ship:'drill',bossDist:280,drillOverdrive:2}).novaReason,null);
 assert.equal(decide({ship:'drill',targetDist:125,drillPlasmaRatio:.6}).dashReason,'plasma-strike');
 assert.equal(decide({ship:'drill',targetDist:125,drillPlasmaRatio:.6,safeApproach:false}).dashReason,'plasma-strike');
 assert.equal(decide({ship:'drill',targetDist:60,drillOverdrive:3}).dashReason,'plasma-strike');
});
test('dog radial nova is reserved for nearby targets',()=>{
 assert.equal(decide({ship:'dog',bossDist:900,enemiesNear:1}).novaReason,null);
 assert.equal(decide({ship:'dog',bossDist:220}).novaReason,'boss-bow-shock');
 assert.equal(decide({ship:'dog',enemiesNear:4}).novaReason,'radial-bow-shock');
 assert.equal(decide({ship:'dog',enemiesNear:2}).novaReason,'radial-bow-shock');
 assert.equal(decide({ship:'dog',enemiesNear:1,novaHeldSeconds:6}).novaReason,'held-bow-shock');
});
test('emergency dash protects when projectile imminent, but never while invulnerable/on cooldown',()=>{
 assert.equal(decide({imminent:1}).dashReason,'emergency-evade');
 assert.equal(decide({imminent:1,iframes:.25}).dashReason,null);
 assert.equal(decide({imminent:1,dashLeft:1}).dashReason,null);
 assert.equal(decide({imminent:1,dashTime:.1}).dashReason,null);
});
test('NOVA must be charged and off cooldown, never force a special attack',()=>{
 assert.equal(decide({bossDist:100,energy:99}).novaReason,null);
 assert.equal(decide({bossDist:100,novaCooldown:3}).novaReason,null);
});

test('v13.33 recovery: avoid the severe drill DPS regression from holding its attack dash',()=>{
 assert.equal(decide({ship:'drill',targetDist:80,drillPlasmaRatio:.45}).dashReason,'plasma-strike');
 assert.equal(decide({ship:'drill',targetDist:60,drillOverdrive:3,iframes:.5}).dashReason,'plasma-strike');
 assert.equal(decide({ship:'drill',targetDist:160,drillPlasmaRatio:.2}).dashReason,null);
});
test('v13.33 recovery: threats trigger preemptive dash instead of waiting until impact',()=>{
 for(const ship of ['laser','drill','dog'])
  assert.equal(decide({ship,threats:1,imminent:0,hpRatio:1}).dashReason,'emergency-evade');
 for(const ship of ['shot','charge']){
  assert.equal(decide({ship,threats:1,imminent:0,hpRatio:1}).dashReason,null);
  assert.equal(decide({ship,threats:1,imminent:1,hpRatio:1}).dashReason,'emergency-evade');
 }
});
