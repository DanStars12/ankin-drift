import {test} from 'node:test';import assert from 'node:assert/strict';
import {renderBatchHarness,legacyGrid,legacyHatching} from '../scripts/render-batch-harness.mjs';
const h=renderBatchHarness();
function recorder(){return {segments:[],strokes:0,paths:0,beginPath(){this.paths++},moveTo(x,y){this.from=[x,y]},lineTo(x,y){this.segments.push([...this.from,x,y])},stroke(){this.strokes++}}}
test('grid keeps all line positions and both crossing layers while reducing submissions',()=>{
 for(const [w,height]of [[320,740],[390/.69,844/.69],[1280,800],[3840,2160]])for(const time of [0,.123,61/11,1800.333]){
  const a=recorder(),b=recorder();legacyGrid(a,w,height,time);h.grid(b,w,height,time);
  assert.deepEqual(b.segments,a.segments);assert.equal(b.strokeStyle,a.strokeStyle);assert.equal(b.lineWidth,1);
  assert.equal(b.paths,2);assert.equal(b.strokes,2);assert.ok(a.strokes>b.strokes);
 }
});
test('clipped hatching keeps every endpoint including negative and fractional wall bounds',()=>{
 for(const wall of [{x:100,y:80,w:280,h:130},{x:-50.2,y:-18.7,w:250.1,h:340.6},{x:3820,y:2120,w:300,h:110}]){
  const a=recorder(),b=recorder();legacyHatching(a,wall);h.hatching(b,wall);
  assert.deepEqual(b.segments,a.segments);assert.equal(b.strokes,1);assert.equal(b.paths,1);assert.ok(a.strokes>1);
 }
});
