import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../v13-ending.js',import.meta.url),'utf8');
const sandbox={};runInNewContext(code,sandbox);
const generate=data=>sandbox.AnkinEnding.create(data);
const base={
 ship:'laser',mode:'normal',seconds:1800,level:44,clearCount:1,
 damage:850000,kills:750,damageStats:{laser:690000,drone:140000,nova:20000},
 hpPercent:63,hits:3,dashCount:6,novaCount:2,revives:0,
 finisherSource:'laser',evolutionNames:['光学進化'],fusionIds:['thunder_wind']
};

test('deterministic personal ending is serialized with title and actual reasons',()=>{
 const x=generate(base),y=generate(structuredClone(base));
 assert.deepEqual(JSON.parse(JSON.stringify(x)),JSON.parse(JSON.stringify(y)));
 assert.equal(x.primarySource,'laser');
 assert.ok(x.title.includes('雷鳴'));
 assert.ok(x.story.includes('THE・END・OF・ANKIN'));
 assert.ok(x.summary.includes('レーザー'));
 assert.ok(x.why.some(v=>v.startsWith('機体：PRISM LANCER')));
 assert.equal(x.metrics.remainingHpPct,63);
 assert.equal(x.metrics.hits,3);
});

test('every frame and directional fusion produces a meaningful distinct title',()=>{
 const E=['fire','ice','thunder','wind','rock'];
 const titles=new Set();
 for(const ship of ['shot','laser','charge','drill'])
  for(const primary of E)
   for(const secondary of E){
    if(primary===secondary)continue;
    const out=generate({...base,ship,fusionIds:[primary+'_'+secondary],hits:4});
    assert.ok(out.title.length>5);
    assert.equal(out.fusionIds[0],primary+'_'+secondary);
    assert.equal(out.frameName,sandbox.AnkinEnding.ships[ship].name);
    titles.add(out.title);
   }
 // Order changes the primary element and should change the title.
 assert.notEqual(generate({...base,fusionIds:['fire_wind']}).title,
  generate({...base,fusionIds:['wind_fire']}).title);
 assert.ok(titles.size>=20);
});

test('battle actions produce different styles and endings on the same ship',()=>{
 const runs=[
  [{hpPercent:8,hits:12,revives:0},'near_death'],
  [{hpPercent:100,hits:0,revives:0},'untouched'],
  [{hpPercent:70,hits:8,revives:1},'revived'],
  [{hpPercent:75,hits:2,dashCount:49,revives:0},'dash'],
  [{hpPercent:75,hits:5,damageStats:{drone:900000},revives:0},'drone'],
  [{hpPercent:75,hits:5,damageStats:{magma:900000},revives:0},'burn'],
  [{hpPercent:75,hits:5,damageStats:{shot:900000},revives:0},'barrage'],
  [{hpPercent:75,hits:5,damageStats:{charge:900000},revives:0},'bombard'],
  [{hpPercent:75,hits:5,damageStats:{nova:900000},novaCount:9,revives:0},'nova']
 ];
 for(const [options,expected] of runs){
  const e=generate({...base,...options});assert.equal(e.styleId,expected,expected);
  assert.ok(e.why.includes('戦闘：'+e.styleName));
 }
});

test('double fusion, endless, and finisher are reflected in narrative',()=>{
 const e=generate({...base,clearCount:2,endless:true,
  fusionIds:['fire_ice','thunder_rock'],finisherSource:'nova',
  evolutionNames:['究極進化'],featuredSkills:['パルス'],relicNames:['反射弾']});
 assert.ok(e.title.includes('双極'));
 assert.ok(e.story.includes('終焉は再び'));
 assert.ok(e.summary.includes('決め手 NOVA'));
 assert.equal(e.fusionIds.length,2);
 assert.equal(e.evolutionNames[0],'究極進化');
});

test('untrusted oversized values are bounded and finite',()=>{
 const e=generate({ship:'invalid',fusionIds:['fire_rock',{},'../../etc'],
  damageStats:{laser:Infinity,other:NaN,arbitrary:1000},
  featuredSkills:Array(60).fill('<img onerror=evil()>'),hpPercent:9999,
  hits:-10,finisherSource:'<script>'});
 assert.equal(e.metrics.remainingHpPct,100);
 assert.equal(e.metrics.hits,0);
 assert.ok(e.featuredSkills.length<=6);
 assert.ok(e.title.length<=88);
 assert.ok(!e.story.includes('NaN'));
});

test('unfused elemental cards change the title; ship always changes the title',()=>{
 const a=generate({...base,ship:'shot',fusionIds:[],elementAffinities:{fire:5,ice:1}});
 const b=generate({...base,ship:'laser',fusionIds:[],elementAffinities:{fire:5,ice:1}});
 const c=generate({...base,ship:'shot',fusionIds:[],elementAffinities:{ice:5,fire:1}});
 assert.ok(a.title.includes('紅蓮'));
 assert.ok(c.title.includes('氷晶'));
 assert.notEqual(a.title,b.title);
 assert.notEqual(a.title,c.title);
 assert.ok(a.summary.includes('属性スキル：炎'));
});
