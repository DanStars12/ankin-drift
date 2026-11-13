import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {runtimeHarness} from './runtime-vm-harness.mjs';
const sourceHash=createHash('sha256').update(['index.html','phantom-frame.js','dark-element.js','scripts/balance-ai-harness.mjs'].map(f=>readFileSync(f)).join('')).digest('hex');
const h=runtimeHarness(),rows=[],full=[];
const output=process.env.ANKIN_QA_OUTPUT||'docs/qa/phantom-simulation.json';
const ships=[...h.ctx.__ankinBalanceAI.inspect().ships].filter(s=>!process.env.ANKIN_QA_SHIPS||process.env.ANKIN_QA_SHIPS.split(',').includes(s));
for(const scenario of ['live-pack','live-boss'])for(let seed=1;seed<=3;seed++)for(const ship of ships){
 const start=performance.now();const r=h.ctx.__ankinBalanceAI.runEncounter({ship,seed,phase:10,scenario,build:'representative',seconds:30});
 rows.push({...r,hostLogicMs:performance.now()-start});
}
const summary=ships.map(ship=>{const r=rows.filter(r=>r.ship===ship&&r.scenario==='live-pack');return {ship,meanDps:r.reduce((a,x)=>a+x.dps,0)/r.length,alive:r.filter(x=>x.alive).length,seeds:r.length,meanSeconds:r.reduce((a,x)=>a+x.duration,0)/r.length};});
mkdirSync('docs/qa',{recursive:true});const save=()=>writeFileSync(output,JSON.stringify({sourceHash,kind:'logic-only-shipped-game-vm',rendered:false,fps:null,summary,encounters:rows,full},null,2)+'\n');save();console.log(JSON.stringify({shortSummary:summary}));
for(const gameMode of ['challenge','normal'])for(const ship of ships){const start=performance.now();const r=h.ctx.__ankinBalanceAI.runFull({ship,seed:1,gameMode});full.push({...r,hostLogicMs:performance.now()-start});save();console.log(JSON.stringify({full:gameMode,ship,seconds:r.simulationTime,level:r.level,stop:r.stopReason}));}
mkdirSync('docs/qa',{recursive:true});writeFileSync(output,JSON.stringify({sourceHash,kind:'logic-only-shipped-game-vm',rendered:false,fps:null,shortScenario:'10-minute enemy scaling, representative builds, 30 game seconds, seeds 1-3',summary,encounters:rows,full},null,2)+'\n');
