import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {createContext,runInContext} from 'node:vm';
export function renderBatchSources(){
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const source=html.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 const body=parse(source,{ecmaVersion:'latest'}).body[0].expression.callee.body.body;
 const render=body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='render');
 const drawing=source.slice(render.start,render.end);
 const gridStart=drawing.indexOf("ctx.strokeStyle='#5b9cb418'");
 const gridEnd=drawing.indexOf('for(let si=0;',gridStart);
 if(gridStart<0||gridEnd<0)throw Error('Missing native backdrop grid');
 const result={drawBackdropGrid:'function drawBackdropGrid(g,W,H,t){'+drawing.slice(gridStart,gridEnd).replaceAll('ctx.','g.')+'}'};
 const hatch=source.slice(render.start,render.end).match(/for\(let x=wall\.x-wall\.h;[^\n]+ctx\.stroke\(\)\}/);
 if(!hatch)throw Error('Missing native ENGAGE hatching');
 result.drawEngageHatching='function drawEngageHatching(g,wall){'+hatch[0].replaceAll('ctx.','g.')+'}';
 return result;
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
