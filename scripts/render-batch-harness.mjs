import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {createContext,runInContext} from 'node:vm';
export function renderBatchSources(){
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const source=html.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 const body=parse(source,{ecmaVersion:'latest'}).body[0].expression.callee.body.body;
 return Object.fromEntries(['drawBackdropGrid','drawEngageHatching'].map(name=>{
  const node=body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  if(!node)throw Error('Missing shipped renderer '+name);
  return [name,source.slice(node.start,node.end)];
 }));
}
// Previous production renderer, retained as the independent Canvas reference.
export function legacyGrid(g,width,height,time){
 g.strokeStyle='#5b9cb418';g.lineWidth=1;const off=(time*11)%61;
 for(let x=off-61;x<width;x+=61){g.beginPath();g.moveTo(x,0);g.lineTo(x,height);g.stroke()}
 for(let y=off-61;y<height;y+=61){g.beginPath();g.moveTo(0,y);g.lineTo(width,y);g.stroke()}
}
export function legacyHatching(g,wall){
 for(let x=wall.x-wall.h;x<wall.x+wall.w+wall.h;x+=15){g.beginPath();g.moveTo(x,wall.y);g.lineTo(x+wall.h,wall.y+wall.h);g.stroke()}
}
export function renderBatchHarness(){
 const ctx=createContext({});for(const source of Object.values(renderBatchSources()))runInContext(source,ctx);
 return {grid:runInContext('drawBackdropGrid',ctx),hatching:runInContext('drawEngageHatching',ctx)};
}
