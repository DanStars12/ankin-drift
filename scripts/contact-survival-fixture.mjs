// Unseen-seed confirmation of a frozen candidate; no ability tuning here.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const variant=process.argv[2];if(!['baseline','candidate'].includes(variant))throw Error('Unknown variant');
if(variant==='baseline')writeFileSync('index.html',execFileSync('git',['show','d3750ec47dc749fd16fdaf85f6928727d798a6b8:index.html']));
const first=Number(process.env.ANKIN_FULL_START_SEED);if(first!==57)throw Error('Confirmation seeds are locked at 57-76');
const path='tests/v13-36-arsenal.spec.mjs';let source=readFileSync(path,'utf8');const anchor='(_,i)=>17+i';if(source.split(anchor).length!==2)throw Error('Seed anchor changed');writeFileSync(path,source.replace(anchor,'(_,i)=>'+first+'+i'));
