import {test,expect} from '@playwright/test';
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook=String.raw`
window.__v135={
 reset(){
  newRun();state('playing');game.total=0;game.spawn=999999;game.nextBossAt=999999;
  game.nextRaidAt=999999;game.nextRelicAt=999999;game.nextVacuumAt=999999;
  enemies=[];shots=[];hostile=[];zones=[];gusts=[];boss=null;player.iframes=100;
 },
 catalog(){
  return {trade:SKILLS.filter(c=>c.tags?.includes('変異')).map(c=>({id:c.id,once:c.stackable===false})),
    power:['crossForge','pulseGrid','lavaCatalyst','napalmRig'].every(id=>POWERS.some(c=>c.id===id)),
    legend:['bladeLegendV','pulseLegendV','lavaLegendV','napalmLegendV'].every(id=>LEGENDS.some(c=>c.id===id)),
    synergies:['crossDanceV','ionTrinityV','lavaMetabolismV','thrusterCrashV','napalmDetonationV','meteorCrushV','glacierSplitV','fortressTradeV'].every(id=>SYNERGIES.some(c=>c.id===id)),
    evolutions:['crossForgeEvo','pulseGridEvo','lavaCatalystEvo','napalmRigEvo'].every(id=>FUSIONS.some(c=>c.id===id))};
 },
 cap(){
  this.reset();const ice=skillById('iceBall'),meteor=skillById('meteorSeed'),cross=skillById('crossBlade');
  ice.apply(player);ice.apply(player);const count=player.iceBallCount;
  player.iceBallCount=5;
  const blocked=skillHasRoom(ice)&&ice.available(player);
  const remaining=selectable(SKILLS).some(c=>c.id==='iceBall');
  meteor.apply(player);game.skills[meteor.id]=1;
  const meteorBlocked=selectable(SKILLS).some(c=>c.id==='meteorSeed');
  cross.apply(player);game.skills[cross.id]=1;
  return {count,blocked,remaining,meteorBlocked,crossBlocked:selectable(SKILLS).some(c=>c.id==='crossBlade')};
 },
 fields(){
  this.reset();const c=skillById('tridentPulse');c.apply(player);player.empDps=460;
  const at0=empEmitters(player).map(x=>({x:x.x,y:x.y,r:x.empRadius}));
  t+=.25;const at1=empEmitters(player);
  const radius=Math.min(290,player.empRadius);
  return {count:at0.length,radius,each:at0.map(x=>x.r),changed:Math.abs(at0[0].x-at1[0].x)>.01};
 },
 lava(){
  this.reset();const c=skillById('lavaConstrain');c.apply(player);
  for(let i=0;i<6;i++)magmaPatch(player.x+15*i,player.y,1);
  const current=zones.filter(z=>z.type==='magma');const first=current[0];
  return {count:current.length,stacks:first?.stacks,damage:first?.dps,
    base:player.magmaDps+player.magmaLevel*18+player.dmg*.25};
 },
 napalm(){
  this.reset();const c=skillById('gigaNapalm');c.apply(player);
  player.rocketCd=9;player.dmg=100;
  const e=spawnEnemy('brute',{x:player.x+110,y:player.y});e.hp=e.maxHp=100000;
  const ally=spawnEnemy('brute',{x:player.x+140,y:player.y});ally.hp=ally.maxHp=100000;
  refreshEnemyIndex();
  fireFrom(player.x,player.y,e,4,220,500,'rocket');
  const projectile=shots[0],count=shots.length;
  projectile.x=e.x;projectile.y=e.y;
  projectileHit(projectile,e);
  return{count,napalm:projectile.napalm,units:projectile.missileCount,
    splash:ally.maxHp-ally.hp,burning:ally.burn>0,flames:particles.length};
 },
 dash(){
  this.reset();skillById('thrusterEngine').apply(player);
  const before=player.dashCd;dash();
  return {cooldown:before,duration:player.dashTime,recovery:player.dashLeft};
 },
 fusion(){
  this.reset();
  skillById('meteorAnvil').apply(player);
  const meteor=skillById('meteorSeed');
  const allowed=selectable(SKILLS).some(c=>c.id==='meteorSeed');
  meteor.apply(player);game.skills[meteor.id]=1;game.skills.meteorAnvil=1;
  activateUpgrades();
  return {allowed,damage:player.meteorDamage,synergy:game.synergies.meteorCrushV===1};
 }
};`;
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const response=await route.fetch(),html=await response.text();
  if(!html.includes(anchor))throw Error('v13.5 injection anchor changed');
  await route.fulfill({response,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');return errors;
}
test('new mutators, POWERs, LEGENDARYs, synergies and fusions are registered',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__v135.catalog());
 expect(x.trade.length).toBeGreaterThanOrEqual(15);
 expect(x.trade.every(c=>c.once)).toBeTruthy();
 expect(x.power&&x.legend&&x.synergies&&x.evolutions).toBeTruthy();
 expect(errors).toEqual([]);
});
test('iceball repeat gives an extra projectile; exhausted and single-use cards vanish',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__v135.cap());
 expect(x.count).toBe(2);expect(x.blocked).toBeFalsy();
 expect(x.remaining||x.meteorBlocked||x.crossBlocked).toBeFalsy();
 expect(errors).toEqual([]);
});
test('trident EMP emits three genuinely orbiting fields',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__v135.fields());
 expect(x.count).toBe(3);expect(x.each.every(r=>r<x.radius)).toBeTruthy();
 expect(x.changed).toBeTruthy();expect(errors).toEqual([]);
});
test('lava constriction merges repeated magma patches and increases their damage',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__v135.lava());
 expect(x.count).toBe(1);expect(x.stacks).toBe(6);
 expect(x.damage).toBeGreaterThan(x.base);expect(errors).toEqual([]);
});
test('Giga Napalm draws one missile for multiple stacks, detonates and burns nearby foes',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>window.__v135.napalm());
 expect(x.count).toBe(1);expect(x.napalm).toBe(true);expect(x.units).toBe(9);
 expect(x.splash).toBeGreaterThan(0);expect(x.burning).toBe(true);expect(errors).toEqual([]);
});
test('thruster increases dash duration and cooldown; meteor starter remains reachable after trade-off',async({page})=>{
 const errors=await setup(page),x=await page.evaluate(()=>({dash:window.__v135.dash(),fusion:window.__v135.fusion()}));
 expect(x.dash.cooldown).toBeGreaterThan(2.8);
 expect(x.dash.duration).toBeGreaterThan(.3);
 expect(x.fusion.allowed).toBe(true);
 expect(x.fusion.synergy).toBe(true);
 expect(errors).toEqual([]);
});
