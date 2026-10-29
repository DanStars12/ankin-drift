import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const script=[
"window.__weaponsProbe={",
" reset(ship){selectedShip=ship;newRun();state('playing');soundOn=false;enemies=[];enemyIndexReady=false;return player.shipType;},",
" dummy(x,y,type='drone'){return{x,y,r:14,type,hp:100000,maxHp:100000,dead:false,slow:0,frozen:0,burn:0,hurt:0,isoSafe:0,xp:0,color:'#fff'};},",
" spike(ship){this.reset(ship);const p=player;const card=skillById(ship==='dog'?'dogHare':'frostSpike');card.apply(p);const e=this.dummy(p.x+65,p.y);enemies=[e];",
"  const start=e.hp;tickReforgeWeapons(.36);const first=start-e.hp,slow=e.slow,visuals=p.spikeVisuals.length;",
"  tickReforgeWeapons(.38);return {count:p.spikeCount,first,total:start-e.hp,slow,frozen:e.frozen,visuals,groups:p.spikeGroups.length};},",
" bossSpike(){this.reset('shot');const p=player;skillById('frostSpike').apply(p);const e=this.dummy(p.x+65,p.y,'major');enemies=[e];",
"  tickReforgeWeapons(.36);return{slow:e.slow,freeze:e.frozen,hit:e.hp<e.maxHp};},",
" lightning(ship){this.reset(ship);const p=player;skillById(ship==='dog'?'dogSnake':'lightningBolt').apply(p);",
"  const enemyArray=[50,90,130,170,210].map(x=>this.dummy(p.x+x,p.y));enemies=enemyArray;",
"  const before=enemyArray.map(e=>e.hp);fireReforgeBolt(p);",
"  return {jumps:p.boltJumps,paths:p.boltVisuals.length,hits:enemyArray.map((e,i)=>before[i]-e.hp),",
"   unique:p.boltVisuals.every((v,i,a)=>a.findIndex(q=>q.x2===v.x2&&q.y2===v.y2)===i),",
"   noneFrozen:enemyArray.every(e=>!e.frozen),noneBurned:enemyArray.every(e=>!e.burn)};},",
" catalog(ship){this.reset(ship);const cards=selectable(SKILLS);return {spike:cards.some(c=>c.id===(ship==='dog'?'dogHare':'frostSpike')),",
" bolt:cards.some(c=>c.id===(ship==='dog'?'dogSnake':'lightningBolt')),other:cards.some(c=>c.id==='iceBall')};}",
"};"
].join('\n');
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
 const response=await route.fetch(),html=await response.text();
 if(!html.includes(anchor))throw Error('weapon probe anchor changed');
 await route.fulfill({response,body:html.replace(anchor,script+'\n'+anchor)});
 });await page.goto('./');return errors;
}
for(const ship of ['shot','dog']){
 test('Frost Spike auto-target one hit per volley and guaranteed slow: '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__weaponsProbe.spike(s),ship);
  expect(r.count).toBe(3);expect(r.first).toBeGreaterThan(0);expect(r.total).toBeCloseTo(r.first,4);
  expect(r.slow).toBeGreaterThan(0);expect(r.frozen).toBe(0);expect(r.visuals).toBeGreaterThan(0);
  expect(errors).toEqual([]);
 });
 test('Lightning Bolt visits distinct targets and never freezes: '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__weaponsProbe.lightning(s),ship);
  expect(r.jumps).toBe(2);expect(r.paths).toBe(3);
  expect(r.hits.filter(x=>x>0)).toHaveLength(3);expect(r.unique).toBe(true);
  expect(r.noneFrozen).toBe(true);expect(r.noneBurned).toBe(true);expect(errors).toEqual([]);
 });
 test('DOG and normal card pools expose the correct weapons: '+ship,async({page})=>{
  const errors=await setup(page),r=await page.evaluate(s=>window.__weaponsProbe.catalog(s),ship);
  expect(r.spike).toBe(true);expect(r.bolt).toBe(true);expect(errors).toEqual([]);
 });
}
test('boss is slowed, never frozen by Frost Spike',async({page})=>{
 const errors=await setup(page),r=await page.evaluate(()=>window.__weaponsProbe.bossSpike());
 expect(r.hit).toBe(true);expect(r.slow).toBeCloseTo(1.2,3);expect(r.freeze).toBe(0);expect(errors).toEqual([]);
});
