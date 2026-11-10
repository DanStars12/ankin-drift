import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Exercise the shipped scheduler, with drive replaced ONLY in this isolated VM.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('const SIM_STEP='),html.indexOf('function tuneRenderResolution'));
function clock(speed=1,stopAt=Infinity){
 const ctx={mode:'playing',t:0,hasTrial:id=>id==='doubleTime'&&speed===2};
 const steps=[];
 ctx.drive=dt=>{steps.push(dt);if(steps.length>=stopAt)ctx.mode='choice';};
 runInNewContext(source+`;globalThis.tick=advanceSimulation;globalThis.snapshot=()=>({pending:simAccumulator,stalls:stalledFrameCount,discarded:discardedSimulationSeconds});`,ctx);
 return {ctx,steps,tick:ctx.tick,state:ctx.snapshot};
}
for(const fps of [15,30,60,90,120,144])test(`1x and 2x preserve 1/60s steps at ${fps} Hz`,()=>{
 for(const speed of [1,2]){
  const c=clock(speed);
  for(let i=0;i<fps*10;i++)c.tick(1/fps);
  assert.equal(c.steps.length,600*speed);
  assert.ok(c.steps.every(dt=>dt===1/60));
  assert.ok(c.state().pending<1e-8);assert.equal(c.state().stalls,0);
 }
});
test('2x step budget retains backlog and stalls never grant unsimulated survival',()=>{
 const c=clock(2);let advanced=c.tick(.30);
 assert.equal(c.steps.length,16);assert.ok(c.state().pending>.33);
 while(c.state().pending>=1/60-1e-9)advanced+=c.tick(0);
 assert.ok(Math.abs(advanced-.6)<1e-8);
 const before=c.ctx.t;c.tick(20);
 assert.ok(c.ctx.t-before<.27);assert.ok(c.state().discarded>39);
 assert.ok(c.state().pending<.65);
});
test('a choice midway through 2x catch-up stops immediately; all menu states freeze time',()=>{
 const c=clock(2,3);c.tick(.1);assert.equal(c.steps.length,3);assert.equal(c.state().pending,0);
 for(const mode of ['paused','choice','build','options','menu','fusion','elementResult']){
  c.ctx.mode=mode;c.tick(60);assert.equal(c.steps.length,3);
 }
});
for(const minutes of [15,30])test(`${minutes} minute clock has no long-run drift at 2x`,()=>{
 const c=clock(2);for(let i=0;i<minutes*30*60;i++)c.tick(1/60);
 assert.equal(c.steps.length,minutes*60*60);
 assert.ok(Math.abs(c.ctx.t-minutes*60)<1e-6);
});
