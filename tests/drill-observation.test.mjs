import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drillContactGeometry} from '../scripts/balance-drill-observation.mjs';
const p={x:0,y:0,dx:1,dy:0,drillReach:25,drillWidth:10};
test('range alone does not mean a forward drill can hit a strafed target',()=>{
 const forward=drillContactGeometry(p,{x:58,y:0,r:15});
 const side=drillContactGeometry(p,{x:0,y:58,r:15});
 assert.equal(forward.withinRadialReach,true);assert.equal(side.withinRadialReach,true);
 assert.equal(forward.forwardCapsuleOverlap,true);assert.equal(side.forwardCapsuleOverlap,false);
 assert.equal(forward.aimErrorDegrees,0);assert.equal(side.aimErrorDegrees,90);
});
test('behind, out of range, no target and arbitrary headings are observational only',()=>{
 const original=structuredClone(p),target={x:-58,y:0,r:15},copy={...target};
 assert.equal(drillContactGeometry(p,target).aimErrorDegrees,180);
 assert.equal(drillContactGeometry(p,{x:200,y:0,r:15}).withinRadialReach,false);
 assert.equal(drillContactGeometry(p,null),null);
 assert.equal(drillContactGeometry({...p,dx:0,dy:1},{x:0,y:58,r:15}).forwardCapsuleOverlap,true);
 assert.deepEqual(p,original);assert.deepEqual(target,copy);
});
