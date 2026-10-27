import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=`
window.__animalV139={
 reset(){
  selectedShip='dog';selectedGameMode='normal';newRun();state('playing');
  game.total=0;game.spawn=999999;game.nextBossAt=999999;game.nextRaidAt=999999;
  game.nextRelicAt=999999;game.nextVacuumAt=999999;
  enemies=[];hostile=[];shots=[];gusts=[];zones=[];particles=[];boss=null;
  player.iframes=100;player.shotTimer=99999;soundOn=false;
 },
 miniature(){
  this.reset();settings.fx='simple';renderHeavyLoad=true;
  const sprites=['chick','chicken','fox','ham','cat','rabbit','dolphin'];
  let filled=0,stroked=0;
  const fill=ctx.fill,stroke=ctx.stroke;
  ctx.fill=function(...args){filled++;return fill.apply(this,args);};
  ctx.stroke=function(...args){stroked++;return stroke.apply(this,args);};
  try{
   sprites.forEach((kind,i)=>drawAnimal(kind,player.x+i*5,player.y,13));
   drawDogEgg({x:player.x,y:player.y,vx:130,vy:0,r:9});
  }finally{ctx.fill=fill;ctx.stroke=stroke;}
  return {sprites,filled,stroked,paths:ANIMAL_PATHS.size};
 },
 dolphin(){
  this.reset();player.windCount=1;
  gusts=[{kind:'cyclone',x:player.x,y:player.y,r:60,vx:90,vy:0,life:2,tick:1,color:'#78ead1'}];
  settings.fx='high';renderHeavyLoad=false;
  let sightings=0;
  const oldFill=ctx.fill, dolphinPath=ANIMAL_PATHS.get('dolphin')||new Path2D(ANIMAL_OUTLINES.dolphin);
  ctx.fill=function(p){if(p===dolphinPath)sightings++;return oldFill.apply(this,arguments)};
  if(!ANIMAL_PATHS.has('dolphin'))ANIMAL_PATHS.set('dolphin',dolphinPath);
  try{render();}finally{ctx.fill=oldFill;}
  const rich=sightings;settings.fx='simple';renderHeavyLoad=true;sightings=0;
  ctx.fill=function(p){if(p===dolphinPath)sightings++;return oldFill.apply(this,arguments)};
  try{render();}finally{ctx.fill=oldFill;}
  return {rich,simple:sightings,windCount:player.windCount};
 },
 hedgehog(){
  this.reset();player.empRadius=108;player.empDps=58;player.empTick=0;
  settings.fx='simple';renderHeavyLoad=true;
  const d=ANIMAL_OUTLINES.hedgehog,coords=[...d.matchAll(/(?:M|L)(-?[0-9.]+) (-?[0-9.]+)/g)].map(x=>[Number(x[1]),Number(x[2])]);
  let outlines=0;const stroke=ctx.stroke;
  ctx.stroke=function(p){if(p instanceof Path2D)outlines++;return stroke.apply(this,arguments);};
  try{drawTeslaField(player);}finally{ctx.stroke=stroke;}
  return {vertices:coords.length,quadrants:[
   coords.some(([x,y])=>x<-.70&&y<-.70),coords.some(([x,y])=>x>.70&&y<-.70),
   coords.some(([x,y])=>x<-.70&&y>.70),coords.some(([x,y])=>x>.70&&y>.70)],
   outlines,emitters:empEmitters(player).length};
 },
 cards(){
  this.reset();
  const ids=['dogHedgehog','dogHedgeSpark','dogDuet','dogNineTail','dogHurricanePlus',
   'dogPawBloom','dogRabbitFrost','dogHamPlus'];
  const before=Object.fromEntries(ids.map(id=>[id,selectable(SKILLS).some(c=>c.id===id)]));
  const h=skillById('dogHedgehog');
  h.apply(player);game.skills[h.id]=1;game.acquisitionLog.push(h.id);
  const after=Object.fromEntries(ids.map(id=>[id,selectable(SKILLS).some(c=>c.id===id)]));
  const dmg=player.empDps,radius=player.empRadius;
  const spark=skillById('dogHedgeSpark');spark.apply(player);
  return {before,after,stackable:h.stackable,initialPulse:{dmg,radius},
   powered:{dmg:player.empDps,radius:player.empRadius}};
 },
 crowded(){
  this.reset();settings.fx='medium';
  player.dogChicks=10;player.rockWalls=12;player.orbit=6;player.windCount=5;
  player.empRadius=270;player.empTrident=1;
  player.dogChickenEvolved=true;
  gusts=Array.from({length:6},(_,i)=>({kind:'cyclone',x:player.x+(i-3)*12,y:player.y,
   r:55,vx:90,vy:20,life:2,tick:1,color:'#78ead1'}));
  shots=Array.from({length:70},(_,i)=>({kind:i%3===0?'dogEgg':i%3===1?'meteor':'rocket',
   x:player.x+(i%10-5)*7,y:player.y+Math.floor(i/10)*9,vx:110,vy:20,r:12,ttl:2,hit:new Set()}));
  const start=performance.now();
  for(let i=0;i<6;i++)render();
  return {elapsed:performance.now()-start,canDraw:ANIMAL_PATHS.size};
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('v13.9 probe anchor moved');
  await route.fulfill({response,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('readable animal bodies, faces and eggs remain visible in SIMPLE mode',async({page})=>{
 const errors=await setup(page);const r=await page.evaluate(()=>window.__animalV139.miniature());
 expect(r.sprites).toHaveLength(7);
 expect(r.filled).toBeGreaterThanOrEqual(20);
 expect(r.stroked).toBeGreaterThanOrEqual(7);
 expect(r.paths).toBeGreaterThanOrEqual(7);expect(errors).toEqual([]);
});
test('dolphin cyclone is large centrally with an orbit companion only in rich FX',async({page})=>{
 const errors=await setup(page);const r=await page.evaluate(()=>window.__animalV139.dolphin());
 expect(r.rich).toBe(2);expect(r.simple).toBe(1);expect(errors).toEqual([]);
});
test('hedgehog EMP has visible quills on all sides with original single circular emitter',async({page})=>{
 const errors=await setup(page);const r=await page.evaluate(()=>window.__animalV139.hedgehog());
 expect(r.vertices).toBeGreaterThan(45);
 expect(r.quadrants).toEqual([true,true,true,true]);
 expect(r.outlines).toBeGreaterThanOrEqual(1);expect(r.emitters).toBe(1);
 expect(errors).toEqual([]);
});
test('one-time EMP unlock and prerequisite guards reject ineffective duplicate offerings',async({page})=>{
 const errors=await setup(page);const r=await page.evaluate(()=>window.__animalV139.cards());
 expect(r.before.dogHedgehog).toBe(true);
 for(const id of ['dogHedgeSpark','dogDuet','dogNineTail','dogHurricanePlus',
 'dogPawBloom','dogRabbitFrost','dogHamPlus'])expect(r.before[id]).toBe(false);
 expect(r.after.dogHedgehog).toBe(false);expect(r.after.dogHedgeSpark).toBe(true);
 expect(r.stackable).toBe(false);
 expect(r.powered.dmg).toBeGreaterThan(r.initialPulse.dmg);
 expect(r.powered.radius).toBeGreaterThan(r.initialPulse.radius);
 expect(errors).toEqual([]);
});
test('many simultaneous dog sprites and effects render without runtime errors',async({page})=>{
 const errors=await setup(page);const r=await page.evaluate(()=>window.__animalV139.crowded());
 expect(r.elapsed).toBeLessThan(5000);expect(r.canDraw).toBeGreaterThan(4);
 expect(errors).toEqual([]);
});
