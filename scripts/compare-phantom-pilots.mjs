import {runtimeHarness} from './runtime-vm-harness.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const h=runtimeHarness(),rows=[],full=[];
const sourceHash=createHash('sha256').update(['index.html','phantom-frame.js','scripts/balance-ai-harness.mjs','dark-element.js','scripts/balance-ability-tactics.mjs','scripts/balance-reward-value.mjs'].map(f=>readFileSync(f)).join('')).digest('hex');
const output=process.env.ANKIN_PILOT_REPORT||'docs/qa/phantom-pilot-comparison.json';
const seeds=Number(process.env.ANKIN_PILOT_SEEDS||5);
const save=()=>{mkdirSync('docs/qa',{recursive:true});writeFileSync(output,JSON.stringify({sourceHash,rendered:false,fps:null,scenario:'phase-10 live-pack, 60 game seconds, representative build',rows,full},null,2)+'\n');};
for(const phantomPilot of ['potential','lookahead'])for(let seed=1;seed<=seeds;seed++){
 const r=h.ctx.__ankinBalanceAI.runEncounter({ship:'phantom',seed,phase:10,scenario:'live-pack',build:'representative',seconds:60,phantomPilot});rows.push(r);save();console.log(JSON.stringify({phantomPilot,seed,seconds:r.duration,hits:r.hits,dps:r.dps,alive:r.alive}));
}
if(process.env.ANKIN_PILOT_FULL==='1')for(const gameMode of ['challenge','normal'])for(const phantomPilot of ['potential','lookahead'])for(let seed=1;seed<=Math.min(seeds,3);seed++){
 const r=h.ctx.__ankinBalanceAI.runFull({ship:'phantom',seed,gameMode,phantomPilot});full.push(r);save();console.log(JSON.stringify({gameMode,phantomPilot,seed,seconds:r.simulationTime,level:r.level,stop:r.stopReason}));
}
