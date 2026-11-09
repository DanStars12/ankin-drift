import{test}from'node:test';import assert from'node:assert/strict';import{normalRewardValue as value}from'../scripts/balance-reward-value.mjs';
const p={shipType:'shot',dmg:32,rate:.46,multishot:1,crit:0,critMult:1.8,hp:100,maxHp:100,spd:226,dashCd:2.8};
test('normal reward estimate values actual gain above ship label, and capped no-op at zero',()=>{
 assert.equal(value(p,{...p,shipOnly:'shot'}),0);assert(value(p,{...p,dmg:40})>value(p,{...p,tacticFlags:{shotFar:.06}}));assert.equal(value(p,{...p,tacticFlags:{}}),0);
});
test('healing urgency and mobility utility remain valuable; preview inputs stay unchanged',()=>{
 const low={...p,hp:20},after={...low,hp:40,maxHp:120};const before=JSON.stringify(low);assert(value(low,after)>value(p,{...p,hp:120,maxHp:120}));assert(value(p,{...p,spd:250})>0);assert.equal(JSON.stringify(low),before);
});
test('each frame values native offensive growth and conditional normal utility',()=>{
 for(const [ship,stats,upgrade]of [['laser',{laserScale:1,laserCount:2},{laserScale:1.1}],['charge',{chargeScale:1,chargeRate:.67},{chargeRate:.8}],['drill',{drillDamage:65,drillContact:17,drillGain:.31,drillReach:38},{drillDamage:80}],['dog',{dogBonePower:1,dogBones:1,dogBoneReturn:1},{dogBonePower:1.1}]]){
 const a={...p,...stats,shipType:ship};assert(value(a,{...a,...upgrade})>0,ship);
 }
 assert(value(p,{...p,tacticFlags:{chargeBank:1}})>0);
});
