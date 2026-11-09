import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogHarness} from '../scripts/catalog-harness.mjs';
function scenario(bank,stationary=true){
 const h=catalogHarness();h.ctx.selectedShip='charge';const releases=[];
 Object.assign(h.ctx,{activeSynergies:()=>[],activeFusions:()=>[],syncEvolutionVisuals:()=>{},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),fireComet:q=>releases.push(q)});
 for(const name of ['retainCombatState','restorePlayerBuild','applyShipPreset','updateCharge'])h.eval(h.declaration(name));
 h.ctx.player=h.eval('initialP()');h.eval('applyShipPreset(player)');
 if(bank){h.ctx.AnkinTactics.apply(h.ctx.player,'tacChargeBank');h.ctx.game.skills.tacChargeBank=1;h.ctx.game.acquisitionLog.push('tacChargeBank');}
 Object.assign(h.ctx.player,{charge:.7,chargeStationary:stationary,dashTime:bank?.2:0});h.eval('restorePlayerBuild()');
 return {h,releases};
}
test('legacy stored charge releases on movement after a build reconstruction',()=>{
 const {h,releases}=scenario(false);assert.equal(h.ctx.player.chargeStationary,true);h.eval('updateCharge(1/60,1)');assert.deepEqual(releases,[.7]);assert.equal(h.ctx.player.charge,0);
});
test('tactical bank retains charge through rebuild and dash, then releases exactly once',()=>{
 const {h,releases}=scenario(true);assert.equal(h.ctx.player.chargeStationary,true);h.eval('updateCharge(1/60,1)');assert.deepEqual(releases,[]);assert.equal(h.ctx.player.charge,.7);
 h.ctx.player.dashTime=0;h.eval('updateCharge(1/60,1)');h.eval('updateCharge(1/60,1)');assert.deepEqual(releases,[.7]);assert.equal(h.ctx.player.charge,0);
});
test('rebuild does not invent a stationary charge when the state was false',()=>{
 const {h,releases}=scenario(false,false);assert.equal(h.ctx.player.chargeStationary,false);h.eval('updateCharge(1/60,1)');assert.deepEqual(releases,[]);
});
