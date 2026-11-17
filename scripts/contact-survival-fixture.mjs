// Disposable balance fixture, never loaded by the public app.
import {readFileSync,writeFileSync} from 'node:fs';
const variant=process.argv[2];const rates={baseline:[0,0],light:[.15,.20],balanced:[.25,.30],strong:[.35,.40]};if(!rates[variant])throw Error('Unknown variant');
const [dog,phantom]=rates[variant];
const path='index.html';let source=readFileSync(path,'utf8');const from="*(p.shipType==='drill'?1-clamp(p.drillArmor||0,0,.35):1)";
if(source.split(from).length!==2)throw Error('Contact anchor changed');
source=source.replace(from,"*(p.shipType==='drill'?1-clamp(p.drillArmor||0,0,.35):g.gameMode==='normal'&&p.shipType==='dog'?"+(1-dog)+":g.gameMode==='normal'&&p.shipType==='phantom'?"+(1-phantom)+":1)");writeFileSync(path,source);
const first=Number(process.env.ANKIN_FULL_START_SEED||17);if(!Number.isInteger(first)||first<1||first>1000)throw Error('Invalid start seed');
const tp='tests/v13-36-arsenal.spec.mjs';let test=readFileSync(tp,'utf8');const anchor='(_,i)=>17+i';if(test.split(anchor).length!==2)throw Error('Seed anchor changed');writeFileSync(tp,test.replace(anchor,'(_,i)=>'+first+'+i'));
