import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=String.raw`window.__fxAudit={
 shape(type,fx,heavy=false){
  const oldFx=settings.fx,oldHeavy=renderHeavyLoad;
  const originals={arc:ctx.arc,lineTo:ctx.lineTo,moveTo:ctx.moveTo,stroke:ctx.stroke,fill:ctx.fill};
  const arcs=[],strokes=[],segments=[];settings.fx=fx;renderHeavyLoad=heavy;
  ctx.arc=function(...args){arcs.push({radius:args[2],sweep:args[4]-args[3]});return originals.arc.apply(this,args)};
  ctx.lineTo=function(x,y){segments.push([x,y]);return originals.lineTo.call(this,x,y)};
  ctx.stroke=function(...args){strokes.push(String(this.strokeStyle).toLowerCase());return originals.stroke.apply(this,args)};
  try{
   if(type==='cyclone')drawCyclone({x:W*.45,y:H*.4,r:80,life:2.6,color:'#72e9d2'});
   else drawTeslaField({x:W*.45,y:H*.4,empRadius:480});
  }finally{
   ctx.arc=originals.arc;ctx.lineTo=originals.lineTo;ctx.moveTo=originals.moveTo;ctx.stroke=originals.stroke;ctx.fill=originals.fill;
   settings.fx=oldFx;renderHeavyLoad=oldHeavy;
  }
  return{arcs,segments,strokes};
 },
 copy(){return{
  windEngine:skillById('windEngine').desc,windTwin:skillById('windTwin').desc,
  windLegend:skillById('windLegend').desc,emp:skillById('empPulse').desc,
  drillIce:skillById('rDrillIce').desc,
  missile:attrDetails('ミサイル'),pulse:attrDetails('パルス'),
  wind:attrDetails('属性：風'),thunder:attrDetails('属性：雷')
 }},
 freezeCap(){const p=initialP();p.freezeChance=.81;skillById('iceLock').apply(p);return p.freezeChance;}
};`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('FX audit injection anchor changed');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');
 return errors;
}
test('circular cyclone keeps a radius-accurate full ring in every preset, including SIMPLE',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>['simple','low','medium','high'].map(fx=>window.__fxAudit.shape('cyclone',fx)));
 for(const value of result){
  expect(value.arcs.some(a=>a.radius===80&&a.sweep>6.27)).toBe(true);
  expect(value.segments).toHaveLength(0); // no tornado ribbon polygons
 }
 expect(result[0].arcs.length).toBeLessThan(result[3].arcs.length);
 expect(errors).toEqual([]);
});
test('Tesla EMP stays visibly electric at every quality and its ring matches the 290 cap',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>['simple','low','medium','high'].map(fx=>window.__fxAudit.shape('emp',fx)));
 for(const value of result){
  expect(value.arcs.some(a=>a.radius===290&&a.sweep>6.27)).toBe(true);
  expect(value.segments.length).toBeGreaterThanOrEqual(6);
  expect(value.strokes.some(s=>s.includes('rgb(232, 252, 255)')||s.includes('#e8fcff'))).toBe(true);
 }
 expect(result[0].segments.length).toBeLessThan(result[3].segments.length);
 const heavy=await page.evaluate(()=>window.__fxAudit.shape('emp','high',true));
 expect(heavy.segments.length).toBeLessThan(result[3].segments.length);
 expect(errors).toEqual([]);
});
test('tooltip skill-family boundaries and freeze upper bound match the actual game rules',async({page})=>{
 const errors=await setup(page);
 const result=await page.evaluate(()=>({copy:window.__fxAudit.copy(),freeze:window.__fxAudit.freezeCap()}));
 expect(result.freeze).toBeLessThanOrEqual(.85);
 expect(result.copy.windTwin).toContain('同時発射は最大4個');
 expect(result.copy.windLegend).toContain('同時4個');
 expect(result.copy.windEngine).toContain('未取得なら1発追加');
 expect(result.copy.emp).toContain('最大半径290');
 expect(result.copy.drillIce).not.toContain('完全凍結');
 expect(JSON.stringify(result.copy.missile)).not.toContain('燃焼やマグマ');
 expect(JSON.stringify(result.copy.pulse)).toContain('290');
 expect(JSON.stringify(result.copy.thunder)).toContain('電磁パルス');
 expect(errors).toEqual([]);
});
