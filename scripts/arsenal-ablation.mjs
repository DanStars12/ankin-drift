// CI-only diagnostic fixtures. Never imported by the shipped game.
import {readFileSync,writeFileSync} from 'node:fs';
const variant=process.argv[2];
if(!['no-limits','legacy-pools','legacy-control','legacy-normal','legacy-upper','limit-normal'].includes(variant))throw Error('Unknown ablation variant');
let html=readFileSync('index.html','utf8');
function replaceOnce(from,to){
 if(html.split(from).length!==2)throw Error('Ablation anchor changed: '+from.slice(0,60));
 html=html.replace(from,to);
}
if(['no-limits','legacy-control'].includes(variant)){
 const start=html.indexOf('// Bound repeated ordinary defense/offense spikes;');
 const end=html.indexOf('const ARSENAL_FUSIONS=',start);
 if(start<0||end<start)throw Error('Stack-limit fixture boundaries changed');
 html=html.slice(0,start)+html.slice(end);
}
if(['legacy-pools','legacy-control','legacy-normal','legacy-upper'].includes(variant)){
 const condition=variant==='legacy-normal'?"kind!=='normal'||!c.arsenal":variant==='legacy-upper'?"kind==='normal'||!c.arsenal":'!c.arsenal';
 replaceOnce('const eligible=selectable(source).filter(', 'const eligible=selectable(source).filter(c=>'+condition+').filter(');
}
if(variant==='limit-normal')replaceOnce('const possible=pool.filter(c=>!used.has(c.id));',
 "const possible=pool.filter(c=>!used.has(c.id)&&(kind!=='normal'||!c.arsenal||!options.some(o=>o.arsenal)||!pool.some(o=>!o.arsenal&&!used.has(o.id))));");
writeFileSync('index.html',html);
console.log('Diagnostic fixture only: '+variant);
