import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runtimeHarness} from '../scripts/runtime-vm-harness.mjs';
function setup(){const h=runtimeHarness();h.api.reset('phantom');h.api.stopSpawns();h.api.clear();return h;}
const typed={ph_prism:'shot',ph_helix:'laser',ph_rail:'charge',ph_phoenixDarts:'support',ph_courier:'follow'};

test('each typed UNIQUE unlocks its promised dart even as the first dart skill',()=>{
 for(const [id,type] of Object.entries(typed)){const h=setup();assert.ok(h.api.selectable(h.api.catalog).some(c=>c.id===id));h.api.acquire(id);assert.deepEqual(Array.from(h.api.player.dartTypes),[type]);assert.ok(!h.api.selectable(h.api.catalog).some(c=>c.id===id));}
});
test('UNIQUE bonus slots guarantee all promised types above twelve normal darts and survive rebuilding',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_darts',5);h.api.acquire('ph_dartLimit',5);h.api.acquire('ph_armada');assert.equal(p.dartTypes.length,12);
 for(const [id,type] of Object.entries(typed)){const before=p.dartTypes.filter(t=>t===type).length;h.api.acquire(id);assert.equal(p.dartTypes.filter(t=>t===type).length,before+1);}
 const counts=Object.fromEntries(['shot','laser','charge','support','follow'].map(t=>[t,p.dartTypes.filter(x=>x===t).length]));h.api.acquire('ph_sovereign');for(const type of Object.keys(counts))assert.equal(p.dartTypes.filter(t=>t===type).length,counts[type]+1);
 assert.equal(p.dartTypes.length,22);assert.equal(h.ctx.AnkinPhantom.dartCapacity(p),22);assert.equal(h.ctx.AnkinPhantom.addDart(p),false);
 h.ctx.AnkinPhantom.tick(p,.01,h.api.phantomWorld());assert.equal(p.darts.length,22);const types=Array.from(p.dartTypes);p.ghostBlade.cooldown=.37;p.phantomExecutionClock=.29;h.api.restorePlayerBuild();h.api.restorePlayerBuild();assert.deepEqual(Array.from(h.api.player.dartTypes),types);assert.equal(h.api.player.ghostBlade.cooldown,.37);assert.equal(h.api.player.phantomExecutionClock,.29);assert.equal(h.api.player.darts.length,22);
});
test('ordinary dart acquisitions prioritize missing types after a duplicate-specific UNIQUE',()=>{
 const h=setup();h.api.acquire('ph_prism');h.api.acquire('ph_darts',5);assert.equal(h.api.player.dartTypes.length,6);assert.equal(new Set(h.api.player.dartTypes).size,5);
});
test('ASTRAL BLADE attacks from the ghost at 70%, grows to 110% at level ten and never duplicates elements',()=>{
 const h=setup(),p=h.api.player;Object.assign(p.phantoms[0],{x:30,y:30});h.api.enemy('drone',{x:p.x+40,y:p.y,hp:1e9,maxHp:1e9,spd:0});const w=h.api.phantomWorld(),hits=[];let elements=0;w.damage=(e,d,m)=>hits.push({d,m});w.element=()=>elements++;
 h.ctx.AnkinPhantom.tick(p,.01,w);assert.ok(!hits.some(x=>x.m.source==='phantomGhost'));h.api.acquire('ph_astralCore');h.ctx.AnkinPhantom.tick(p,.01,w);const hit=hits.find(x=>x.m.source==='phantomGhost');assert.ok(hit);assert.equal(hit.d,h.ctx.AnkinPhantom.stats(p).damage*.7);assert.deepEqual({...hit.m.origin},{x:p.x,y:p.y});assert.equal(elements,0);assert.equal(p.phantoms.length,1);
 h.ctx.AnkinPhantom.level(p,9);p.ghostBlade.cooldown=0;h.ctx.AnkinPhantom.tick(p,.01,w);assert.equal(hits.filter(x=>x.m.source==='phantomGhost').at(-1).d,h.ctx.AnkinPhantom.stats(p).damage*1.1);
 const before=hits.length;p.ghostBlade.cooldown=0;w.blocked=()=>true;h.ctx.AnkinPhantom.tick(p,.01,w);assert.equal(hits.length,before);assert.ok(p.phantomVisuals.some(v=>v.ghost));
});
test('GHOST blade respects final boss module protection before attacking the core',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_astralCore');h.api.spawnUltimateBoss();const core=h.api.enemies.find(e=>e.type==='ultimate');p.x=core.x;p.y=core.y;const hp=core.hp;for(let i=0;i<120;i++)h.ctx.AnkinPhantom.tick(p,1/60,h.api.phantomWorld());assert.equal(core.hp,hp);assert.ok(h.api.game.damageStats.phantomGhost>0);
});
test('ghost oath chain resets when switching targets and does not inherit a remote phantom chain',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_astralCore');h.api.acquire('ph_oath');Object.assign(p.phantoms[0],{x:20,y:20,chain:20});const first=h.api.enemy('drone',{x:p.x+30,y:p.y,hp:1e9,maxHp:1e9,spd:0});const second=h.api.enemy('drone',{x:p.x+50,y:p.y,hp:1e9,maxHp:1e9,spd:0});const w=h.api.phantomWorld(),hits=[];w.damage=(e,d,m)=>{if(m.source==='phantomGhost')hits.push({e,d});};for(let i=0;i<3;i++){p.ghostBlade.cooldown=0;h.ctx.AnkinPhantom.tick(p,.01,w);}assert.equal(p.ghostBlade.chain,3);assert.ok(hits[2].d>hits[0].d);first.dead=true;p.ghostBlade.cooldown=0;h.ctx.AnkinPhantom.tick(p,.01,w);assert.equal(hits.at(-1).e,second);assert.equal(hits.at(-1).d,hits[0].d);assert.equal(p.ghostBlade.chain,1);
});
test('HELIX really hits three visible targets beyond base laser reach, and walls still block it',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_helix');h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());const f=p.darts[0];for(let i=0;i<3;i++)h.api.enemy('drone',{x:f.x+110,y:f.y+i*4,hp:1e9,maxHp:1e9,spd:0});const w=h.api.phantomWorld(),hits=[];w.damage=(e,d)=>hits.push({e,d});h.ctx.AnkinPhantom.tickDarts(p,.01,w);assert.equal(new Set(hits.map(x=>x.e)).size,3);assert.equal(p.dartVisuals.length,3);f.cooldown=0;w.blocked=()=>true;h.ctx.AnkinPhantom.tickDarts(p,.01,w);assert.equal(hits.length,3);
});
test('RAIL and NEEDLE combine into nine finite piercing projectiles without recursive volleys',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_rail');h.api.acquire('ph_needle');h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());const f=p.darts[0];h.api.enemy('drone',{x:f.x+160,y:f.y,hp:1e9,maxHp:1e9,spd:0});f.charge=1;h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());assert.equal(p.dartProjectiles.length,9);assert.equal(p.dartProjectiles.filter(b=>b.delay>0).length,6);assert.ok(p.dartProjectiles.every(b=>b.charged&&Number.isFinite(b.damage)));assert.equal(new Set(p.dartProjectiles.map(b=>Math.round(Math.atan2(b.vy,b.vx)*100))).size,3);
});
test('MIRROR projectiles really pierce two targets and disappear on the third without repeat hits',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_prism');h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());for(const f of p.darts)f.cooldown=99;const targets=[110,125,140].map(x=>h.api.enemy('drone',{x,y:200,r:2,hp:1e9,maxHp:1e9,spd:0}));p.dartProjectiles=[{x:100,y:200,vx:470,vy:0,life:1,charged:false,damage:20,pierce:2,bounces:2,hit:new Set()}];const w=h.api.phantomWorld(),hits=[];w.damage=(e)=>hits.push(e);h.ctx.AnkinPhantom.tickDarts(p,.1,w);assert.equal(hits.length,3);assert.equal(new Set(hits).size,3);assert.ok(targets.every(e=>hits.includes(e)));assert.equal(p.dartProjectiles.length,0);h.ctx.AnkinPhantom.tickDarts(p,.1,w);assert.equal(hits.length,3);
});
test('AFTERIMAGE and ZENITH add two distinct attacks each after three swings and never recurse',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_afterimage');h.api.acquire('ph_zenith');const f=p.phantoms[0];h.api.enemy('drone',{x:f.x+30,y:f.y,hp:1e9,maxHp:1e9,spd:0});const w=h.api.phantomWorld(),hits=[];w.damage=(e,d,m)=>hits.push(m.attackType);for(let i=0;i<3;i++){f.cooldown=0;h.ctx.AnkinPhantom.tick(p,.01,w);}assert.equal(p.phantomEchoes.length,4);h.ctx.AnkinPhantom.tick(p,.25,w);assert.equal(hits.filter(t=>t==='echo').length,2);assert.equal(hits.filter(t=>t==='zenith').length,2);assert.equal(p.phantomEchoes.length,0);assert.equal(f.chain,3);assert.ok(p.phantomVisuals.some(v=>v.zenith));
});
test('PHOENIX support rebuilds its doubled barrier in two combat seconds and clears nearby bullets',()=>{
 const h=setup(),p=h.api.player,base=h.ctx.AnkinPhantom.barrierMax(p);h.api.acquire('ph_phoenixDarts');const w=h.api.phantomWorld();h.ctx.AnkinPhantom.tickDarts(p,.01,w);const f=p.darts[0];assert.equal(h.ctx.AnkinPhantom.barrierMax(p),base*2);h.ctx.AnkinPhantom.intercept(p,{x:f.x,y:f.y,r:3,damage:1e9,ttl:1},f.x,f.y,()=>0);assert.equal(f.barrierRecover,2);let clears=0;w.clear=(x,y,r)=>{clears++;assert.equal(r,120);};for(let i=0;i<119;i++)h.ctx.AnkinPhantom.tickDarts(p,1/60,w);assert.equal(f.barrier,0);for(let i=0;i<2;i++)h.ctx.AnkinPhantom.tickDarts(p,1/60,w);assert.equal(f.barrier,h.ctx.AnkinPhantom.barrierMax(p));assert.equal(clears,1);
});
test('COURIER plus HARVEST multiplies real ghost XP once and never attracts healing items',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_courier');h.api.acquire('ph_harvest');p.xpBonus=2;h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());const f=p.darts[0];h.api.orb(p.x+300,p.y,5,7);h.api.orb(p.x+300,p.y,0,0,true);const xp=h.api.pickups.find(e=>e.type==='energy'),heal=h.api.pickups.find(e=>e.type==='heal');Object.assign(f,{x:xp.x,y:xp.y});h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());assert.ok(Math.abs(h.api.game.xp-19)<1e-9);assert.ok(!heal.collected);h.ctx.AnkinPhantom.tickDarts(p,.01,h.api.phantomWorld());assert.ok(Math.abs(h.api.game.xp-19)<1e-9);
});
test('execution waves stay bounded, cannot recursively execute, and relics are never synthesis materials',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('ph_execution');h.api.acquire('ph_afterimage');const f=p.phantoms[0];for(let i=0;i<12;i++)h.api.enemy('drone',{x:f.x+30+i,y:f.y,hp:1,maxHp:100,spd:0});h.ctx.AnkinPhantom.tick(p,.01,h.api.phantomWorld());assert.equal(p.phantomVisuals.filter(v=>v.type==='pulse').length,1);assert.ok(p.phantomExecutionClock>0);assert.ok(p.phantomVisuals.length<=24);const relics=h.api.catalog.filter(c=>c.rarity==='relic'&&c.shipOnly==='phantom');assert.equal(relics.length,10);for(const c of relics){assert.ok(!c.tags.includes('進化合成素材'));assert.ok(!h.api.recipes.some(r=>[r.power,r.legend,...(r.required||[])].includes(c.id)));}
});
test('v15 title, manifest, cache and PHANTOM tag text share the same release and skill rules',()=>{
 const h=setup(),html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.match(html,/<title>ANKIN DRIFT v15\.0/);assert.match(JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8')).name,/v15\.0/);assert.match(sw,/mobile-v15-0/);const detail=h.api.attrDetails('ブレード');assert.match(detail.desc,/三角刃/);assert.ok(!detail.desc.includes('旋回'));assert.match(h.api.attrDetails('ファントムダーツ').details.join(' ') ,/専用枠/);for(const id of Object.keys(typed)){const c=h.api.catalog.find(c=>c.id===id);assert.ok(c.desc.includes('取得時'));assert.ok(c.desc.includes('+1'));}
});
test('shared NOVA unique wording preserves the real PHANTOM radius cap instead of promising full-screen clearing',()=>{
 const h=setup(),p=h.api.player;h.api.acquire('unboundNova');const c=h.api.catalog.find(c=>c.id==='unboundNova');assert.ok(!c.desc.includes('全画面'));assert.match(c.desc,/上限/);let radius=0;const w=h.api.phantomWorld();w.clear=(x,y,r)=>{radius=r;};h.ctx.AnkinPhantom.nova(p,w);assert.equal(radius,480);
});
