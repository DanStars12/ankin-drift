// Execute the shipped search/geometry kernels without replacing them with a toy simulation.
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {parse} from 'acorn';
export function combatKernelHarness(html=readFileSync(new URL('../index.html',import.meta.url),'utf8')){
 const source=html.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 const body=parse(source,{ecmaVersion:'latest'}).body[0].expression.callee.body.body,defs=new Map();
 for(const n of body){if(n.type==='FunctionDeclaration')defs.set(n.id.name,source.slice(n.start,n.end));
  if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')defs.set(d.id.name,n.kind+' '+source.slice(d.start,d.end)+';');}
 const ctx=createContext({W:1280,H:800,enemies:[],boss:null,game:{raid:null,ultimateParts:[]}});
 for(const name of ['SPATIAL_CELL','enemyIndex','enemyMaxRadius','enemyIndexReady','EMPTY_ENGAGE_WALLS','hasRaidEffect','activeEngageWalls','engageImpact','ultimatePartsAlive','refreshEnemyIndex','trimEnemyIndex','circleCandidates','segmentCandidates','isVisibleAutoTarget','nearTarget']){
  if(!defs.has(name)){if(['EMPTY_ENGAGE_WALLS','trimEnemyIndex'].includes(name))continue;throw Error('Missing shipped kernel '+name);}
  runInContext(defs.get(name),ctx);
 }
 return {ctx,eval:code=>runInContext(code,ctx)};
}
