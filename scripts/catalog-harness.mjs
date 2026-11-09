// Evaluates the shipped catalog (not a copy) without DOM or browser privileges.
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {parse} from 'acorn';
export function catalogHarness(html=readFileSync(new URL('../index.html',import.meta.url),'utf8')){
 const source=html.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 const ast=parse(source,{ecmaVersion:'latest'}),body=ast.body[0].expression.callee.body.body;
 const declaration=name=>{
  for(const n of body){
   if(n.type==='FunctionDeclaration'&&n.id.name===name)return source.slice(n.start,n.end);
   if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.name===name)return n.kind+' '+source.slice(d.start,d.end)+';';
  }
  throw Error('Missing shipped declaration '+name);
 };
 const ctx=createContext({W:1280,H:800,selectedShip:'shot',player:null,game:{skills:{},powers:{},legends:{},uniques:{},relics:{},acquisitionLog:[],elementCombos:[],sealedElements:[]}});
 runInContext(readFileSync(new URL('../skill-arsenal.js',import.meta.url),'utf8'),ctx);
 for(const id of ['SHIPS','ELEMENTS','initialP','ALL_SKILL_DEFS','elementFromCard'])runInContext(declaration(id),ctx);
 const start=source.indexOf('const UPGRADE_GAIN_SCALE='),end=source.indexOf('const DRILL_RANGED_ONLY=');
 if(start<0||end<start)throw Error('Catalog boundaries changed');
 runInContext(source.slice(start,end),ctx);
 for(const id of ['DRILL_RANGED_ONLY','fitsShip','rewardAlreadyTaken','SKILL_CAP_CHECKS','skillHasRoom','selectable','isSealedCard','offerCandidatePool'])runInContext(declaration(id),ctx);
 runInContext('globalThis.catalog=ALL_SKILL_DEFS();globalThis.normal=SKILLS;globalThis.recipes=FUSIONS;globalThis.initial=initialP;globalThis.eligible=selectable;',ctx);
 return {ctx,eval:code=>runInContext(code,ctx)};
}
