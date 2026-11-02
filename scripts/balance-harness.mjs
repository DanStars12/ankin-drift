/* Developer-only browser harness, injected by Playwright after source evaluation.
   Not linked from index.html or the production service worker. */
export const BALANCE_HARNESS_ANCHOR = "document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";

export const BALANCE_HARNESS = `
function seededBalanceRandom(seed){
 let n=seed>>>0;
 return function(){
  n=(n+0x6D2B79F5)>>>0;
  let t=Math.imul(n^(n>>>15),1|n);
  t^=t+Math.imul(t^(t>>>7),61|t);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
window.__ankinBalanceLabTest={
 run({ship='shot',seed=1,scenario='boss',build='base',seconds=10}={}){
  if(!Object.hasOwn(SHIPS,ship))throw Error('Unknown ship '+ship);
  if(!['boss','pack'].includes(scenario))throw Error('Unknown scenario '+scenario);
  if(!['base','representative'].includes(build))throw Error('Unknown build '+build);
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid seed');
  if(!Number.isFinite(seconds)||seconds<=0||seconds>60)throw Error('Duration must be 0-60s');
  const original=Math.random;
  Math.random=seededBalanceRandom(seed);
  try{
   selectedShip=ship;newRun();mode='playing';
   game.autoBank=true;game.nextBossAt=1e9;game.nextRaidAt=1e9;game.nextRelicAt=1e9;
   game.nextVacuumAt=1e9;game.spawn=1e9;
   game.bossQueue=[];game.ultimatePending=false;
   player.iframes=1e8;const p=player;p.x=W*.45;p.y=H*.50;
   enemies=[];boss=null;enemyIndex.clear();enemyIndexReady=false;shots=[];hostile=[];hazards=[];zones=[];pickups=[];
   if(build==='representative'){
    p.dmg+=45;p.bossBane=1.25;p.crit=.18;
    if(ship==='shot')p.multishot=3;
    if(ship==='laser')p.laserCount=3;
    if(ship==='charge')p.chargeRate=1.08;
    if(ship==='drill')p.drillDamage+=90;
    if(ship==='dog')p.dogBones=3;
   }
   if(scenario==='boss'){
    const x=p.x+(ship==='drill'?60:175);
    enemies.push({x,y:p.y,r:38,type:'major',variant:'titan',hp:1e9,maxHp:1e9,
      spd:0,dmg:0,xp:0,color:'#ffdfad',dead:false,hurt:0,phase:0,shoot:1e9,
      burn:0,burnDps:0,slow:0,frozen:0,rockHit:0,bladeHit:0,attacks:0});
   }else{
    for(let i=0;i<12;i++){
     const x=clamp(p.x+65+(i%4)*32,35,W-35);
     const y=clamp(p.y-75+Math.floor(i/4)*69,35,H-35);
     const e=spawnEnemy(i%4===0?'brute':'drone',{x,y});
     if(e){e.spd=0;e.dmg=0;e.shoot=1e9;e.hp=e.maxHp=i%4===0?450:140;}
    }
   }
   beginBalanceTelemetry({ship,seed,scenario,build});
   const dt=1/60,steps=Math.ceil(seconds*60);
   for(let i=0;i<steps;i++){
    const time=i*dt;keys.clear();
    if(ship==='laser')keys.add(Math.floor(time/.25)%2===0?'KeyD':'KeyA');
    if(ship==='charge'&&time%1.65>1.50)keys.add('KeyD');
    if(ship==='drill'){
     const e=enemies.find(e=>!e.dead);
     if(e){keys.add(e.x>p.x?'KeyD':'KeyA');if(p.dashLeft<=0&&time>1)dash();}
    }
    drive(dt);
   }
   return balanceTelemetryReport();
  }finally{
   Math.random=original;keys.clear();balanceTelemetry=null;mode='menu';
  }
 },
 snapshot(){
  return balanceTelemetryReport();
 },
 virtualDamage({source='shot',amount=30,at=0}={}){
  selectedShip='shot';newRun();mode='playing';
  enemies=[];const e={type:'major',variant:'titan',hp:1000,maxHp:1000,r:35,x:W*.6,y:H*.5,
   dead:false,hurt:0,color:'#ffffff',phase:0,attacks:0};
  beginBalanceTelemetry({seed:22,scenario:'instrumentation',build:'base'});
  game.total=at;damageEnemy(e,amount,{source});
  const report=balanceTelemetryReport();balanceTelemetry=null;mode='menu';return report;
 }
};
`;
