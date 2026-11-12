import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const created=[];
 class AudioMock{
  constructor(src){this.src=src;this.currentSrc=src;this.currentTime=0;this.duration=120;this.paused=true;this.ended=false;this.error=null;created.push(this)}
  addEventListener(){}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
  removeAttribute(){}
  load(){}
 }
 function param(){return {value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}}}
 const ctx={currentTime:0,state:'running',createGain(){return {gain:param(),connect(){},disconnect(){}}},createMediaElementSource(){return {connect(){},disconnect(){}}}};
 const env={window:{},Audio:AudioMock,Math:Object.assign(Object.create(Math),{random:()=>0})};
 vm.runInNewContext(readFileSync(new URL('../music-soundtrack.js',import.meta.url),'utf8'),env);
 const api=env.window.AnkinSoundtrack,engine=api.create(ctx,{});
 const tick=scene=>{ctx.currentTime+=2;engine.tick({scene});return engine.inspect().track};
 const finish=scene=>{const a=created.at(-1);a.currentTime=a.duration-.25;return tick(scene)};
 return {api,engine,created,ctx,tick,finish};
}
test('four normal BGM and EXODUS ENGINE extend existing tracks',()=>{
 const {api}=fixture();
 assert.deepEqual(Array.from(api.pools.battle),['battle','phantom','fractal','pixel','ion']);
 assert.deepEqual(Array.from(api.pools.boss),['trinity','major','exodus']);
 assert.equal(api.tracks.exodus.title,'EXODUS ENGINE');
});
test('normal playlist plays all five once before any repeat',()=>{
 const f=fixture(),played=[f.tick('battle')];
 for(let i=1;i<10;i++)played.push(f.finish('battle'));
 assert.equal(new Set(played.slice(0,5)).size,5);
 assert.equal(new Set(played.slice(5,10)).size,5);
 for(let i=1;i<played.length;i++)assert.notEqual(played[i],played[i-1]);
 assert.equal(f.engine.inspect().rounds.battle,1);
});
test('boss playlist shares a three-song shuffle bag across boss tiers',()=>{
 const f=fixture();
 const plays=[f.tick('trinity'),f.finish('trinity'),f.tick('major'),f.finish('major')];
 assert.equal(new Set(plays.slice(0,3)).size,3);
 assert.notEqual(plays[2],plays[3]);
 assert.equal(f.tick('last'),'last');
 assert.equal(f.created.at(-1).loop,true);
 assert.equal(f.tick('title'),'title');
});
test('pausing and continuing does not consume a song',()=>{
 const f=fixture(),first=f.tick('battle'),left=f.engine.inspect().remaining.battle.length;
 f.ctx.currentTime+=2;f.engine.tick({scene:'battle',paused:true});
 assert.equal(f.engine.inspect().track,first);
 assert.equal(f.engine.inspect().remaining.battle.length,left);
 assert.equal(f.tick('battle'),first);
});
test('reshuffle boundary avoids the last played song for every possible last value',()=>{
 const {api}=fixture();
 for(const last of api.pools.battle){
  const bag=api.shuffledBag(api.pools.battle,last,()=>0);
  assert.equal(new Set(bag).size,5);
  assert.notEqual(bag.at(-1),last);
 }
});
