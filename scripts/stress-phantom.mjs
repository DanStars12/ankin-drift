import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {runtimeHarness} from './runtime-vm-harness.mjs';
const h=runtimeHarness(),p=h.api.reset('phantom');h.api.clear();
for(const c of h.api.catalog.filter(c=>c.shipOnly==='phantom'))h.api.acquire(c.id,c.maxStacks||1);
const enemies=Array.from({length:200},(_,i)=>({x:640+Math.cos(i*2.399)*120,y:400+Math.sin(i*2.399)*120,r:12,hp:1e12,maxHp:1e12,spd:50,dmg:5,type:i<3?'major':'drone',dead:false}));
let damage=0,hits=0,elements=0,maxQueue=0,maxVisuals=0,maxDarts=0,maxDartProjectiles=0,maxDartVisuals=0;const start=performance.now();
const world={...h.api.phantomWorld(),width:1280,height:800,candidates:()=>enemies,random:()=>.4,motion:(x,y,nx,ny)=>({x:nx,y:ny,blocked:false}),blocked:()=>false,damage:(e,d,m)=>{assert.ok(Number.isFinite(d)&&d>=0);damage+=d;hits++;},element:(e,d,a)=>{assert.ok(a.primary);elements++;},clear:()=>{},novaDamage:()=>200};
for(let i=0;i<1800*60;i++){
 if(i%(20*60)===0)h.ctx.AnkinPhantom.nova(p,world);
 h.ctx.AnkinPhantom.tick(p,1/60,world);maxQueue=Math.max(maxQueue,p.phantomEchoes.length);maxVisuals=Math.max(maxVisuals,p.phantomVisuals.length);
 maxDarts=Math.max(maxDarts,p.darts.length);maxDartProjectiles=Math.max(maxDartProjectiles,p.dartProjectiles.length);maxDartVisuals=Math.max(maxDartVisuals,p.dartVisuals.length);assert.ok(p.darts.length<=5);assert.equal(new Set(p.darts.map(f=>f.type)).size,p.darts.length);assert.ok(p.dartProjectiles.length<=64);assert.ok(p.dartVisuals.length<=16);
 assert.equal(p.phantoms.length,3);assert.ok(p.phantomEchoes.length<=24);assert.ok(p.phantomVisuals.length<=24);
}
const result={kind:'synthetic-engine-only',gameSeconds:1800,enemyCount:200,bossCount:3,phantoms:p.phantoms.length,phantomLevel:p.phantomLevel,evolutions:Object.keys(h.api.game.fusions),hits,damage,primaryElementCallbacks:elements,maxQueue,maxVisuals,maxDarts,maxDartProjectiles,maxDartVisuals,hostLogicMs:performance.now()-start,rendered:false,fps:null};
mkdirSync('docs/qa',{recursive:true});writeFileSync('docs/qa/phantom-darts-engine-stress.json',JSON.stringify(result,null,2)+'\n');console.log(result);
