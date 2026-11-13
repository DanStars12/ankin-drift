import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogHarness} from '../scripts/catalog-harness.mjs';
const kinds=['common','uncommon','rare','epic'];
test('shipped catalog has 510 unique, named, tagged definitions and 99 distinct DOG cards',()=>{
 const {ctx}=catalogHarness(),cards=ctx.catalog;
 assert.equal(cards.length,510);assert.equal(new Set(cards.map(c=>c.id)).size,510);
 for(const c of cards){assert.ok(c.tags.length,c.id);assert.equal(new Set(c.tags).size,c.tags.length,c.id);assert.ok(c.desc.trim().length);assert.ok(c.desc.length<=70,c.id);}
 const dog=cards.filter(c=>c.shipOnly==='dog');assert.equal(dog.length,99);assert.equal(new Set(dog.map(c=>c.name)).size,99);
});
test('every new one-off is excluded after acquisition in its actual reward bucket',()=>{
 const h=catalogHarness();
 for(const c of h.ctx.catalog.filter(c=>c.arsenal)){
  h.ctx.selectedShip=c.shipOnly||'shot';h.eval('player=initialP();game.skills={};game.powers={};game.legends={};game.uniques={};game.relics={};');
  if(c.requires)h.ctx.player[c.requires]=1;
  const bucket=kinds.includes(c.rarity)?'skills':({power:'powers',legendary:'legends',unique:'uniques',relic:'relics'})[c.rarity];
  h.ctx.game[bucket][c.id]=1;
  assert.equal(h.eval(`skillHasRoom(catalog.find(c=>c.id==='${c.id}'))`),false,c.id);
 }
});
test('ordinary stack limits stop new offers but do not destroy previously acquired stacks',()=>{
 const h=catalogHarness();h.eval('player=initialP()');
 for(const id of ['life','critEpic','superDash']){
  const c=h.ctx.catalog.find(c=>c.id===id);assert.equal(c.maxStacks,3);
  h.ctx.game.skills[id]=2;assert.equal(h.eval(`skillHasRoom(catalog.find(c=>c.id==='${id}'))`),true);
  h.ctx.game.skills[id]=3;assert.equal(h.eval(`skillHasRoom(catalog.find(c=>c.id==='${id}'))`),false);
  h.ctx.game.skills[id]=5;const before=h.ctx.player[id==='life'?'lifeSteal':id==='critEpic'?'critMult':'spd'];
  c.apply(h.ctx.player);assert.ok(h.ctx.player[id==='life'?'lifeSteal':id==='critEpic'?'critMult':'spd']>before);
 }
 assert.equal(h.ctx.catalog.find(c=>c.id==='expShield').stackable,false);
});
test('new recipes have real, matching machine materials and no accidental elemental authorization',()=>{
 const {ctx}=catalogHarness();const recipes=ctx.recipes.filter(r=>r.id.startsWith('arsFusion'));assert.equal(recipes.length,5);
 for(const r of recipes)for(const id of [r.power,r.legend]){
  const c=ctx.catalog.find(c=>c.id===id);assert.ok(c,id);assert.equal(c.shipOnly,r.shipOnly);assert.ok(c.tags.includes('進化合成素材'));
 }
 for(const c of ctx.catalog.filter(c=>c.arsenal))assert.ok(!c.tags.some(t=>t.startsWith('属性：')),c.id);
});
test('description corrections remove invented effects while preserving attribute permissions',()=>{
 const {ctx}=catalogHarness(),by=id=>ctx.catalog.find(c=>c.id===id);
 assert.ok(!by('thermal').desc.includes('爆発範囲'));assert.ok(!by('thermal').tags.includes('爆発'));
 assert.ok(!by('rain').tags.includes('マグマ床'));assert.ok(by('rain').tags.includes('属性：炎'));
 assert.ok(!by('freeze').tags.includes('スロウ'));assert.ok(by('freeze').tags.includes('属性：氷'));
});
test('new support choices trade strengths with legacy peers instead of being strictly inferior',()=>{
 const h=catalogHarness();
 const delta=id=>{const p=h.eval('initialP()'),before={...p};h.ctx.catalog.find(c=>c.id===id).apply(p);return Object.fromEntries(Object.entries(p).filter(([k,v])=>typeof v==='number'&&Number.isFinite(v)).map(([k,v])=>[k,v-before[k]]));};
 const hull=delta('arsPlating'),armor=delta('armor');assert.ok(hull.maxHp>armor.maxHp);assert.ok(hull.shieldMax<armor.shieldMax);
 const shield=delta('arsShieldSeal'),barrier=delta('barrier');assert.ok(shield.shieldMax<barrier.shieldMax);assert.ok(shield.shieldRecharge>barrier.shieldRecharge);
 const nova=delta('arsNovaLens'),radius=delta('radius');assert.ok(nova.novaDamage>radius.novaDamage);assert.ok(nova.novaRadius<radius.novaRadius);
 const laser=delta('arsLaserCoating'),cooling=delta('lCooling');assert.ok(laser.laserScale<cooling.laserScale);assert.ok(laser.shieldMax>cooling.shieldMax);
});
test('core build choices remain available beside one-off stat cards, including depleted reward pools',()=>{
 const h=catalogHarness();h.ctx.cards=[{id:'coreA'},{id:'newA',arsenal:true},{id:'coreB'},{id:'newB',arsenal:true}];
 h.ctx.options=[];assert.equal(h.eval('offerCandidatePool(cards,options)').length,4);
 h.ctx.options=[{id:'newC',arsenal:true}];
 assert.deepEqual(Array.from(h.eval('offerCandidatePool(cards,options)'),c=>c.id),['coreA','coreB']);
 h.ctx.cards=h.ctx.cards.filter(c=>c.arsenal);
 assert.equal(h.eval('offerCandidatePool(cards,options)').length,2,'unclaimed new rewards must not be replaced by supplies');
 h.ctx.cards=[];assert.equal(h.eval('offerCandidatePool(cards,options)').length,0);
});
test('legacy movement upgrades preserve a stronger DRILL cooldown and retain their other benefit',()=>{
 const h=catalogHarness(),p=h.eval('initialP()');p.dashCd=.52;const before=p.spd;
 for(const id of ['dash','superDash']){h.ctx.catalog.find(c=>c.id===id).apply(p);assert.equal(p.dashCd,.52,id);}
 assert.ok(p.spd>before,'the movement-speed bonus still applies');
});
