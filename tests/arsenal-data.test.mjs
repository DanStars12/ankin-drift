import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};runInNewContext(readFileSync(new URL('../skill-arsenal.js',import.meta.url),'utf8'),ctx);
const api=ctx.AnkinArsenal;
function pilot(){return {hp:100,maxHp:100,shield:0,shieldMax:0,dmg:32,crit:0,critMult:1.8,rate:.46,limitRate:.055,
 multishot:1,limitShot:16,droneCount:0,limitDrones:16,laserCount:1,laserLimit:12,laserScale:1,laserReach:730,
 chargeScale:1,chargeRate:.67,dashCd:2.8,dogBones:1,dogBonePower:1,dogBoneReturn:1,dogBoneSpeed:380,dogEggDamage:35,dogEggRate:2.4,drillDashSpeed:760,drillWidth:29,drillReach:38,drillCap:1,drillGain:.31,novaGain:1};}
test('59 distinct bounded one-off cards span every reward pool and all five ships',()=>{
 assert.equal(api.cards.length,59);assert.equal(new Set(api.cards.map(c=>c.id)).size,59);
 const counts={};for(const c of api.cards){counts[c.rarity]=(counts[c.rarity]||0)+1;assert.equal(c.stackable,false);assert.ok(c.tags.length>=2);assert.ok(c.tags.includes('一度限り'));assert.ok(c.desc.length<=64);assert.ok(!/以前|今回|実装|テスト|デバッグ|確認|取得済み/.test(c.desc));assert.ok(c.effects.length>0);}
 assert.deepEqual(counts,{common:9,uncommon:9,rare:2,power:12,legendary:12,relic:10,unique:5});
 for(const ship of ['shot','laser','charge','drill','dog'])for(const rarity of ['power','legendary','relic','unique'])assert.ok(api.cards.some(c=>c.shipOnly===ship&&c.rarity===rarity));
});
test('all declared effects are finite and preserve health, shield and attack-count caps',()=>{
 for(const c of api.cards){const p=pilot();api.apply(p,c.id);for(const [stat] of c.effects)assert.ok(Number.isFinite(p[stat]),c.id+':'+stat);assert.ok(p.hp<=p.maxHp);assert.ok(p.shield<=p.shieldMax);assert.ok(p.multishot<=p.limitShot);assert.ok(p.laserCount<=p.laserLimit);assert.ok(p.dogBones<=8);}
});
test('normal rewards are small, cannot add attackers, revives, global multipliers or lifesteal',()=>{
 const normal=api.cards.filter(c=>['common','uncommon','rare','epic'].includes(c.rarity));assert.equal(normal.length,20);
 for(const c of normal)for(const [stat,op,v] of c.effects){
  assert.ok(!['multishot','laserCount','dogBones','dogChicks','phoenix','lifeSteal','bossBane','fusionOutputBonus'].includes(stat));
  if(op==='mul')assert.ok(v>=.95&&v<=1.05);
  if(stat==='dmg')assert.ok(v<=4);if(stat==='crit')assert.ok(v<=.03);if(stat==='regen')assert.ok(v<=.4);
 }
});
test('caps and prerequisites block empty or unavailable upgrades, including egg-only cards',()=>{
 const p=pilot();assert.equal(api.available(p,'arsDogLunch'),false);p.dogChicks=1;assert.equal(api.available(p,'arsDogLunch'),true);
 p.crit=.969;p.critMult=1.8;assert.equal(api.available(p,'arsCriticalMap'),true);
 p.limitShot=16;p.multishot=16;api.apply(p,'arsUniqueShot');assert.equal(p.multishot,16);
 p.dogEggRate=.58;api.apply(p,'arsRelicDogRapidEgg');assert.equal(p.dogEggRate,.58);
 assert.throws(()=>api.apply(p,'missing'));
});
test('relics specify a real drawback rather than an uncapped free damage emitter',()=>{
 for(const c of api.cards.filter(c=>c.rarity==='relic'))assert.ok(c.effects.some(([k,op,v])=>op==='mul'?v<1||k==='rate'&&v>1:v<0),c.id);
});
