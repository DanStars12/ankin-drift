// Shipped-engine measurements; no rendering/FPS or guaranteed human win-rate claims.
import {runtimeHarness} from './runtime-vm-harness.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const seeds=Number(process.env.ANKIN_BALANCE_SEEDS||3),mode=process.env.ANKIN_BALANCE_SCOPE||'encounters';
if(!Number.isInteger(seeds)||seeds<1||seeds>20||!['encounters','progression','early'].includes(mode))throw Error('Invalid balance options');
const ships=(process.env.ANKIN_BALANCE_SHIPS||'shot,laser,charge,drill,dog,phantom').split(',');
const out=process.env.ANKIN_BALANCE_OUTPUT||'docs/qa/phantom-combat-baseline.json';
const hash=createHash('sha256').update(['index.html','phantom-frame.js','scripts/balance-ai-harness.mjs','scripts/balance-reward-value.mjs'].map(f=>readFileSync(f)).join('')).digest('hex');
const h=runtimeHarness(),rows=[];
const save=()=>{mkdirSync('docs/qa',{recursive:true});writeFileSync(out,JSON.stringify({sourceHash:hash,scope:mode,seeds,rendered:false,fps:null,rows},null,2)+'\n');};
if(mode==='encounters'){
 for(const build of ['base','representative'])for(const scenario of ['live-pack','live-boss'])for(const ship of ships)for(let seed=1;seed<=seeds;seed++){
  const r=h.ctx.__ankinBalanceAI.runEncounter({ship,seed,phase:build==='base'?0:10,scenario,build,seconds:45,phantomPilot:'lookahead'});rows.push(r);save();console.log(JSON.stringify({ship,build,scenario,seed,seconds:r.duration,dps:r.dps,won:r.won,alive:r.alive}));
 }
}else for(const ship of ships)for(let seed=1;seed<=seeds;seed++){
 const r=h.ctx.__ankinBalanceAI.runFull({ship,seed,gameMode:'normal',phantomPilot:'lookahead',...(mode==='early'?{preview:true,seconds:120}:{})});rows.push(r);save();console.log(JSON.stringify({ship,seed,seconds:r.simulationTime,dps:r.dps,level:r.level,stop:r.stopReason,phantom:r.phantomState?.level,damage:r.damageBySource||r.damageStats}));
}
