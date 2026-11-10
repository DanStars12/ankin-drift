import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=`
window.__hedgehogProbe={
 reset(ship='dog',split=false){
  selectedShip=ship;selectedGameMode='normal';newRun();state('playing');
  game.total=0;game.spawn=999999;game.nextBossAt=999999;game.nextRaidAt=999999;
  game.nextRelicAt=999999;game.nextVacuumAt=999999;
  enemies=[];shots=[];hostile=[];gusts=[];zones=[];particles=[];boss=null;
  player.iframes=100;player.shotTimer=99999;player.empRadius=116;
  player.empDps=100;player.empTick=0;player.empTrident=split?1:0;
  soundOn=false;refreshEnemyIndex();
 },
 scan(ship='dog',split=false,fx='medium'){
  this.reset(ship,split);
  settings.fx=fx;renderHeavyLoad=fx==='simple';
  const originalStroke=ctx.stroke,originalFill=ctx.fill,originalArc=ctx.arc;
  const data={paths:0,outlineFill:0,outlineStroke:0,purple:false,largeCircle:0,
   cachedBefore:ANIMAL_PATHS.has('hedgehog'),fx,emitters:empEmitters(player).length,
   originalRadius:Math.min(290,player.empRadius)};
  ctx.stroke=function(path){
   if(path instanceof Path2D){
    data.paths++;data.outlineStroke++;
    if(path!==ANIMAL_PATHS.get('hedgehog'))data.cachedCorrect=false;
    if(ctx.strokeStyle===ELEMENTS.thunder.color||ctx.strokeStyle==='#f2ddff')data.purple=true;
   }
   return originalStroke.apply(this,arguments);
  };
  ctx.fill=function(path){
   if(path instanceof Path2D){data.outlineFill++;if(path!==ANIMAL_PATHS.get('hedgehog'))data.cachedCorrect=false;}
   return originalFill.apply(this,arguments);
  };
  ctx.arc=function(x,y,r){if(r>80)data.largeCircle++;return originalArc.apply(this,arguments);};
  data.cachedCorrect=true;
  try{drawTeslaField(player);drawTeslaField(player);}
  finally{ctx.stroke=originalStroke;ctx.fill=originalFill;ctx.arc=originalArc;}
  data.cachedAfter=ANIMAL_PATHS.has('hedgehog');
  data.pathCount=ANIMAL_PATHS.size;
  return data;
 },
 offscreen(){
  this.reset('dog');const oldX=player.x,oldY=player.y;
  player.x=W+600;player.y=H+600;
  let paths=0;const oldStroke=ctx.stroke;
  ctx.stroke=function(p){if(p instanceof Path2D)paths++;return oldStroke.apply(this,arguments);};
  let emitter=empEmitters(player)[0];
  try{drawTeslaField(player);}finally{ctx.stroke=oldStroke;player.x=oldX;player.y=oldY;}
  return {paths,x:emitter.x,y:emitter.y,r:emitter.empRadius};
 },
 hits(){
  this.reset('dog');
  player.empRadius=96;player.empDps=100;player.empTick=0;
  const e=spawnEnemy('drone',{x:player.x+107,y:player.y});
  e.r=12;e.hp=e.maxHp=10000;refreshEnemyIndex();
  const before=e.hp;tickIndependentElements(.016);const inside=before-e.hp;
  e.x=player.x+109;e.y=player.y;e.hp=e.maxHp;
  player.empTick=0;refreshEnemyIndex();
  tickIndependentElements(.016);const outside=e.maxHp-e.hp;
  this.reset('dog',true);player.empRadius=160;player.empDps=100;player.empTick=0;
  const overlap=spawnEnemy('drone',{x:player.x,y:player.y});overlap.r=150;
  overlap.hp=overlap.maxHp=10000;refreshEnemyIndex();
  const fields=empEmitters(player);tickIndependentElements(.016);
  const trident=overlap.maxHp-overlap.hp;
  return {inside,outside,trident,fields:fields.length,expectedSingle:100*.24*1.18,
   hitLogic:tickIndependentElements.toString().includes('(r+e.r)**2')};
 },
 stress(){
  this.reset('dog',true);player.empRadius=290;settings.fx='high';
  const start=performance.now();
  for(let i=0;i<12;i++){renderHeavyLoad=i%2===0;drawTeslaField(player);}
  return {elapsed:performance.now()-start,cached:ANIMAL_PATHS.has('hedgehog')};
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('EMP test hook anchor changed');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('dog EMP silhouette replaces round Tesla field with cached purple hedgehog',async({page})=>{
 const errors=await setup(page);
 const r=await page.evaluate(()=>window.__hedgehogProbe.scan());
 expect(r.emitters).toBe(1);expect(r.outlineFill).toBe(2);
 expect(r.outlineStroke).toBeGreaterThanOrEqual(2);
 expect(r.purple).toBe(true);expect(r.cachedAfter).toBe(true);
 expect(r.cachedCorrect).toBe(true);expect(r.largeCircle).toBe(0);
 expect(errors).toEqual([]);
});
test('generic ship keeps circular blue Tesla pulse without hedgehog sprite',async({page})=>{
 const errors=await setup(page);
 const r=await page.evaluate(()=>window.__hedgehogProbe.scan('shot'));
 expect(r.paths).toBe(0);expect(r.outlineFill).toBe(0);
 expect(r.largeCircle).toBeGreaterThanOrEqual(2);
 expect(errors).toEqual([]);
});
test('trident renders each small field as a hedgehog, including on simple mode',async({page})=>{
 const errors=await setup(page);
 const multi=await page.evaluate(()=>window.__hedgehogProbe.scan('dog',true));
 const simple=await page.evaluate(()=>window.__hedgehogProbe.scan('dog',true,'simple'));
 expect(multi.emitters).toBe(3);expect(multi.outlineFill).toBe(6);
 expect(simple.emitters).toBe(3);expect(simple.outlineFill).toBe(6);
 expect(simple.outlineStroke).toBe(6);
 expect(multi.largeCircle).toBe(0);expect(simple.largeCircle).toBe(0);
 expect(errors).toEqual([]);
});
test('original circular radius and trident single-hit damage are unchanged',async({page})=>{
 const errors=await setup(page);
 const r=await page.evaluate(()=>window.__hedgehogProbe.hits());
 expect(r.hitLogic).toBe(true);expect(r.inside).toBeGreaterThan(0);
 expect(r.outside).toBe(0);
 expect(r.fields).toBe(3);
 expect(r.trident).toBeGreaterThan(0);
 expect(r.trident).toBeLessThan(r.expectedSingle*2);
 expect(errors).toEqual([]);
});
test('offscreen culling and stress render keep EMP path cached',async({page})=>{
 const errors=await setup(page);
 const a=await page.evaluate(()=>window.__hedgehogProbe.offscreen());
 expect(a.paths).toBe(0);
 const b=await page.evaluate(()=>window.__hedgehogProbe.stress());
 expect(b.cached).toBe(true);expect(Number.isFinite(b.elapsed)).toBe(true);
 expect(errors).toEqual([]);
});
