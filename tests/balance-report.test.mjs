import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
import {BALANCE_AI_HARNESS} from '../scripts/balance-ai-harness.mjs';
import {BALANCE_HARNESS} from '../scripts/balance-harness.mjs';
import {percentile,summarizeRuns,runsToCsv,summaryToCsv} from '../scripts/balance-report.mjs';

test('balance lab percentiles interpolate and reject invalid bounds',()=>{
 assert.equal(percentile([9,3,7,1,5],.5),5);
 assert.equal(percentile([10,20],.1),11);
 assert.equal(percentile([], .5),null);
 assert.throws(()=>percentile([1],2),/Percentile/);
});
test('grouping is stable and never mutates source rows',()=>{
 const data=[1,2,3].map((x)=>({schema:'ankin-balance-v1',ship:'dog',scenario:'boss',build:'base',
  seed:x,duration:10,dps:x*100,kills:x,damageTaken:0,recoveryDamage:0}));
 const before=JSON.stringify(data),groups=summarizeRuns(data);
 assert.equal(groups.length,1);assert.equal(groups[0].dpsMean,200);
 assert.equal(groups[0].dpsMedian,200);
 assert.equal(groups[0].dpsP10,120);assert.equal(groups[0].dpsP90,280);
 assert.equal(groups[0].killsMean,2);assert.equal(groups[0].survivalRate,null);assert.equal(groups[0].clearRate,null);assert.equal(before,JSON.stringify(data));
 assert.throws(()=>summarizeRuns([{...data[0],schema:'wrong'}]),/schema/);
});
test('csv writing includes headers and escapes commas, quotes and newline strings',()=>{
 const line=runsToCsv([{ship:'shot,"fast"\nline',scenario:'boss',build:'base',seed:1,duration:10,dps:5}]);
 assert(line.startsWith('ship,scenario,build,seed,'));
 assert(line.includes('"shot,""fast""\nline"'));
 assert(line.endsWith('\n'));
 assert(summaryToCsv([]).includes('dpsMedian'));
});

test('developer-only injected code is parsable before launching any browser',()=>{
 for(const source of [BALANCE_HARNESS,BALANCE_AI_HARNESS]){
  assert.doesNotThrow(()=>parse(source,{ecmaVersion:'latest',sourceType:'script'}));
 }
});
test('survival rate and 30-minute clear rate must never be confused',()=>{
 const first={schema:'ankin-balance-v1',ship:'shot',scenario:'live-boss',build:'representative',
  duration:10,dps:50,kills:2,damageTaken:10,recoveryDamage:0,alive:true,won:true,cleared:false,survivalSeconds:10};
 const short=summarizeRuns([first,{...first,alive:false,won:false,survivalSeconds:4}])[0];
 assert.equal(short.survivalRate,50);
 assert.equal(short.encounterWinRate,50);
 assert.equal(short.clearRate,null);
 const full=summarizeRuns([{...first,scenario:'full-30m',fullRun:true,cleared:true},
  {...first,scenario:'full-30m',fullRun:true,alive:false,cleared:false}])[0];
 assert.equal(full.clearRate,50);
});
