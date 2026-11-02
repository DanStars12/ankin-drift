/* Pure aggregation/export helpers. Nothing here can change the game or its saves. */
export const BALANCE_SCHEMA='ankin-balance-v1';
export function percentile(values,q){
 if(!values.length)return null;
 if(q<0||q>1)throw Error('Percentile must be between 0 and 1');
 const sorted=[...values].sort((a,b)=>a-b);
 const index=(sorted.length-1)*q,lo=Math.floor(index),hi=Math.ceil(index);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);
}
const round=(n,d=2)=>Number(n.toFixed(d));
export function summarizeRuns(runs){
 if(!Array.isArray(runs))throw TypeError('Expected run array');
 const groups=new Map();
 for(const r of runs){
  if(r.schema!==BALANCE_SCHEMA)throw Error('Unsupported balance run schema');
  if(!Number.isFinite(r.dps)||!Number.isFinite(r.duration)||r.duration<=0)throw Error('Invalid run metrics');
  const key=[r.ship,r.scenario,r.build].join('|');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(r);
 }
 return [...groups.entries()].map(([key,rows])=>{
  const [ship,scenario,build]=key.split('|'),dps=rows.map(x=>x.dps);
  return {ship,scenario,build,runs:rows.length,
   dpsMean:round(dps.reduce((a,b)=>a+b,0)/rows.length),
   dpsP10:round(percentile(dps,.1)),dpsMedian:round(percentile(dps,.5)),
   dpsP90:round(percentile(dps,.9)),
   killsMean:round(rows.reduce((a,b)=>a+b.kills,0)/rows.length),
   damageTakenMean:round(rows.reduce((a,b)=>a+b.damageTaken,0)/rows.length),
   recoveryDamageMean:round(rows.reduce((a,b)=>a+b.recoveryDamage,0)/rows.length),
   // Short boss wins are not thirty-minute clears. Keep the two rates separate.
   survivalRate:rows.every(r=>typeof r.alive==='boolean')
    ?round(100*rows.filter(r=>r.alive).length/rows.length):null,
   encounterWinRate:rows.every(r=>typeof r.won==='boolean')
    ?round(100*rows.filter(r=>r.won).length/rows.length):null,
   clearRate:rows.every(r=>r.fullRun===true)
    ?round(100*rows.filter(r=>r.cleared===true).length/rows.length):null,
   survivalTimeMedian:rows.every(r=>Number.isFinite(r.survivalSeconds))
    ?round(percentile(rows.map(r=>r.survivalSeconds),.5)):null};
 }).sort((a,b)=>a.scenario.localeCompare(b.scenario)||a.build.localeCompare(b.build)||a.ship.localeCompare(b.ship));
}
const COLUMNS=['ship','scenario','build','seed','duration','damage','dps','bossDamage','kills','hits','damageTaken','dashCount','novaCount','recoveryDamage','level','skills','evolutions','synergies','elementFusions','mode','phaseMinutes','secondsPlanned','alive','won','cleared','fullRun','survivalSeconds','playerHp','maxHp','aiMoves','aiDodges','simulationTime','reachedFinalBoss','stopReason','clearCount'];
function csvCell(value){
 const s=String(value??'');
 return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
export function runsToCsv(runs){
 return [COLUMNS.join(','),...runs.map(r=>COLUMNS.map(k=>csvCell(r[k])).join(','))].join('\n')+'\n';
}
export function summaryToCsv(summary){
 const columns=summary.length?Object.keys(summary[0]):['ship','scenario','build','runs','dpsMean','dpsP10','dpsMedian','dpsP90'];
 return [columns.join(','),...summary.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\n')+'\n';
}
