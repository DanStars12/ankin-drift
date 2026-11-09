// CI-only diagnostic fixtures. Never imported by the shipped game.
import {readFileSync,writeFileSync} from 'node:fs';
const variant=process.argv[2];
if(!['no-limits','legacy-pools','legacy-control'].includes(variant))throw Error('Unknown ablation variant');
let html=readFileSync('index.html','utf8');
function replaceOnce(from,to){
 if(html.split(from).length!==2)throw Error('Ablation anchor changed: '+from.slice(0,60));
 html=html.replace(from,to);
}
if(variant!=='legacy-pools'){
 const start=html.indexOf('// Bound repeated ordinary defense/offense spikes;');
 const end=html.indexOf('const ARSENAL_FUSIONS=',start);
 if(start<0||end<start)throw Error('Stack-limit fixture boundaries changed');
 html=html.slice(0,start)+html.slice(end);
}
if(variant!=='no-limits')replaceOnce('const eligible=selectable(source).filter(', 'const eligible=selectable(source).filter(c=>!c.arsenal).filter(');
writeFileSync('index.html',html);
console.log('Diagnostic fixture only: '+variant);
