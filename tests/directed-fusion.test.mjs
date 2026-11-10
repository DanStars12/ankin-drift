import {test} from 'node:test';import assert from 'node:assert/strict';
import {catalogHarness} from '../scripts/catalog-harness.mjs';
function harness(){const h=catalogHarness();Object.assign(h.ctx,{runClock:0,zones:[],enemies:[],enemyIndexDirtyDuringForces:false,TAU:Math.PI*2,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),engageBlockedPoint:()=>false});
 for(const id of ['CROSS_VARIANTS','ELEMENT_FUSION_RECIPES','FUSION_B_VARIANTS','FUSION_WEAPON_CHOICES','FUSION_PALETTES','fusionOutcome','applyAutoFusionResonance','applyElementFusionStats','fusedColor','weaponPaint','evolutionVisualProfile','syncEvolutionVisuals','fusionPush','fusionImpact','splitWindMagma','stepRenderLoad','unifyMagma'])h.eval(h.declaration(id));
 h.ctx.player=h.eval('initialP()');return h;}
test('40 directed recipes retain the selected weapon; donor colors are slot-specific',()=>{const h=harness();
 for(const main of ['fire','ice','thunder','wind','rock'])for(const sub of ['fire','ice','thunder','wind','rock'])if(main!==sub)for(const slot of ['A','B']){
  h.ctx.combo={main,sub,weapon:slot,resonance:4};h.eval('player=initialP();game.elementCombos=[combo];applyElementFusionStats(player,combo)');
  assert.ok(h.eval('fusionOutcome(combo.main,combo.sub,combo.weapon).desc'));assert.equal(h.eval('fusedColor(combo.main,combo.weapon)'),h.eval('ELEMENTS[combo.sub].color'));
  assert.equal(h.eval("fusedColor(combo.main,combo.weapon==='A'?'B':'A')"),null);
  for(const key of ['fireTornado','emberPulse','iceStorm','zeroSurge','iceArmor','thunderFort','diamondWall'])assert.equal(h.ctx.player.elementMods[key],undefined);
  assert.equal(h.ctx.player.shield,0);assert.equal(h.ctx.player.fusionOutputBonus,.17);
 }
});
test('wind impact repels normal foes without moving bosses, warp targets or foes toward the pilot',()=>{const h=harness();Object.assign(h.ctx.player,{x:400,y:300});h.ctx.e={x:420,y:300,r:10,type:'drone'};
 h.eval('fusionPush(e,450,300,18)');assert.equal(h.ctx.e.x,438);assert.equal(h.ctx.enemyIndexDirtyDuringForces,true);
 for(const type of ['minor','major','unique','ultimate','ultimatePart','relic']){h.ctx.e={x:420,y:300,r:10,type};h.eval('fusionPush(e,400,300,18)');assert.equal(h.ctx.e.x,420);}
 h.ctx.e={x:420,y:300,r:10,type:'drone',isoWarp:{}};h.eval('fusionPush(e,400,300,18)');assert.equal(h.ctx.e.x,420);
 h.ctx.engageBlockedPoint=()=>true;h.ctx.e={x:420,y:300,r:10,type:'drone'};h.eval('fusionPush(e,400,300,18)');assert.equal(h.ctx.e.x,420);
});
test('missile wind inheritance applies across its blast only, with no extra native cyclone',()=>{const h=harness();h.ctx.game.elementCombos=[{main:'fire',sub:'wind',weapon:'A'}];Object.assign(h.ctx.player,{x:100,y:100});
 h.ctx.enemies=[{x:140,y:100,r:8,type:'drone'},{x:180,y:100,r:8,type:'drone'},{x:310,y:100,r:8,type:'drone'},{x:150,y:120,r:8,type:'major'}];h.ctx.circleCandidates=()=>h.ctx.enemies;
 h.eval("fusionImpact('fire',120,100,95,100)");assert.equal(h.ctx.enemies[0].x,158);assert.equal(h.ctx.enemies[1].x,198);assert.equal(h.ctx.enemies[2].x,310);assert.equal(h.ctx.enemies[3].x,150);
 h.eval("fusionImpact('fire',120,100,95,100)");assert.equal(h.ctx.enemies[0].x,158);
 h.ctx.game.elementCombos[0].weapon='B';h.ctx.runClock=10;h.eval("fusionImpact('fire',120,100,95,100)");assert.equal(h.ctx.enemies[0].x,158);
});
test('inherited arcs have a shared two-chain budget per native weapon tick',()=>{const h=harness();h.ctx.game.elementCombos=[{main:'wind',sub:'thunder',weapon:'A'}];h.ctx.enemies=Array.from({length:30},(_,i)=>({x:110+i,y:100,r:8,type:'drone'}));h.ctx.circleCandidates=()=>h.ctx.enemies;let n=0;h.ctx.applyChain=()=>n++;
 h.eval("for(const e of enemies)fusionImpact('wind',100,100,100,100,e)");assert.equal(n,2);h.ctx.runClock=.7;h.eval("fusionImpact('wind',100,100,100,100)");assert.equal(n,4);
});
test('wind magma splits once, conserves area budget, obeys cap and excludes children from consolidation',()=>{const h=harness();Object.assign(h.ctx.player,{elementMods:{magmaWind:1},magmaDps:100,magmaLevel:1,lavaConstrain:1});h.ctx.zones=[{x:400,y:300,r:100,life:3,ttl:0,dps:100,type:'magma'}];
 h.eval('splitWindMagma(zones[0],1.19)');assert.equal(h.ctx.zones.length,1);h.eval('splitWindMagma(zones[0],.02)');assert.equal(h.ctx.zones.length,3);
 assert.equal(h.ctx.zones[0].dps,65);assert.equal(h.ctx.zones[1].dps,40);assert.equal(h.ctx.zones[1].r,52);
 h.eval('for(let i=0;i<300;i++)for(const z of zones)splitWindMagma(z,1/60);unifyMagma()');assert.equal(h.ctx.zones.length,3);assert.ok(h.ctx.zones.slice(1).every(z=>z.splitDepth===1));
 h.ctx.zones=Array.from({length:48},()=>({x:400,y:300,r:100,life:3,dps:100,type:'magma'}));h.eval('splitWindMagma(zones[0],2)');assert.equal(h.ctx.zones.length,48);
});
test('all acquired evolution colors contribute to weapon gradients, preserving donor and base-mode colors',()=>{const h=harness();h.ctx.game.fusions={inferno:1,frostSanctuary:1};h.ctx.game.synergies={};h.eval('syncEvolutionVisuals(player)');assert.ok(h.ctx.player.weaponColors.primary.length>=2);const stops=[];h.ctx.g={createLinearGradient:()=>({addColorStop:(p,c)=>stops.push([p,c])})};h.eval("weaponPaint(g,'primary','A',0,0,10,10,'#ff0000')");assert.equal(stops.length,3);assert.equal(stops[0][1],'#ff0000');
 h.ctx.game.elementCombos=[{main:'fire',sub:'wind',weapon:'A'}];h.ctx.player.weaponColors.fireA=['#123456','#654321'];stops.length=0;h.eval("weaponPaint(g,'fire','A',0,0,10,10,'#ff0000')");assert.deepEqual(stops.map(x=>x[1]),['#7bffe1','#123456','#654321','#7bffe1']);
});
test('render load hysteresis prevents boundary chatter and smoothly changes glow at 15–144 FPS',()=>{const h=harness();for(const fps of [15,30,60,144]){h.ctx.state={active:false,entry:0,recovery:0,glow:1};h.ctx.dt=1/fps;
 for(let i=0;i<fps*6;i++){h.ctx.pressure=i%2?491:489;h.eval("stepRenderLoad(state,pressure,100,false,false,true,'high',dt)");}
 assert.equal(h.ctx.state.active,true);const old=h.ctx.state.glow;for(let i=0;i<fps*2;i++)h.eval("stepRenderLoad(state,310,100,false,false,true,'high',dt)");assert.equal(h.ctx.state.active,true);
 for(let i=0;i<fps*4;i++){const prev=h.ctx.state.glow;h.eval("stepRenderLoad(state,0,0,false,false,true,'high',dt)");assert.ok(Math.abs(h.ctx.state.glow-prev)<=1-Math.exp(-4/fps)+1e-12);}assert.equal(h.ctx.state.active,false);assert.ok(h.ctx.state.glow>old);
 }});

test('DOG mutation and apex colors survive later elemental inheritance as separate gradient stops',()=>{const h=harness();h.ctx.game.synergies={};h.ctx.game.fusions={dogFoxApex:1};Object.assign(h.ctx.player,{shipType:'dog',dogNineTailMorph:1,dogNineTailAscended:1});h.ctx.game.elementCombos=[{main:'fire',sub:'wind',weapon:'A'}];h.eval('syncEvolutionVisuals(player)');assert.ok(h.ctx.player.weaponColors.fireA.includes('#eab04f'));assert.ok(h.ctx.player.weaponColors.fireA.includes('#d48b57'));assert.ok(!h.ctx.player.weaponColors.primary.includes('#eab04f'));const stops=[];h.ctx.g={createLinearGradient:()=>({addColorStop:(p,c)=>stops.push(c)})};h.eval("weaponPaint(g,'fire','A',-1,-1,1,1,'#f47736')");assert.equal(stops[0],'#7bffe1');assert.ok(stops.includes('#eab04f'));assert.ok(stops.includes('#d48b57'));});
