import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=`
window.__animalV1318={
 sample(kind,form='normal',fx='simple'){
  const c=document.createElement('canvas');c.width=180;c.height=150;
  const g=c.getContext('2d',{willReadFrequently:true});
  const beforeFx=settings.fx,beforeHeavy=renderHeavyLoad;
  const p={dogNineTailMorph:form!=='normal',dogNineTailAscended:form==='apex',
   dogWhaleAscended:form==='apex',dogViper:form!=='normal',dogViperAscended:form==='apex',
   dogArmorHam:form!=='normal',dogArmorHamAscended:form==='apex'};
  settings.fx=fx;renderHeavyLoad=fx==='simple';
  g.globalAlpha=.79;g.lineWidth=3;g.shadowBlur=4;
  const initial={alpha:g.globalAlpha,width:g.lineWidth,shadow:g.shadowBlur,
   transform:g.getTransform().toString()};
  try{
   if(kind==='snake')drawDogLightningSnake(p,{x:32,y:86,x2:147,y2:72,life:.3},g,1);
   else drawAnimal(kind,90,84,kind==='whale'?27:26,kind==='whale'?Math.PI/2:0,g,p);
   const result={alpha:g.globalAlpha,width:g.lineWidth,shadow:g.shadowBlur,
    transform:g.getTransform().toString()};
   const data=g.getImageData(0,0,c.width,c.height).data;let filled=0,rgb=0,checksum=0;
   for(let i=0;i<data.length;i+=4){if(data[i+3]>8)filled++;
    rgb+=data[i]+data[i+1]+data[i+2];checksum=(checksum+(i+13)*(data[i]+3*data[i+1]+7*data[i+2]+data[i+3]))%1000000007;}
   return {initial,result,filled,rgb,checksum};
  }finally{settings.fx=beforeFx;renderHeavyLoad=beforeHeavy;}
 },
 stress(){
  const c=document.createElement('canvas');c.width=480;c.height=300;const g=c.getContext('2d');
  const p={dogNineTailMorph:true,dogNineTailAscended:true,dogWhaleAscended:true,
   dogViper:true,dogViperAscended:true,dogArmorHam:true,dogArmorHamAscended:true};
  const begin=performance.now();
  for(let i=0;i<60;i++){const x=30+(i%8)*58,y=24+Math.floor(i/8)*35;
   drawAnimal(['fox','whale','ham','cat','rabbit','chick'][i%6],x,y,12,0,g,p);
   drawDogLightningSnake(p,{x,y,x2:x+30,y2:y+6,life:.3},g,i*.1);
  }
  return {ms:performance.now()-begin,paths:ANIMAL_PATHS.size,tails:FOX_TAIL_GROUPS.length};
 }
};`;
async function ready(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}

test('fox, whale, snake and hamster render distinct mutated and ascended miniatures without leaking canvas state',async({page})=>{
 const errors=await ready(page);
 const data=await page.evaluate(()=>Object.fromEntries(['fox','whale','snake','ham'].map(kind=>
  [kind,['normal','mutation','apex'].map(form=>window.__animalV1318.sample(kind,form))])));
 for(const [kind,forms] of Object.entries(data)){
  for(const sample of forms){
   expect(sample.filled,kind).toBeGreaterThan(250);
   expect(sample.initial,kind).toEqual(sample.result);
  }
  expect(new Set(forms.map(p=>p.checksum)).size,kind).toBe(3);
 }
 expect(errors).toEqual([]);
});

test('all familiar companion silhouettes remain visible under SIMPLE and HIGH',async({page})=>{
 const errors=await ready(page);
 const data=await page.evaluate(()=>Object.fromEntries(['fox','whale','ham','cat','rabbit','chick','chicken','dolphin','hedgehog'].map(kind=>
  [kind,['simple','high'].map(fx=>window.__animalV1318.sample(kind,'normal',fx))])));
 for(const [kind,modes] of Object.entries(data)){
  expect(modes[0].filled,kind+' simple').toBeGreaterThan(100);
  expect(modes[1].filled,kind+' high').toBeGreaterThan(100);
  expect(modes[0].initial).toEqual(modes[0].result);
 }
 expect(errors).toEqual([]);
});

test('visual codex renders normal / mutation / apex without changing run data and captures review screenshots',async({page},testInfo)=>{
 const errors=await ready(page);
 await page.locator('#openTitleLab').click();await page.locator('[data-tab="visual"]').click();
 const cases=[['dogFox','dogNine','dogNineApex'],['dogDolphin','dogWhale','dogWhaleApex'],
  ['dogSnake','dogViper','dogViperApex'],['dogHam','dogArmor','dogHamApex']];
 for(let i=0;i<cases.length;i++)for(let j=0;j<cases[i].length;j++){
  const id=cases[i][j];
  await page.locator('[data-visual-group="'+(j===0?'animal':'mutation')+'"]').click();
  await page.locator('[data-visual-id="'+id+'"]').click();
  await expect(page.locator('[data-visual-id="'+id+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.visual-stage-notice')).toContainText('小サイズ');
  await page.waitForTimeout(75);
  if(testInfo.project.name==='desktop'||j===2)
   await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath(id+'.png')});
 }
 expect(errors).toEqual([]);
});

test('many simultaneous animal sprites render in bounded time without new path proliferation',async({page})=>{
 const errors=await ready(page);
 const stats=await page.evaluate(()=>window.__animalV1318.stress());
 expect(stats.ms).toBeLessThan(4500);
 expect(stats.paths).toBeLessThanOrEqual(14);
 expect(stats.tails).toBe(3);
 expect(errors).toEqual([]);
});
