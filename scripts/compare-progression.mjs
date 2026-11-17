// Compare the actual paired browser timelines, including deaths and timeouts.
import assert from 'node:assert/strict';
import {readFile,readdir,appendFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
export const progressionShips=['shot','laser','charge','drill','dog','phantom'];
export function compareProgression(baseline,candidate,{ship,gameMode,seeds=Array.from({length:20},(_,i)=>17+i)}={}){
 assert(progressionShips.includes(ship)&&['normal','challenge'].includes(gameMode),'Unknown ship/mode');
 assert.equal(new Set(seeds).size,seeds.length,'Duplicate expected seeds');
 function count(rows,label){
  assert.equal(rows.length,seeds.length,label+': missing trials');
  assert.deepEqual(rows.map(r=>r.seed).sort((a,b)=>a-b),[...seeds].sort((a,b)=>a-b),label+': mismatched or duplicate seeds');
  for(const r of rows){
   assert.equal(r.ship,ship,label+': wrong ship');assert.equal(r.gameMode,gameMode,label+': wrong mode');
   assert(['clear','dead','time-limit'].includes(r.result),label+': invalid stop reason');
   assert(Number.isFinite(r.seconds)&&r.seconds>0,label+': invalid duration');
   assert(Number.isInteger(r.clear)&&r.clear>=0,label+': invalid clear count');
   assert.equal(r.clear>0,r.result==='clear',label+': clear result/count mismatch');
   if(r.result==='clear')assert.equal(r.boss,true,label+': clear without final boss');
  }
  return {trials:rows.length,clear:rows.filter(r=>r.result==='clear').length,dead:rows.filter(r=>r.result==='dead').length,timeout:rows.filter(r=>r.result==='time-limit').length};
 }
 const before=count(baseline,'baseline'),after=count(candidate,'candidate');
 return {ship,gameMode,baseline:before,candidate:after,regressed:after.clear<before.clear};
}
async function findReports(dir){const paths=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())paths.push(...await findReports(path));else if(entry.name==='desktop-progression.json')paths.push(path);}return paths;}
async function readReport(dir){
 const paths=await findReports(dir);assert.equal(paths.length,1,dir+': expected exactly one progression report');
 const doc=JSON.parse(await readFile(paths[0],'utf8'));assert(Array.isArray(doc.rows)&&Array.isArray(doc.summary),'Missing full report');
 assert.equal(doc.rows.length,doc.summary.length,'Summary/full report mismatch');
 for(const s of doc.summary){const raw=doc.rows.filter(r=>r.seed===s.seed&&r.ship===s.ship&&r.gameMode===s.gameMode);assert.equal(raw.length,1,'Missing or duplicate raw trial');assert.equal(raw[0].stopReason,s.result);assert.equal(raw[0].clearCount,s.clear);assert.equal(raw[0].reachedFinalBoss,s.boss);assert.equal(raw[0].simulationTime,s.seconds);}
 return doc.summary;
}
export async function compareProgressionArtifacts(root){
 const results=[];
 for(const ship of progressionShips)for(const gameMode of ['normal','challenge']){
  const pair=await Promise.all(['baseline','candidate'].map(revision=>readReport(join(root,`arsenal-full-${revision}-${gameMode}-${ship}`))));
  results.push(compareProgression(...pair,{ship,gameMode}));
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const results=await compareProgressionArtifacts(process.argv[2]||'artifacts/paired-progression');
 const table=['| Ship | Mode | Baseline clears | Candidate clears | Result |','|---|---|---:|---:|---|',...results.map(r=>`| ${r.ship} | ${r.gameMode} | ${r.baseline.clear}/${r.baseline.trials} | ${r.candidate.clear}/${r.candidate.trials} | ${r.regressed?'REGRESSION':'PASS'} |`)].join('\n');
 console.log(table);console.log('PAIRED_PROGRESSION='+JSON.stringify(results));
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,table+'\n\nSame AI and 20 paired seeds; deaths/timeouts remain in the denominator. These are AI measurements, not human win rates.\n');
 assert(!results.some(r=>r.regressed),'Paired AI clear count decreased; inspect the affected ship/mode before merging.');
}
