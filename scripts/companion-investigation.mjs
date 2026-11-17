// Disposable CI-only fixture; never used by the shipped app.
import {readFileSync,writeFileSync} from 'node:fs';
const variant=process.argv[2];
if(!['cleave','coverage','growth','coverage-growth'].includes(variant))throw Error('Unknown fixture');
let source=readFileSync('phantom-frame.js','utf8');
function replace(from,to){if(source.split(from).length!==2)throw Error('Fixture anchor changed: '+from);source=source.replace(from,to);}
if(variant.includes('coverage')){replace('range:85+','range:100+');replace('cap:3+','cap:4+');}
if(variant.includes('growth')){replace('p.maxHp+=gain*7;p.hp=Math.min(p.maxHp,p.hp+gain*7);p.shieldMax+=gain*3;p.shield=Math.min(p.shieldMax,p.shield+gain*3);','p.maxHp+=gain*9;p.hp=Math.min(p.maxHp,p.hp+gain*9);p.shieldMax+=gain*4;p.shield=Math.min(p.shieldMax,p.shield+gain*4);');}
writeFileSync('phantom-frame.js',source);
