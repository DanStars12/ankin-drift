/* v13.30: developer-only AI runner, injected by Playwright, never loaded in the public app.
   Two modes: short real-combat encounters, optional full 30-minute scripted-upgrade run.
   Never persist test progress; restore global RNG and archive methods even on failure. */
export const BALANCE_AI_HARNESS = String.raw`
const BALANCE_AI_SHIPS=['shot','laser','charge','drill','dog'];
const BALANCE_AI_PROFILES={
 shot:{range:190,strafe:0.67,aggression:1},
 laser:{range:175,strafe:0.92,aggression:1},
 charge:{range:220,strafe:0.62,aggression:.8},
 drill:{range:58,strafe:.24,aggression:1.2},
 dog:{range:205,strafe:.78,aggression:.92}
};
function balanceThreats(){
 const p=player;let x=0,y=0,weight=0,near=0;
 for(const b of hostile){
  if(b.warn>0)continue;
  const rx=p.x-b.x,ry=p.y-b.y,rvx=b.vx||0,rvy=b.vy||0;
  const denominator=rvx*rvx+rvy*rvy||1;
  const until=clamp((rx*rvx+ry*rvy)/denominator,0,.52);
  const px=b.x+rvx*until,py=b.y+rvy*until,dx=p.x-px,dy=p.y-py,d=Math.hypot(dx,dy);
  if(d>105)continue;
  const strength=(106-d)/106*2.3;
  x+=dx/Math.max(1,d)*strength;y+=dy/Math.max(1,d)*strength;weight+=strength;
  if(d<48)near++;
 }
 for(const h of hazards){
  if(h.active<=0&&h.warn<=0)continue;
  if(h.type==='voidring')continue;
  if(h.type==='beam'){
   const side=Math.sin(h.a)*(p.x-h.x)-Math.cos(h.a)*(p.y-h.y);
   const d=Math.abs(side),range=(h.width||13)+52;
   if(d<range){const strength=(range-d)/range*2.8,sgn=side>=0?1:-1;
    x+=Math.sin(h.a)*sgn*strength;y-=Math.cos(h.a)*sgn*strength;weight+=strength;near++}
  }else{
   const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy),range=(h.r||60)+55;
   if(d<range){const strength=(range-d)/range*3.2;x+=dx/Math.max(1,d)*strength;y+=dy/Math.max(1,d)*strength;weight+=strength;near++}
  }
 }
 return {x,y,weight,near};
}
function balancePilotStep(frame){
 const p=player,profile=BALANCE_AI_PROFILES[p.shipType],sec=game.total;
 keys.clear();
 const targets=enemies.filter(e=>!e.dead&&e.type!=='relic'),priority=boss&&!boss.dead
  ? (boss.type==='ultimate'&&game.ultimateParts.some(e=>!e.dead)?game.ultimateParts.find(e=>!e.dead):boss)
  : targets.reduce((best,e)=>!best||d2(p,e)<d2(p,best)?e:best,null);
 const t=priority||{x:W*.55,y:H*.45};
 let dx=t.x-p.x,dy=t.y-p.y,d=Math.max(1,Math.hypot(dx,dy)),ux=dx/d,uy=dy/d;
 const threat=balanceThreats();
 let side=(Math.floor(sec/4)%2===0?1:-1),x=0,y=0;
 const distanceError=clamp((d-profile.range)/80,-1.2,1.2);
 x+=ux*distanceError*profile.aggression;y+=uy*distanceError*profile.aggression;
 if(p.shipType!=='charge'||Math.sin(sec*2.2)>0.35){x+=-uy*side*profile.strafe;y+=ux*side*profile.strafe;}
 // Avoid getting trapped by the screen border.
 const margin=75;
 if(p.x<margin)x+=(margin-p.x)/margin*2.5;
 if(p.x>W-margin)x-=(p.x-(W-margin))/margin*2.5;
 if(p.y<margin)y+=(margin-p.y)/margin*2.5;
 if(p.y>H-margin)y-=(p.y-(H-margin))/margin*2.5;
 for(const e of targets){
  if(e===priority)continue;
  const ex=p.x-e.x,ey=p.y-e.y,ed=Math.hypot(ex,ey);
  if(ed<90){const f=(90-ed)/90*1.1;x+=ex/Math.max(1,ed)*f;y+=ey/Math.max(1,ed)*f;}
 }
 x+=threat.x*1.7;y+=threat.y*1.7;
 // Charge ships deliberately hold still to charge, then reposition to fire.
 if(p.shipType==='charge'&&threat.near===0&&Math.floor(sec*10)%20<16){x=0;y=0;}
 const m=Math.hypot(x,y),stop=m<.14;
 if(!stop){
  x/=m;y/=m;
  if(x>.18)keys.add('KeyD');else if(x<-.18)keys.add('KeyA');
  if(y>.18)keys.add('KeyS');else if(y<-.18)keys.add('KeyW');
 }
 // Defensive dash, and for the drill a proactive gap-closing strike.
 if(p.dashLeft<=0&&(threat.near>0||(p.shipType==='drill'&&d<130&&d>35&&p.drillPlasma>p.drillCap*.30))){
  // Dash in the computed safe direction, not back into an incoming projectile.
  if(!stop){p.dx=x;p.dy=y;}
  dash();
 }
 if(p.energy>=100&&p.novaCooldown<=0&&(boss||targets.length>=3||p.hp<p.maxHp*.38))nova();
 return {target:priority?.type||null,nearest:d,threats:threat.near,move:!stop};
}
function balanceApplyBuild(level){
 const p=player;p.dmg+=40;p.crit=Math.max(p.crit,.18);p.bossBane=Math.max(p.bossBane,1.2);
 p.maxHp+=50;p.hp+=50;p.spd+=12;
 if(level>1){p.dmg+=15;p.maxHp+=20;p.hp+=20;}
 if(p.shipType==='shot')p.multishot=Math.max(p.multishot,level>1?5:3);
 if(p.shipType==='laser')p.laserCount=Math.max(p.laserCount,level>1?4:3);
 if(p.shipType==='charge')p.chargeRate=Math.max(p.chargeRate,level>1?1.4:1.08);
 if(p.shipType==='drill')p.drillDamage+=level>1?125:90;
 if(p.shipType==='dog')p.dogBones=Math.max(p.dogBones,level>1?4:3);
}
function balanceSandbox(fn){
 const random=Math.random,methods=[];
 const guards=[
  [record,'write'],[AnkinArchive,'markStarted'],[AnkinArchive,'observeRun'],
  [AnkinArchive,'takeUnlocks']
 ];
 for(const [obj,key] of guards){
  if(obj&&typeof obj[key]==='function'){
   methods.push([obj,key,obj[key]]);
   obj[key]=key==='takeUnlocks'?()=>[]:()=>true;
  }
 }
 try{return fn();}finally{
  Math.random=random;
  for(const [obj,key,old] of methods)obj[key]=old;
  keys.clear();balanceTelemetry=null;
  if(game)game.rewards=[];
  mode='menu';
 }
}
function balanceSetup(ship,seed,phaseMinutes,build,scenario){
 Math.random=seededBalanceRandom(seed);
 selectedGameMode='normal';selectedShip=ship;newRun();mode='playing';
 const p=player;
 game.total=phaseMinutes*60;runClock=game.total;
 game.nextBossAt=1e9;game.nextRaidAt=1e9;game.nextRelicAt=1e9;
 game.nextVacuumAt=1e9;game.nextUltimateAt=1e9;game.ultimateEncounterAt=1e9;
 game.spawn=1e9;game.bossQueue=[];game.autoBank=true;game.completed=false;
 enemies=[];boss=null;shots=[];hostile=[];pickups=[];hazards=[];zones=[];
 enemyIndex.clear();enemyIndexReady=false;
 p.x=W*.45;p.y=H*.52;
 if(build==='representative')balanceApplyBuild(1);
 // The AI takes real damage. No invincibility, silent healing, or collision bypass.
 beginBalanceTelemetry({seed,scenario,build});
}
function balanceSpawnLiveRound(phase,round=0){
 const p=player,types=phase>=20?['shooter','stinger','phantom','guard','bomber','drone']:
  phase>=10?['shooter','stinger','guard','bomber','drone']:['drone','stinger','shooter','bomber'];
 for(let i=0;i<6;i++){
  const angle=(i+round*.43)*TAU/6,d=Math.min(W,H)*(.25+(i%2)*.08);
  const x=clamp(p.x+Math.cos(angle)*d,40,W-40),y=clamp(p.y+Math.sin(angle)*d,40,H-40);
  const e=spawnEnemy(types[(i+round)%types.length],{x,y});
  if(e){e.shoot=Math.min(e.shoot,.8+(i%3)*.2);if(e.type==='phantom')e.dashCd=.4;}
 }
}
function balanceResult(report,secondsPlanned,{won=false,cleared=false,terminal=false,phaseMinutes=0,aiMoves=0,aiDodges=0}={}){
 const duration=report?.duration||0;
 return {...report,mode:'ai',phaseMinutes,secondsPlanned,
  alive:player.hp>0&&game.runOutcome!=='dead',
  won:!!won,cleared:!!cleared,terminal:!!terminal,
  playerHp:Number(player.hp.toFixed(2)),maxHp:player.maxHp,
  survivalSeconds:Number(duration.toFixed(3)),
  aiMoves,aiDodges,bossRemainingHp:boss&&!boss.dead?Math.round(boss.hp):0};
}
window.__ankinBalanceAI={
 runEncounter({ship='shot',seed=1,phase=10,scenario='live-pack',build='representative',seconds=25}={}){
  if(!BALANCE_AI_SHIPS.includes(ship)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid ship/seed');
  if(![0,10,20].includes(phase)||!['live-pack','live-boss'].includes(scenario))throw Error('Invalid combat scenario');
  if(!['base','representative'].includes(build)||!Number.isFinite(seconds)||seconds<=0||seconds>120)throw Error('Invalid build/duration');
  return balanceSandbox(()=>{
   balanceSetup(ship,seed,phase,build,scenario);
   if(scenario==='live-boss'){
    spawnBoss('minor',phase>=20?'vortex':'guardian');
    boss.x=W*.67;boss.y=H*.33;
   }else balanceSpawnLiveRound(phase,0);
   const start=game.total,steps=Math.ceil(seconds*60),dt=1/60;
   let aiMoves=0,aiDodges=0,lastDash=game.combatLog.dashCount;
   for(let i=0;i<steps&&game.runOutcome!=='dead';i++){
    const a=balancePilotStep(i);if(a.move)aiMoves++;
    drive(dt);
    const delta=game.combatLog.dashCount-lastDash;if(delta>0)aiDodges+=delta;lastDash=game.combatLog.dashCount;
    if(scenario==='live-pack'&&i>0&&i%300===0)balanceSpawnLiveRound(phase,i/300);
    if(mode==='choice'){ // Process real boss reward without saving or UI-only interruptions.
     const options=choices;const c=options.find(c=>!c.isSupply)||options[0];
     if(c){const index=options.indexOf(c);choose(index);}
    }
    if(mode==='uniqueReward'||mode==='fusion'||mode==='elementResult')state('playing');
   }
   const won=scenario==='live-boss'&&!boss;
   const report=balanceTelemetryReport();
   return balanceResult(report,seconds,{won,cleared:false,terminal:game.runOutcome==='dead',phaseMinutes:phase,aiMoves,aiDodges});
  });
 },
 // Long-run mode is deliberately separate from CI. This drives the actual 30:00
 // scheduler and normal reward menus. Never interpret short scenarios as clear rate.
 runFull({ship='shot',seed=1,seconds=1830,preview=false}={}){
  if(!BALANCE_AI_SHIPS.includes(ship)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid ship/seed');
  if(!Number.isFinite(seconds)||(preview?(seconds<20||seconds>120):(seconds<1800||seconds>2400)))
   throw Error('Full simulation must include 30:00; preview must last 20-120 seconds');
  return balanceSandbox(()=>{
   balanceSetup(ship,seed,0,'normal-random-rewards','full-30m');
   game.total=0;runClock=0;game.nextBossAt=60;game.nextRaidAt=105;
   game.nextRelicAt=180;game.nextVacuumAt=110;game.nextUltimateAt=1800;
   game.ultimateEncounterAt=0;game.spawn=.78;game.autoBank=false;
   let aiMoves=0,aiDodges=0,menuChoices=0,menuSkips=0;
   let lastDash=0,step=0,unhandled=null;
   const dt=1/60,steps=Math.ceil(seconds*60);
   function resolveMenus(){
    for(let n=0;n<20&&mode!=='playing'&&mode!=='dead'&&mode!=='victory';n++){
     if(mode==='choice'){
      const valid=choices.filter(c=>c&&(!c.isSupply||player.hp<player.maxHp*.80));
      const pick=valid.length?valid[0]:choices[0];
      if(!pick){unhandled='empty choice';break;}
      choose(choices.indexOf(pick));menuChoices++;
     }else if(mode==='uniqueReward'){
      continueAfterReward();menuSkips++;
     }else if(mode==='fusion'){
      dismissFusion();menuSkips++;
     }else if(mode==='elementResult'||mode==='elementConfirm'||mode==='elementChoice'){
      // Element fusion is not automated in this initial full-run strategy.
      pendingElementChoice=false;pendingElementPairs=[];elementChoice=null;
      state('playing');menuSkips++;
     }else{unhandled=mode;break;}
    }
   }
   for(;step<steps&&!game.completed&&game.runOutcome!=='dead';step++){
    resolveMenus();
    if(unhandled||mode!=='playing')break;
    const a=balancePilotStep(step);if(a.move)aiMoves++;
    drive(dt);
    const dd=game.combatLog.dashCount-lastDash;if(dd>0)aiDodges+=dd;lastDash=game.combatLog.dashCount;
    if(mode!=='playing')resolveMenus();
   }
   const t=balanceTelemetryReport();
   return {...balanceResult(t,seconds,{won:!!game.completed,cleared:game.clearCount>0,
    terminal:game.completed||game.runOutcome==='dead',phaseMinutes:0,aiMoves,aiDodges}),
    fullRun:!preview,preview:!!preview,simulationTime:Number(game.total.toFixed(2)),reachedFinalBoss:game.total>=1800,
    menuChoices,menuSkips,stopReason:game.completed?'clear':game.runOutcome==='dead'?'dead':
      unhandled?'unhandled-menu:'+unhandled:step>=steps?(preview?'preview-end':'time-limit'):'unknown',
    clearCount:game.clearCount};
  });
 },
 inspect(){return {ships:BALANCE_AI_SHIPS,profiles:BALANCE_AI_PROFILES}}
};
`;
