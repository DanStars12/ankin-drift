// CDP durations and CPU timeDeltas are microseconds. Trace durations are wall time,
// may overlap, and must not be described as CPU utilization or added across threads.
export function intervalCoverageMs(intervals){
 const sorted=intervals.map(([a,b])=>{if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)throw Error('Invalid interval');return[a,b]}).sort((a,b)=>a[0]-b[0]);
 let end=-Infinity,total=0;for(const [a,b]of sorted){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b)}return total/1000;
}
export function summarizeTrace(events){
 if(!Array.isArray(events))throw Error('Trace events must be an array');
 const threads=new Map(),names=new Map(),phases={};let invalidCompleteEvents=0;
 for(const e of events){
  phases[e.ph]=(phases[e.ph]||0)+1;const key=e.pid+':'+e.tid;
  if(e.ph==='M'&&e.name==='thread_name')names.set(key,e.args?.name||'unknown');
  if(e.ph!=='X')continue;
  if(!Number.isFinite(e.ts)||!Number.isFinite(e.dur)||e.dur<0){invalidCompleteEvents++;continue}
  let thread=threads.get(key);if(!thread){thread={key,intervals:[],events:new Map()};threads.set(key,thread)}
  thread.intervals.push([e.ts,e.ts+e.dur]);
  let row=thread.events.get(e.name);if(!row){row={name:e.name,count:0,inclusiveMs:0,maxMs:0};thread.events.set(e.name,row)}
  row.count++;row.inclusiveMs+=e.dur/1000;row.maxMs=Math.max(row.maxMs,e.dur/1000);
 }
 return {eventCount:events.length,invalidCompleteEvents,phases,scope:'complete X events only; B/E and async events retained in raw trace, not aggregated',
  warning:'Inclusive event durations overlap. Thread coverage is wall time, not CPU utilization. Never sum across threads.',
  threads:[...threads.values()].map(t=>({key:t.key,name:names.get(t.key)||'unknown',coveredMs:intervalCoverageMs(t.intervals),
   top:[...t.events.values()].sort((a,b)=>b.inclusiveMs-a.inclusiveMs).slice(0,12)})).sort((a,b)=>b.coveredMs-a.coveredMs)};
}
export function summarizeCpu(profile){
 const {nodes,samples,timeDeltas}=profile;
 if(!Array.isArray(nodes)||!Array.isArray(samples)||!Array.isArray(timeDeltas)||samples.length!==timeDeltas.length)throw Error('Invalid CPU profile');
 const byId=new Map(nodes.map(n=>[n.id,n.callFrame])),rows=new Map();let sampledMs=0;
 for(let i=0;i<samples.length;i++){
  const frame=byId.get(samples[i]),delta=timeDeltas[i];if(!frame||!Number.isFinite(delta)||delta<0)throw Error('Invalid CPU sample');
  const key=JSON.stringify([frame.functionName,frame.url,frame.lineNumber]);let row=rows.get(key);
  if(!row){row={name:frame.functionName||'(anonymous)',url:frame.url||'',line:(frame.lineNumber??-1)+1,selfMs:0,samples:0};rows.set(key,row)}
  row.selfMs+=delta/1000;row.samples++;sampledMs+=delta/1000;
 }
 const states=['(idle)','(program)','(garbage collector)','(root)'];
 return {samples:samples.length,sampledMs,warning:'Sample-weighted estimates, not exact function timings; idle/program are not GPU attribution.',
  states:[...rows.values()].filter(r=>states.includes(r.name)).sort((a,b)=>b.selfMs-a.selfMs),
  top:[...rows.values()].filter(r=>!states.includes(r.name)).sort((a,b)=>b.selfMs-a.selfMs).slice(0,20)};
}
