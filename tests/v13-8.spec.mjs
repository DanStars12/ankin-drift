
import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=`
window.__neonProbe={
 reset(){
  selectedShip='dog';selectedGameMode='normal';newRun();state('playing');
  game.total=0;game.spawn=999999;game.nextBossAt=999999;game.nextRaidAt=999999;
  game.nextRelicAt=999999;game.nextVacuumAt=999999;
  enemies=[];shots=[];hostile=[];gusts=[];zones=[];boss=null;
  player.iframes=100;player.shotTimer=99999;soundOn=false;
 },
 outlines(){
  this.reset();
  const kinds=Object.keys(ANIMAL_OUTLINES),before=ANIMAL_PATHS.size,paint={fill:0,stroke:0};
  const oldFill=ctx.fill,oldStroke=ctx.stroke;
  ctx.fill=function(...a){paint.fill++;return oldFill.apply(this,a)};
  ctx.stroke=function(...a){paint.stroke++;return oldStroke.apply(this,a)};
  try{
   for(const kind of kinds)drawAnimal(kind,player.x,player.y,14,0);
   drawDogEgg({x:player.x,y:player.y,vx:50,vy:30,r:7});
  }finally{ctx.fill=oldFill;ctx.stroke=oldStroke;}
  return {kinds,paint,cache:ANIMAL_PATHS.size,before,
   dogPath:ANIMAL_OUTLINES.dog,dolphinPath:ANIMAL_OUTLINES.dolphin};
 },
 bone(){
  this.reset();shoot();const b=shots[0],start=b.spinAngle,rate=b.spinRate;
  drive(.20);const delta=b.spinAngle-start;
  const seen={outbound:!b.returning,returning:false};
  for(let i=0;i<230;i++){drive(.016);if(b.returning)seen.returning=true;}
  const vanished=!shots.includes(b);
  this.reset();player.dogBones=8;player.dogBoneSpeed=235;player.dogBoneRange=480;
  fireDogBones();const enhanced=shots[0];
  return {rate,delta,seen,vanished,enhancedTtl:enhanced.ttl,enhancedCount:shots.length};
 },
 fusion(){
  this.reset();game.level=12;game.skills.dogHurricane=1;game.skills.dogFox=1;
  game.acquisitionLog=['dogHurricane','dogFox'];restorePlayerBuild();
  const before=player.windCount;
  gusts=[{kind:'cyclone',x:player.x,y:player.y,r:48,vx:0,vy:0,life:2,tick:1},
   {kind:'fireTornado',x:player.x,y:player.y,r:48,vx:0,vy:0,life:2,tick:1}];
  state('elementChoice');elementChoice={main:'fire'};
  const available=fusionSubChoices('fire');
  selectElementFusion('wind');
  return {before,available,after:player.windCount,orbit:player.orbit,
   gustKinds:gusts.map(g=>g.kind),sealed:game.sealedElements.slice(),
   combos:game.elementCombos.map(c=>[c.main,c.sub]),mode};
 },
 crowded(){
  this.reset();player.dogChicks=10;player.dogChickenEvolved=true;player.orbit=10;
  player.rockWalls=18;player.empRadius=120;player.windCount=7;
  for(let i=0;i<60;i++)shots.push({kind:i%2?'dogEgg':'bone',x:player.x+(i%10-5)*7,
   y:player.y+Math.floor(i/10)*7,vx:140,vy:45,r:7,ttl:2,
   spinAngle:i*.12,spinRate:2,returning:false,hit:new Set()});
  for(let i=0;i<7;i++)gusts.push({kind:'cyclone',x:player.x+(i-3)*10,y:player.y,
   r:49,vx:0,vy:0,life:2,tick:1,color:'#78ead1'});
  const time=performance.now();
  for(let i=0;i<6;i++)render();
  return {ms:performance.now()-time,animalKinds:ANIMAL_PATHS.size};
 }
};
`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  if(!html.includes(anchor))throw Error('Neon regression hook insertion point moved');
  await route.fulfill({response:res,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('neon outlines use stroke only and path cache is shared by all animal kinds',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__neonProbe.outlines());
 expect(r.kinds).toHaveLength(9);
 expect(r.kinds).toContain('dolphin');expect(r.kinds).toContain('chicken');
 expect(r.paint.fill).toBe(0);expect(r.paint.stroke).toBe(10);
 expect(r.cache).toBe(9);
 expect(r.dogPath).not.toMatch(/eye|mouth/i);
 expect(r.dolphinPath).toContain('L -1.43 -.40');
 expect(errors).toEqual([]);
});
test('dog bone spins slowly independently of travel and returns from upgraded range',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__neonProbe.bone());
 expect(r.rate).toBeGreaterThan(1);expect(r.rate).toBeLessThan(3);
 expect(r.delta).toBeGreaterThan(.25);expect(r.delta).toBeLessThan(.6);
 expect(r.seen.returning).toBeTruthy();expect(r.vanished).toBeTruthy();
 expect(r.enhancedTtl).toBeGreaterThan(5);expect(r.enhancedCount).toBe(8);
 expect(errors).toEqual([]);
});
test('consuming wind removes live dolphin cyclones but preserves fire hybrid',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__neonProbe.fusion());
 expect(r.before).toBeGreaterThan(0);expect(r.available).toContain('wind');
 expect(r.after).toBe(0);expect(r.orbit).toBe(0);
 expect(r.gustKinds).toEqual(['fireTornado']);expect(r.sealed).toContain('wind');
 expect(r.combos).toContainEqual(['fire','wind']);expect(r.mode).toBe('elementResult');
 expect(errors).toEqual([]);
});
test('busy neon dog scene renders without errors on desktop and mobile',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__neonProbe.crowded());
 expect(r.ms).toBeLessThan(5000);expect(r.animalKinds).toBeGreaterThan(3);
 expect(errors).toEqual([]);
});
