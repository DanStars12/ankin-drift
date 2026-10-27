import {test,expect} from '@playwright/test';

const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const probe=`
window.__dogFrameProbe={
 visuals(){
  selectedShip='dog';state('menu');
  const preview=[...document.querySelectorAll('[data-ship="dog"] .dog-frame-icon path')];
  return {
   count:DOG_FRAME_PARTS.length,canvasCount:DOG_FRAME_CANVAS.length,
   matching:preview.length===DOG_FRAME_PARTS.length&&preview.every((p,i)=>
    p.getAttribute('d')===DOG_FRAME_PARTS[i].path&&
    p.getAttribute('fill')===DOG_FRAME_PARTS[i].fill&&
    p.getAttribute('stroke')===DOG_FRAME_PARTS[i].stroke),
   ears:DOG_FRAME_PARTS.filter(p=>p.id.includes('wing')).length,
   nose:DOG_FRAME_PARTS.some(p=>p.id==='nose'),canopy:DOG_FRAME_PARTS.some(p=>p.id==='canopy'),
   sub:SHIPS.dog.sub,
   otherShips:Object.keys(SHIPS).filter(s=>s!=='dog')
  };
 },
 paint(){
  selectedShip='dog';newRun();state('playing');
  let fills=0,strokes=0;const oldFill=ctx.fill,oldStroke=ctx.stroke;
  ctx.fill=function(...args){fills++;return oldFill.apply(this,args)};
  ctx.stroke=function(...args){strokes++;return oldStroke.apply(this,args)};
  try{ship(player.x,player.y,0);}finally{ctx.fill=oldFill;ctx.stroke=oldStroke;}
  const target=visibleTarget(player.x,player.y);
  player.shotTimer=0;shoot();
  return {fills,strokes,ship:player.shipType,radius:player.r,bullet:shots[0]?.kind,hasTarget:!!target};
 }
};
`;
async function prepare(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();
  if(!html.includes(anchor))throw Error('Dog frame probe anchor changed');
  await route.fulfill({response:res,body:html.replace(anchor,probe+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('dog fighter title selection retains other ship choices and exact requested description',async({page})=>{
 const errors=await prepare(page);
 const data=await page.evaluate(()=>window.__dogFrameProbe.visuals());
 expect(data.sub).toBe('アニマル/骨ブーメラン/ミニオン');
 expect(data.matching).toBe(true);expect(data.count).toBe(9);
 expect(data.canvasCount).toBe(9);
 expect(data.ears).toBe(2);expect(data.nose).toBe(true);expect(data.canopy).toBe(true);
 expect(data.otherShips).toHaveLength(4);
 await expect(page.locator('[data-ship="dog"]')).toContainText('アニマル/骨ブーメラン/ミニオン');
 await expect(page.locator('[data-ship="dog"] .dog-frame-icon path')).toHaveCount(9);
 expect(errors).toEqual([]);
});
test('dog body renders filled armored fighter, while bone gameplay and hit radius are unchanged',async({page})=>{
 const errors=await prepare(page),result=await page.evaluate(()=>window.__dogFrameProbe.paint());
 expect(result.ship).toBe('dog');expect(result.radius).toBe(15);
 expect(result.fills).toBeGreaterThanOrEqual(9);
 expect(result.strokes).toBeGreaterThanOrEqual(9);
 expect(result.bullet).toBe('bone');
 expect(errors).toEqual([]);
});
test('dog thumbnail fits responsive frame selector without clipping on desktop and phone',async({page})=>{
 const errors=await prepare(page);
 const result=await page.evaluate(()=>{
  const card=document.querySelector('[data-ship="dog"]'),icon=card.querySelector('.dog-frame-icon');
  const c=card.getBoundingClientRect(),i=icon.getBoundingClientRect();
  return {left:c.left,right:c.right,viewport:innerWidth,iconWidth:i.width,iconHeight:i.height,cardHeight:c.height};
 });
 expect(result.left).toBeGreaterThanOrEqual(-1);
 expect(result.right).toBeLessThanOrEqual(result.viewport+1);
 expect(result.iconWidth).toBeGreaterThan(20);
 expect(result.iconHeight).toBeLessThan(55);
 expect(errors).toEqual([]);
});
