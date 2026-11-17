// Disposable CI-only fixtures. Production source is never updated by this script.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const variant=process.argv[2];
if(!['baseline','baseline-growth','baseline-defense','relic-defense','relic-reserve'].includes(variant))throw Error('Unknown fixture');
const current=readFileSync('phantom-frame.js','utf8');
let source=execFileSync('git',['show','12f26bb06db939a635c03ae5c2abf01564ca1fd0:phantom-frame.js'],{encoding:'utf8'});
function replace(from,to){if(source.split(from).length!==2)throw Error('Fixture anchor changed: '+from);source=source.replace(from,to);}
if(variant.startsWith('relic')){const start=source.indexOf('function slash('),end=source.indexOf('// Bounded secondary area attack:');source=source.slice(0,start)+current.slice(current.indexOf('function slash('),current.indexOf('// Bounded secondary area attack:'))+source.slice(end);replace('target=!nova&&f.target&&','target=!nova&&f.target?.type===\'relic\'&&f.target&&');}
if(variant.endsWith('growth')||variant.endsWith('defense'))replace('p.maxHp+=gain*7;p.hp=Math.min(p.maxHp,p.hp+gain*7);p.shieldMax+=gain*3;p.shield=Math.min(p.shieldMax,p.shield+gain*3);','p.maxHp+=gain*9;p.hp=Math.min(p.maxHp,p.hp+gain*9);p.shieldMax+=gain*4;p.shield=Math.min(p.shieldMax,p.shield+gain*4);');
if(variant.endsWith('defense')){let html=readFileSync('index.html','utf8');const from='p.shieldMax=15;p.shield=15;p.shieldRecharge=2;AnkinPhantom.init(p);';if(html.split(from).length!==2)throw Error('Preset anchor changed');html=html.replace(from,'p.shieldMax=35;p.shield=35;p.shieldRecharge=3;AnkinPhantom.init(p);');writeFileSync('index.html',html);}
writeFileSync('phantom-frame.js',source);

const first=Number(process.env.ANKIN_FULL_START_SEED||17);if(!Number.isInteger(first)||first<1||first>1000)throw Error('Invalid seed start');
const path='tests/v13-36-arsenal.spec.mjs';let testSource=readFileSync(path,'utf8');const anchor='(_,i)=>17+i';if(testSource.split(anchor).length!==2)throw Error('Seed anchor changed');writeFileSync(path,testSource.replace(anchor,'(_,i)=>'+first+'+i'));
