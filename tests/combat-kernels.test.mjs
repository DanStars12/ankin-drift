import {test} from 'node:test';import assert from 'node:assert/strict';
import {combatKernelHarness} from '../scripts/combat-kernel-harness.mjs';
const h=combatKernelHarness(),cell=112;let seed=947;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function expectedCells(enemies,ax,bx,ay,by){return enemies.filter(e=>!e.dead&&Math.floor(e.x/cell)>=ax&&Math.floor(e.x/cell)<=bx&&Math.floor(e.y/cell)>=ay&&Math.floor(e.y/cell)<=by).sort((a,b)=>Math.floor(a.x/cell)-Math.floor(b.x/cell)||Math.floor(a.y/cell)-Math.floor(b.y/cell)||a.id-b.id).map(e=>e.id);}
test('broad-phase queries retain cell traversal and insertion order across negative coordinates and large radii',()=>{
 const enemies=Array.from({length:350},(_,id)=>({id,x:rand()*1800-300,y:rand()*1400-300,r:rand()*100,dead:rand()<.1}));h.ctx.enemies=enemies;h.eval('refreshEnemyIndex()');const max=Math.max(...enemies.filter(e=>!e.dead).map(e=>e.r));
 for(let i=0;i<400;i++){const x=rand()*1800-300,y=rand()*1400-300,r=rand()*700,pad=r+max,x2=rand()*1800-300,y2=rand()*1400-300;Object.assign(h.ctx,{x,y,r,x2,y2});
  const circles=Array.from(h.eval('circleCandidates(x,y,r)'),e=>e.id),segments=Array.from(h.eval('segmentCandidates(x,y,x2,y2,r)'),e=>e.id);
  assert.deepEqual(circles,expectedCells(enemies,Math.floor((x-pad)/cell),Math.floor((x+pad)/cell),Math.floor((y-pad)/cell),Math.floor((y+pad)/cell)));
  assert.deepEqual(segments,expectedCells(enemies,Math.floor((Math.min(x,x2)-pad)/cell),Math.floor((Math.max(x,x2)+pad)/cell),Math.floor((Math.min(y,y2)-pad)/cell),Math.floor((Math.max(y,y2)+pad)/cell)));
 }
});
test('nearest queries match brute-force distances with visibility, exclusions, finite radii and empty visible targets',()=>{
 h.ctx.enemies=Array.from({length:180},(_,id)=>({id,x:rand()*1300-10,y:rand()*850-20,r:10,dead:rand()<.1,isoWarp:rand()<.1,isoSafe:rand()<.1?1:0}));h.eval('refreshEnemyIndex()');
 for(let i=0;i<700;i++){const x=rand()*1280,y=rand()*800,r=i%3?rand()*900:Infinity,visible=!!(i%2),except=h.ctx.enemies[i%180];Object.assign(h.ctx,{x,y,r,visible,except});
  const valid=h.ctx.enemies.filter(e=>!e.dead&&e!==except&&(!visible||(e.x>=10&&e.x<=1270&&e.y>=10&&e.y<=790&&!e.isoWarp&&!e.isoSafe))).map(e=>({...e,d:(e.x-x)**2+(e.y-y)**2})).filter(e=>e.d<r*r).sort((a,b)=>a.d-b.d);
  assert.equal(h.eval('nearTarget(x,y,except,r,visible)')?.id,valid[0]?.id);
 }
 h.ctx.enemies=[{id:1,x:-50,y:20,r:10}];h.eval('refreshEnemyIndex()');assert.equal(h.eval('nearTarget(300,300,null,Infinity,true)'),null);
});
test('equal-distance targets, dead/moved entries, pruning, fallback and boss-part priority preserve behavior',()=>{
 const left={id:1,x:-56,y:56,r:10},right={id:2,x:168,y:56,r:10};h.ctx.enemies=[right,left];h.eval('refreshEnemyIndex()');assert.equal(h.eval('nearTarget(56,56)')?.id,1);assert.equal(h.eval('nearTarget(56,56,null,112)'),null);
 h.ctx.enemies=[];h.eval('refreshEnemyIndex();trimEnemyIndex()');assert.equal(h.eval('enemyIndex.size'),0);
 h.ctx.enemies=[left];h.eval('enemyIndexReady=false');assert.equal(h.eval('circleCandidates(0,0,1)'),h.ctx.enemies);h.eval('refreshEnemyIndex()');left.dead=true;assert.equal(h.eval('nearTarget(0,0)'),null);
 left.dead=false;left.x=800;h.eval('refreshEnemyIndex();trimEnemyIndex()');assert.equal(h.eval('circleCandidates(0,0,1).length'),0);assert.equal(h.eval('nearTarget(800,56)')?.id,1);
 h.ctx.boss={type:'ultimate'};h.ctx.game.ultimateParts=[{id:9,x:900,y:400,r:20}];assert.equal(h.eval('nearTarget(800,400)')?.id,9);h.ctx.boss=null;
});
test('barrier intersection handles crossings, tangencies, parallel/zero-length motion, padding and earliest wall',()=>{
 h.ctx.game.raid={effects:['engage'],engageWalls:[{x:10,y:10,w:20,h:20},{x:50,y:10,w:20,h:20}]};
 const cases=[[0,20,100,20,0,.1],[100,20,0,20,0,.3],[0,0,100,0,0,null],[0,10,100,10,0,.1],[20,20,20,20,0,0],[0,0,0,0,0,null],[0,5,100,5,5,.05],[0,20,1,20,0,null]];
 for(const [x,y,x2,y2,pad,expected]of cases){Object.assign(h.ctx,{x,y,x2,y2,pad});assert.equal(h.eval('engageImpact(x,y,x2,y2,pad)'),expected);}
 h.ctx.game.raid=null;assert.equal(h.eval('engageImpact(0,20,100,20)'),null);assert.equal(h.eval('activeEngageWalls()===activeEngageWalls()'),true);
});
