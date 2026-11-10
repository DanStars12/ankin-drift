import {test}from'node:test';import assert from'node:assert/strict';
import {intervalCoverageMs,summarizeTrace,summarizeCpu}from'../scripts/render-trace-summary.mjs';
test('trace coverage merges nested and overlapping intervals without mutating input',()=>{
 const a=[[5000,9000],[0,6000],[1000,2000],[12000,14000]],copy=structuredClone(a);
 assert.equal(intervalCoverageMs(a),11);assert.deepEqual(a,copy);assert.equal(intervalCoverageMs([]),0);assert.throws(()=>intervalCoverageMs([[3,2]]));
});
test('trace summaries separate threads and retain explicit omitted phase counts',()=>{
 const out=summarizeTrace([{ph:'M',pid:1,tid:2,name:'thread_name',args:{name:'Renderer'}},
  {ph:'X',pid:1,tid:2,ts:0,dur:10000,name:'Task'},{ph:'X',pid:1,tid:2,ts:1000,dur:3000,name:'Paint'},
  {ph:'X',pid:1,tid:3,ts:0,dur:5000,name:'RasterTask'},{ph:'B',pid:1,tid:2,ts:4,name:'ignored'}]);
 assert.equal(out.eventCount,5);assert.equal(out.phases.B,1);assert.equal(out.threads[0].coveredMs,10);assert.equal(out.threads[0].name,'Renderer');
 assert.equal(out.threads[0].top.reduce((s,x)=>s+x.inclusiveMs,0),13);assert.equal(out.threads[1].coveredMs,5);assert.match(out.warning,/not CPU/);
});
test('CPU self estimates use sample durations, distinguish idle and retain source lines',()=>{
 const out=summarizeCpu({nodes:[{id:1,callFrame:{functionName:'render',url:'http://localhost/game',lineNumber:10}},{id:2,callFrame:{functionName:'(idle)',lineNumber:-1}}],samples:[1,2,1],timeDeltas:[1000,8000,3000]});
 assert.equal(out.sampledMs,12);assert.equal(out.top[0].selfMs,4);assert.equal(out.top[0].line,11);assert.equal(out.states[0].selfMs,8);assert.equal(out.top[0].samples,2);
});
test('malformed CPU samples and non-array traces are rejected rather than misreported',()=>{
 assert.throws(()=>summarizeCpu({nodes:[],samples:[1],timeDeltas:[]}));assert.throws(()=>summarizeCpu({nodes:[],samples:[1],timeDeltas:[1]}));
 assert.throws(()=>summarizeCpu({nodes:[{id:1,callFrame:{}}],samples:[1],timeDeltas:[-1]}));assert.throws(()=>summarizeTrace(null));
});
