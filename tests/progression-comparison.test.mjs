import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareProgression} from '../scripts/compare-progression.mjs';
const rows=(clears,ship='phantom',gameMode='normal')=>Array.from({length:20},(_,i)=>({ship,gameMode,seed:17+i,seconds:i<clears?1810:500+i,result:i<clears?'clear':'dead',clear:i<clears?1:0,boss:i<clears}));
const compare=(a,b)=>compareProgression(a,b,{ship:'phantom',gameMode:'normal'});
test('the observed PHANTOM regressions fail even when every simulation completed successfully',()=>{
 for(const clears of [4,1]){const r=compare(rows(6),rows(clears));assert.equal(r.regressed,true);assert.equal(r.candidate.trials,20);}
});
test('equal or improved clear counts pass and every death remains in the denominator',()=>{
 for(const clears of [6,7]){const r=compare(rows(6),rows(clears));assert.equal(r.regressed,false);assert.equal(r.candidate.dead,20-clears);}
});
test('a final-boss timeout is not counted as a clear',()=>{
 const after=rows(6);after[5]={...after[5],result:'time-limit',clear:0,boss:true,seconds:1860};const r=compare(rows(6),after);assert.equal(r.regressed,true);assert.equal(r.candidate.timeout,1);assert.equal(r.candidate.clear,5);
});
test('truncated, duplicated or mismatched paired seeds cannot produce a passing comparison',()=>{
 assert.throws(()=>compare(rows(6),rows(6).slice(1)),/missing trials/);
 const duplicate=rows(6);duplicate[19].seed=17;assert.throws(()=>compare(rows(6),duplicate),/seeds/);
 const different=rows(6);different[19].seed=37;assert.throws(()=>compare(rows(6),different),/seeds/);
});
test('wrong modes, invalid outcomes and inconsistent clear flags are rejected',()=>{
 const wrong=rows(6,'phantom','challenge');assert.throws(()=>compare(rows(6),wrong),/wrong mode/);
 for(const patch of [{result:'unhandled-menu:fusion'},{result:'clear',clear:0},{boss:false},{seconds:NaN}]){const after=rows(6);Object.assign(after[0],patch);assert.throws(()=>compare(rows(6),after));}
});

test('downloaded baseline/candidate artifact layouts aggregate all twelve pairs and expose PHANTOM regression',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');const {join}=await import('node:path');const {tmpdir}=await import('node:os');const {compareProgressionArtifacts,progressionShips}=await import('../scripts/compare-progression.mjs');const root=await mkdtemp(join(tmpdir(),'ankin-paired-'));
 try{
  for(const ship of progressionShips)for(const gameMode of ['normal','challenge'])for(const revision of ['baseline','candidate']){
   const summary=rows(ship==='phantom'&&gameMode==='normal'&&revision==='candidate'?1:6,ship,gameMode);
   const raw=summary.map(s=>({ship:s.ship,gameMode:s.gameMode,seed:s.seed,simulationTime:s.seconds,stopReason:s.result,clearCount:s.clear,reachedFinalBoss:s.boss}));
   const dir=join(root,`arsenal-full-${revision}-${gameMode}-${ship}`,revision==='baseline'?'comparison-base/artifacts/arsenal':'artifacts/arsenal');await mkdir(dir,{recursive:true});await writeFile(join(dir,'desktop-progression.json'),JSON.stringify({summary,rows:raw}));
  }
  const compared=await compareProgressionArtifacts(root);assert.equal(compared.length,12);assert.deepEqual(compared.filter(r=>r.regressed).map(r=>[r.ship,r.gameMode]),[['phantom','normal']]);
  const broken=join(root,'arsenal-full-baseline-normal-shot/comparison-base/artifacts/arsenal/desktop-progression.json');await writeFile(broken,JSON.stringify({summary:rows(6),rows:[]}));await assert.rejects(compareProgressionArtifacts(root),/Summary\/full report mismatch/);
 }finally{await rm(root,{recursive:true,force:true});}
});
