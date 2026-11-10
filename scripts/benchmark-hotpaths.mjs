import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {combatKernelHarness} from './combat-kernel-harness.mjs';
if(!process.argv[2])throw Error('Usage: node scripts/benchmark-hotpaths.mjs baseline/index.html');
const before=combatKernelHarness(readFileSync(process.argv[2],'utf8')),after=combatKernelHarness();
let seed=947;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const enemies=Array.from({length:350},(_,id)=>({id,x:random()*1500-100,y:random()*1000-100,r:10+random()*70,dead:random()<.05}));
const queries=Array.from({length:1200},()=>({x:random()*1500-100,y:random()*1000-100,x2:random()*1500-100,y2:random()*1000-100,r:random()*400}));
const walls=[{x:150,y:120,w:180,h:90},{x:600,y:240,w:100,h:250},{x:950,y:80,w:140,h:180}];
for(const h of [before,after]){h.ctx.enemies=structuredClone(enemies);h.ctx.queries=queries;h.ctx.clock=()=>performance.now();h.ctx.game.raid={effects:['engage'],engageWalls:walls};h.eval('refreshEnemyIndex()');}
// Differential test uses the two actual shipped implementations, not an approximate physics model.
for(let i=0;i<1200;i++){
 const q=queries[i];for(const h of [before,after])h.ctx.q=q;
 for(const code of ['circleCandidates(q.x,q.y,q.r).map(e=>e.id)','segmentCandidates(q.x,q.y,q.x2,q.y2,q.r).map(e=>e.id)','nearTarget(q.x,q.y,null,q.r,true)?.id','engageImpact(q.x,q.y,q.x2,q.y2,q.r*.05)']){
  assert.deepEqual(JSON.parse(JSON.stringify(before.eval(code))??'null'),JSON.parse(JSON.stringify(after.eval(code))??'null'),code+' #'+i);
 }
}
const metrics=[
 ['index-refresh',2000,'refreshEnemyIndex();checksum+=enemyMaxRadius;'],
 ['circle-query',10000,'checksum+=circleCandidates(q.x,q.y,q.r).length;'],
 ['segment-query',10000,'checksum+=segmentCandidates(q.x,q.y,q.x2,q.y2,5).length;'],
 ['nearest-visible',5000,'checksum+=(nearTarget(q.x,q.y,null,Infinity,true)?.id||0);'],
 ['barrier-intersection',100000,'checksum+=engageImpact(q.x,q.y,q.x2,q.y2,3)??1;'],
 ['nearest-empty-visible',1000,'checksum+=(nearTarget(q.x,q.y,null,Infinity,true)?.id||0);']
];
function run(h,count,operation){h.ctx.count=count;return h.eval(`(()=>{let checksum=0;const start=clock();for(let i=0;i<count;i++){const q=queries[i%queries.length];${operation}}return {ms:clock()-start,checksum};})()`);}
const results=[];
for(const [name,count,code]of metrics){
 if(name==='nearest-empty-visible')for(const h of [before,after])h.eval('for(const e of enemies)e.isoWarp=true;');
 for(let warm=0;warm<2;warm++){run(before,count,code);run(after,count,code);}
 const base=[],candidate=[];
 for(let i=0;i<5;i++){const order=i%2?[after,before]:[before,after],r=order.map(h=>run(h,count,code));const a=r[order.indexOf(before)],b=r[order.indexOf(after)];assert.equal(a.checksum,b.checksum,name);base.push(a.ms);candidate.push(b.ms);}
 const median=a=>[...a].sort((a,b)=>a-b)[2],baseMedian=median(base),candidateMedian=median(candidate);
 results.push({name,count,baselineMs:base,candidateMs:candidate,baselineMedianMs:baseMedian,candidateMedianMs:candidateMedian,ratio:candidateMedian/baseMedian});
}
mkdirSync('artifacts/hotpaths',{recursive:true});writeFileSync('artifacts/hotpaths/kernels.json',JSON.stringify({differentialQueries:4800,results},null,2));
console.log('HOTPATH_BENCHMARK='+JSON.stringify(results.map(r=>({name:r.name,baselineMs:+r.baselineMedianMs.toFixed(3),candidateMs:+r.candidateMedianMs.toFixed(3),ratio:+r.ratio.toFixed(3)}))));
