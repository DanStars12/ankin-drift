import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createContext,runInContext}from'node:vm';
test('native benchmark setup resets render history and adaptive clocks before applying resolution',()=>{
 const line=readFileSync(new URL('./performance.spec.mjs',import.meta.url),'utf8').split('\n')[0];
 const hook=JSON.parse(line.slice('const TEST_HOOK = '.length,-1));
 const ctx=createContext({window:{},frame:{lastDraw:999},adaptiveRenderScale:.76,overloadClock:1.4,recoveryClock:17.9,
  renderBudget:200,actualDraws:57,lastFpsSample:999,actualFps:16,perfRing:{head:99,count:480},enemyIndexReady:true});
 ctx.state=value=>{ctx.mode=value};
 ctx.newRun=()=>{ctx.player={};ctx.game={};ctx.pickups=[]};let applied;
 ctx.applyCanvasResolution=()=>{applied={scale:ctx.adaptiveRenderScale,overload:ctx.overloadClock,recovery:ctx.recoveryClock,lastDraw:ctx.frame.lastDraw}};
 runInContext(hook,ctx);const out=ctx.window.__ankinPerfTestScenario({total:480,count:0,bullets:0,withRaid:false});
 assert.deepEqual(applied,{scale:1,overload:0,recovery:0,lastDraw:0});
 assert.deepEqual([ctx.renderBudget,ctx.actualDraws,ctx.lastFpsSample,ctx.actualFps,ctx.perfRing.head,ctx.perfRing.count],[0,0,0,0,0,0]);
 assert.equal(ctx.mode,'playing');assert.equal(out.initialEnemies,0);assert.equal(ctx.enemyIndexReady,false);
});
