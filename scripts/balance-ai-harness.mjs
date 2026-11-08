/* v13.30: developer-only AI runner, injected by Playwright, never loaded in the public app.
   Two modes: short real-combat encounters, optional full 30-minute scripted-upgrade run.
   Never persist test progress; restore global RNG and archive methods even on failure. */
import {drillContactGeometry} from './balance-drill-observation.mjs';
import {decideAbilityUse} from './balance-ability-tactics.mjs';
export const BALANCE_AI_HARNESS = String.raw`
const BALANCE_AI_SHIPS=['shot','laser','charge','drill','dog'];
const BALANCE_AI_PROFILES={
 shot:{range:190,strafe:0.67,aggression:1},
 laser:{range:245,strafe:0.92,aggression:1},
 charge:{range:220,strafe:0.62,aggression:.8},
 drill:{range:58,strafe:.24,aggression:1.2},
 dog:{range:230,strafe:.78,aggression:.92}
};
function balanceThreats(){
 const p=player;let x=0,y=0,weight=0,near=0,imminent=0;
 for(const b of hostile){
  if(b.warn>0)continue;
  const rx=p.x-b.x,ry=p.y-b.y,rvx=b.vx||0,rvy=b.vy||0;
  const denominator=rvx*rvx+rvy*rvy||1;
  const until=clamp((rx*rvx+ry*rvy)/denominator,0,.52);
  const px=b.x+rvx*until,py=b.y+rvy*until,dx=p.x-px,dy=p.y-py,d=Math.hypot(dx,dy);
  if(d>105)continue;
  const strength=(106-d)/106*2.3;
  x+=dx/Math.max(1,d)*strength;y+=dy/Math.max(1,d)*strength;weight+=strength;
  if(d<48){near++;if(until<.30&&d<p.r+(b.r||7)+20)imminent++;}
 }
 for(const h of hazards){
  if(h.active<=0&&h.warn<=0)continue;
  if(h.type==='voidring')continue;
  if(h.type==='beam'){
   const side=Math.sin(h.a)*(p.x-h.x)-Math.cos(h.a)*(p.y-h.y);
   const d=Math.abs(side),range=(h.width||13)+52;
   if(d<range){const strength=(range-d)/range*2.8,sgn=side>=0?1:-1;
    x+=Math.sin(h.a)*sgn*strength;y-=Math.cos(h.a)*sgn*strength;weight+=strength;near++;if(h.active>0&&d<(h.width||13)+p.r+16)imminent++;}
  }else{
   const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy),range=(h.r||60)+55;
   if(d<range){const strength=(range-d)/range*3.2;x+=dx/Math.max(1,d)*strength;y+=dy/Math.max(1,d)*strength;weight+=strength;near++;if(h.active>0&&d<(h.r||60)+p.r+15)imminent++;}
  }
 }
 return {x,y,weight,near,imminent};
}
// Evaluate dash landing locations rather than blindly reusing the last facing vector.
function balanceDashVector(moveX,moveY,target,offensive=false){
 const p=player,rad=offensive?.26:.20;
 const speed=(p.shipType==='drill'?p.drillDashSpeed*(p.drillOverdriveTime>0?1.8:1):780)
  *(p.thrusterEngine?1.75:1)*rad;
 const dirs=[[1,0],[.707,.707],[0,1],[-.707,.707],[-1,0],[-.707,-.707],[0,-1],[.707,-.707]];
 const mag=Math.hypot(moveX,moveY)||1;
 let best=null,bestScore=-Infinity;
 for(const [vx,vy] of dirs){
  const rawX=p.x+vx*speed,rawY=p.y+vy*speed;
  const nx=clamp(rawX,p.r+18,W-p.r-18),ny=clamp(rawY,p.r+18,H-p.r-18);
  let score=-Math.hypot(rawX-nx,rawY-ny)*.07+(vx*moveX+vy*moveY)/mag*.35;
  if(target){const prev=dst(p,target),after=Math.hypot(nx-target.x,ny-target.y);
   score+=offensive?(prev-after)*.022:-Math.max(0,90-after)*.014;}
  for(const b of hostile){
   if(b.warn>0)continue;
   const bx=b.x+(b.vx||0)*rad,by=b.y+(b.vy||0)*rad;
   score-=Math.max(0,65-Math.hypot(nx-bx,ny-by))*.045;
  }
  for(const h of hazards){
   if(h.active<=0&&h.warn<=0)continue;
   const delta=h.type==='beam'?Math.abs(Math.sin(h.a)*(nx-h.x)-Math.cos(h.a)*(ny-h.y)):
    Math.hypot(nx-h.x,ny-h.y);
   const reach=h.type==='beam'?(h.width||13)+p.r+20:(h.r||60)+p.r+18;
   if(h.type!=='voidring')score-=Math.max(0,reach-delta)*.05;
  }
  for(const e of enemies){if(e.dead)continue;
   if(offensive&&e===target)continue;
   score-=Math.max(0,(e.r||12)+p.r+24-Math.hypot(nx-e.x,ny-e.y))*.028;
  }
  if(score>bestScore){bestScore=score;best={x:vx,y:vy};}
 }
 return best||{x:moveX/mag||0,y:moveY/mag||-1};
}
function balanceDashKeys(x,y){
 keys.clear();
 if(x>.1)keys.add('KeyD');else if(x<-.1)keys.add('KeyA');
 if(y>.1)keys.add('KeyS');else if(y<-.1)keys.add('KeyW');
}
let balanceAbilityLog=null;
function balanceAbilitySnapshot(priority,dist,threat){
 const p=player,live=enemies.filter(e=>!e.dead);
 let inNova=0,near=0,forward=0;
 for(const e of live){
  const d=dst(p,e);
  if(d<p.novaRadius+(e.r||0))inNova++;
  if(d<300)near++;
  if(d<540)forward++;
 }
 const bossDist=boss&&!boss.dead?dst(p,boss):Infinity;
 return {ship:p.shipType,hpRatio:p.hp/Math.max(1,p.maxHp),energy:p.energy,
  novaHeldSeconds:(balanceAbilityLog?.novaHeldFrames||0)/60,
  novaCooldown:p.novaCooldown,dashLeft:p.dashLeft,dashTime:p.dashTime,
  iframes:p.iframes,targetDist:dist,bossDist,novaRadius:p.novaRadius,
  laserReach:p.laserReach,drillOverdrive:p.drillOverdriveTime,
  drillPlasmaRatio:p.drillPlasma/Math.max(.001,p.drillCap),
  enemiesInNova:inNova,enemiesNear:near,enemiesForward:forward,
  threats:threat.near,imminent:threat.imminent,
  safeApproach:!!priority&&threat.imminent===0&&
   p.x>75&&p.x<W-75&&p.y>75&&p.y<H-75};
}

function balanceExpTarget(threat,policy){
 // XP pursuit is exclusive to tactical full runs; preserve the control AI.
 if(policy!=='tactical'||threat.near>0||threat.imminent>0||(boss&&!boss.dead)||game.total%9>=4)return null;
 const p=player;
 if(game.vacuum){
  const d=dst(p,game.vacuum);
  if(d>p.r+23&&d<Math.min(W,H)*.54)return {x:game.vacuum.x,y:game.vacuum.y,kind:'vacuum'};
 }
 let best=null,bestScore=0;
 for(const item of pickups){
  if(item.type!=='energy')continue;
  const d=dst(p,item);
  if(d<Math.max(35,p.magnet*.65)||d>290)continue;
  const score=(Math.min(180,item.value)+Math.min(30,item.charge)*.3)/(75+d);
  if(score>bestScore){best=item;bestScore=score;}
 }
 return best&&bestScore>=.085?{x:best.x,y:best.y,kind:'orb'}:null;
}
function balanceRewardTraits(card){
 const tags=card?.tags||[],id=card?.id||'';
 const primary={
  shot:['射撃','弾丸','弾数','連射','貫通','反射','追尾'],
  laser:['レーザー','照射','ビーム'],
  charge:['チャージ','蓄積','分裂','溜め'],
  drill:['ドリル','プラズマ','近接','突進'],
  dog:['骨','ブーメラン','アニマル','肉球']
 }[player.shipType]||[];
 return {
  primary:!card?.isSupply&&(card?.shipOnly===player.shipType||['damage','critical','critEpic'].includes(id)||tags.some(tag=>primary.includes(tag))),
  survival:!!(card?.isSupply&&['supply_repair','supply_shield'].includes(id)||
   tags.some(tag=>['防御','装甲','継戦','回復','吸収','シールド'].includes(tag))||
   ['hp','armor','regen','repair','barrier','shieldEpic','expShield','eternalBody'].includes(id)),
  experience:tags.includes('経験値')||['xp','pickup','bounty'].includes(id)
 };
}
function balanceRecordReward(card,options){
 if(!balanceAbilityLog||!card)return;
 const a=balanceAbilityLog.rewardAudit,traits=balanceRewardTraits(card);
 a.choices++;if(traits.primary)a.primary++;if(traits.survival)a.survival++;if(traits.experience)a.experience++;
 if((options||[]).some(c=>c&&balanceRewardTraits(c).primary))a.primaryOffers++;
 if((options||[]).some(c=>c&&balanceRewardTraits(c).survival))a.survivalOffers++;
 if(a.history.length<256)a.history.push({at:Math.round(game.total),level:game.level,
  id:card.id,rarity:card.rarity||'supply',primary:traits.primary,survival:traits.survival,experience:traits.experience});
}
function balancePilotStep(frame,policy='tactical',seekExp=false){
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
 let xpIntent=null;
 if(seekExp){
  // Re-evaluate pickup candidates at 5 Hz, not every simulation frame.
  if(frame%12===0)balanceAbilityLog.currentXpTarget=balanceExpTarget(threat,policy);
  const xp=threat.near||threat.imminent||(boss&&!boss.dead)||game.total%9>=4?null:balanceAbilityLog.currentXpTarget;
  if(xp){
   const vx=xp.x-p.x,vy=xp.y-p.y,len=Math.max(1,Math.hypot(vx,vy));
   x=x*.28+vx/len*1.55;y=y*.28+vy/len*1.55;
   xpIntent=xp.kind;
  }
 }
 // Charge ships deliberately hold still to charge, then reposition to fire.
 if(p.shipType==='charge'&&threat.near===0&&Math.floor(sec*10)%20<16){x=0;y=0;}
 const m=Math.hypot(x,y),stop=m<.14;
 if(!stop&&xpIntent&&balanceAbilityLog){
  balanceAbilityLog.xpSeekFrames++;
  balanceAbilityLog.xpSeekKinds[xpIntent]=(balanceAbilityLog.xpSeekKinds[xpIntent]||0)+1;
 }
 if(!stop){
  x/=m;y/=m;
  if(x>.18)keys.add('KeyD');else if(x<-.18)keys.add('KeyA');
  if(y>.18)keys.add('KeyS');else if(y<-.18)keys.add('KeyW');
 }
 // Separate seeded trials found that a SHOT NOVA radius-only rule harms
 // 30m survival/DPS even when it helps 15m; preserve proven legacy SHOT/DRILL
 // ability policy until an independently validated per-mode candidate exists.
 const legacy=policy==='legacy'||(policy==='tactical'&&['shot','drill'].includes(p.shipType));
 const decision=legacy?{
  dashReason:p.dashLeft<=0&&(threat.near>0||(p.shipType==='drill'&&d<130&&d>35&&p.drillPlasma>p.drillCap*.30))?'legacy-dash':null,
  novaReason:p.energy>=100&&p.novaCooldown<=0&&(boss||targets.length>=3||p.hp<p.maxHp*.38)?'legacy-nova':null
 }:decideAbilityUse(balanceAbilitySnapshot(priority,d,threat));
 if(balanceAbilityLog){
  if(p.energy>=100&&p.novaCooldown<=0)balanceAbilityLog.novaHeldFrames++;
  else balanceAbilityLog.novaHeldFrames=0;
 }
 if(balanceAbilityLog&&frame%60===0){
  if(p.dashLeft<=0)balanceAbilityLog.dashReadySeconds++;
  if(p.energy>=100&&p.novaCooldown<=0)balanceAbilityLog.novaReadySeconds++;
 }
 if(decision.dashReason){
  // Explicitly set inputs: dash() reads keyboard direction, not just p.dx/p.dy.
  if(legacy){if(!stop){p.dx=x;p.dy=y;}}
  else{
   const v=(p.shipType==='drill'||p.shipType==='dog') ? {x:!stop?x:p.dx,y:!stop?y:p.dy} :
   balanceDashVector(x,y,priority,false);
   balanceDashKeys(v.x,v.y);
  }
  const old=game.combatLog.dashCount;dash();
  if(balanceAbilityLog&&game.combatLog.dashCount>old)
   balanceAbilityLog.dashReasons[decision.dashReason]=(balanceAbilityLog.dashReasons[decision.dashReason]||0)+1;
 }
 if(decision.novaReason){
  // Snapshot BEFORE nova() changes enemies/HP/death. Post-hit inspection falsely
  // labels successful screen-clearing NOVAs as "no targets nearby".
  const near=enemies.filter(e=>!e.dead&&dst(p,e)<(p.shipType==='laser'?p.laserReach:p.novaRadius)+(e.r||0)).length;
  const bossDistBefore=boss&&!boss.dead?Math.round(dst(p,boss)):null;
  const old=game.combatLog.novaCount;nova();
  if(balanceAbilityLog&&game.combatLog.novaCount>old){
   if(balanceAbilityLog.novaContexts.length<128)balanceAbilityLog.novaContexts.push({
    at:Math.round(game.total),reason:decision.novaReason,near,bossDist:bossDistBefore});
   balanceAbilityLog.novaHeldFrames=0;
   balanceAbilityLog.novaReasons[decision.novaReason]=(balanceAbilityLog.novaReasons[decision.novaReason]||0)+1;
  }
 }
 return {targetEntity:priority,drillDamageBefore:game.damageStats.drill||0,fromX:p.x,fromY:p.y,
  target:priority?.type||null,nearest:d,threats:threat.near,
  imminent:threat.imminent,move:!stop,dashReason:decision.dashReason,novaReason:decision.novaReason};
}
function balanceObserveDrill(dt,action){
 const log=balanceAbilityLog?.drillDiagnostics;
 if(!log||player.shipType!=='drill'||!action.targetEntity)return;
 const geometry=drillContactGeometry(player,action.targetEntity);
 log.targetSeconds+=dt;log.angleDegreeSeconds+=geometry.aimErrorDegrees*dt;
 if(geometry.withinRadialReach)log.inReachSeconds+=dt;
 if(geometry.forwardCapsuleOverlap)log.forwardOverlapSeconds+=dt;
 if(Math.hypot(player.x-action.fromX,player.y-action.fromY)>.01)log.movingSeconds+=dt;
 if(player.dashTime>0)log.dashSeconds+=dt;
 if((game.damageStats.drill||0)>action.drillDamageBefore)log.damageStepSeconds+=dt;
}
function balanceDrillReport(){
 const d=balanceAbilityLog?.drillDiagnostics;
 if(player.shipType!=='drill'||!d)return null;
 const out=Object.fromEntries(Object.entries(d).filter(([k])=>k!=='angleDegreeSeconds').map(([k,v])=>[k,Number(v.toFixed(3))]));
 return {...out,meanAimErrorDegrees:d.targetSeconds?Number((d.angleDegreeSeconds/d.targetSeconds).toFixed(2)):null,
  forwardOverlapPercent:d.targetSeconds?Number((d.forwardOverlapSeconds/d.targetSeconds*100).toFixed(2)):null};
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

function balancePickReward(options){
 const hpRatio=player.hp/Math.max(1,player.maxHp);
 const rank={common:0,uncommon:1.2,rare:2.3,epic:3.5,power:4,legendary:4.5,unique:5,relic:4.5};
 const scored=(options||[]).filter(Boolean).map((c,index)=>{
  const tags=c.tags||[],defense=tags.some(x=>['防御','装甲','継戦','回復'].includes(x));
  let score=(rank[c.rarity]||0)+Math.min(2,(game.skills[c.id]||0)*.22);
  if(c.isSupply){
   score=c.id==='supply_repair'?(hpRatio<.35?22:hpRatio<.65?8:-8):
    c.id==='supply_shield'?(hpRatio<.55?11:1):hpRatio<.45?4:-5;
  }else{
   if(c.shipOnly===player.shipType)score+=3.5;
   if(defense)score+=hpRatio<.45?6:hpRatio<.75?3.5:1.3;
   const traits=balanceRewardTraits(c);
   if(traits.primary)score+=2.3;
   if(traits.survival&&hpRatio<.8)score+=hpRatio<.45?2.5:1.2;
   if(traits.experience&&game.level<15&&player.magnet<240)score+=1.0;
   if(tags.includes('機動'))score+=player.shipType==='drill'?2.2:1.4;
   if(tags.includes('ノヴァ'))score+=1.2;
   const ready=synergiesFor(c.id).filter(a=>!game.synergies[a.id]&&a.need.filter(id=>id!==c.id).every(owned)).length;
   score+=ready*12;
   const evo=fusionFor(c.id).filter(a=>!game.fusions[a.id]&&fusionMaterials(a).filter(id=>id!==c.id).every(owned)).length;
   score+=evo*14;
   const elem=elementFromCard(c),own=ownedElementKeys();
   if(elem&&game.elementCombos.length<2){
    if(own.includes(elem))score+=1.2;
    else if(own.length===1)score+=2.4;
   }
  }
  return {c,index,score};
 });
 scored.sort((a,b)=>b.score-a.score||a.index-b.index);
 return scored[0]?.c||null;
}
function balanceTryElementFusion(fusionPolicy='always'){
 if(mode!=='choice'||game.lastChoice!=='normal')return false;
 const pairs=availableElementPairs();
 if(!pairs.length)return false;
 const audit=balanceAbilityLog?.fusionAudit;
 if(audit)audit.offers++;
 pairs.sort((a,b)=>elementInvestments(b.main).points-elementInvestments(a.main).points||
  elementInvestments(a.sub).points-elementInvestments(b.sub).points);
 const pair=pairs[0],weapon=fusionWeaponDefinitions(pair.main).find(w=>w.owned);
 const mainPoints=elementInvestments(pair.main).points,subPoints=elementInvestments(pair.sub).points;
 let reason=null;
 if(!weapon)reason='no-owned-weapon';
 if(fusionPolicy==='never')reason='control-no-fusion';
 if(fusionPolicy==='adaptive'&&(mainPoints<2||subPoints>mainPoints*.75))
  reason='preserve-build-investment';
 if(reason){
  if(audit){audit.declined++;audit.reasons[reason]=(audit.reasons[reason]||0)+1;}
  return false;
 }
 const before=game.elementCombos.length;
 const ready=enterElementChoice();
 if(ready){
  chooseFusionMain(pair.main);
  selectElementFusion(pair.sub);
  selectFusionWeapon(weapon.slot);
  confirmElementFusion();
 }
 const accepted=!!ready&&game.elementCombos.length>before&&mode==='elementResult';
 if(audit){
  if(accepted)audit.accepted++;else audit.failed++;
  if(audit.history.length<32)audit.history.push({at:Math.round(game.total),main:pair.main,
   sub:pair.sub,slot:weapon.slot,mainPoints,subPoints,accepted});
 }
 return accepted;
}
function balanceSandbox(fn){
 const random=Math.random,methods=[];
 const originalMode=selectedGameMode,originalShip=selectedShip;
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
  keys.clear();balanceTelemetry=null;balanceAbilityLog=null;
  selectedGameMode=originalMode;selectedShip=originalShip;
  if(game)game.rewards=[];
  mode='menu';
 }
}
function balanceSetup(ship,seed,phaseMinutes,build,scenario,policy='tactical',runMode='normal',fullTimeline=false){
 balanceAbilityLog={policy,drillDiagnostics:{targetSeconds:0,angleDegreeSeconds:0,inReachSeconds:0,forwardOverlapSeconds:0,movingSeconds:0,dashSeconds:0,damageStepSeconds:0},dashReadySeconds:0,novaReadySeconds:0,novaHeldFrames:0,dashReasons:{},novaReasons:{},novaContexts:[],
  xpSeekFrames:0,xpSeekKinds:{},rewardAudit:{choices:0,primary:0,survival:0,experience:0,primaryOffers:0,survivalOffers:0,history:[]},
  fusionAudit:{offers:0,accepted:0,declined:0,failed:0,reasons:{},history:[]}};
 Math.random=seededBalanceRandom(seed);
 selectedGameMode=runMode;selectedShip=ship;newRun();mode='playing';
 const p=player;
 if(!fullTimeline){
  // Encounter benchmarks intentionally disable the normal scheduler.
  game.total=phaseMinutes*60;runClock=game.total;
  game.nextBossAt=1e9;game.nextRaidAt=1e9;game.nextRelicAt=1e9;
  game.nextVacuumAt=1e9;game.nextUltimateAt=1e9;game.ultimateEncounterAt=1e9;
  game.spawn=1e9;game.bossQueue=[];game.autoBank=true;game.completed=false;
  enemies=[];boss=null;shots=[];hostile=[];pickups=[];hazards=[];zones=[];
  enemyIndex.clear();enemyIndexReady=false;
  p.x=W*.45;p.y=H*.52;
  if(build==='representative')balanceApplyBuild(1);
 }
 // For full-timeline runs leave ALL settings, timings, RNG, enemy waves,
 // initial scouts and real challenge/normal skill progression as newRun() configured.
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
 return {...report,mode:'ai',gameMode:game.gameMode,phaseMinutes,secondsPlanned,
  alive:player.hp>0&&game.runOutcome!=='dead',
  won:!!won,cleared:!!cleared,terminal:!!terminal,
  playerHp:Number(player.hp.toFixed(2)),maxHp:player.maxHp,
  survivalSeconds:Number(duration.toFixed(3)),
  aiMoves,aiDodges,abilityPolicy:balanceAbilityLog?.policy||'tactical',
  dashReadySeconds:balanceAbilityLog?.dashReadySeconds||0,
  novaReadySeconds:balanceAbilityLog?.novaReadySeconds||0,
  dashReasons:{...(balanceAbilityLog?.dashReasons||{})},
  novaReasons:{...(balanceAbilityLog?.novaReasons||{})},
  novaContexts:[...(balanceAbilityLog?.novaContexts||[])],
  drillDiagnostics:balanceDrillReport(),
  xpSeekSeconds:Number(((balanceAbilityLog?.xpSeekFrames||0)/60).toFixed(2)),
  xpSeekKinds:{...(balanceAbilityLog?.xpSeekKinds||{})},
  xpOnField:Number(pickups.filter(e=>e.type==='energy').reduce((sum,e)=>sum+e.value,0).toFixed(2)),
  rewardAudit:balanceAbilityLog?.rewardAudit||null,
  fusionAudit:balanceAbilityLog?.fusionAudit||null,
  weaponState:{dmg:player.dmg,rate:player.rate,multishot:player.multishot,
   laserCount:player.laserCount,chargeRate:player.chargeRate,drillDamage:player.drillDamage,
   dogBones:player.dogBones,magnet:player.magnet,regen:player.regen,shieldMax:player.shieldMax},
  bossRemainingHp:boss&&!boss.dead?Math.round(boss.hp):0};
}
window.__ankinBalanceAI={
 probeMagma({constrained=true}={}){
  return balanceSandbox(()=>{
   balanceSetup('shot',1,0,'base','magma-position');
   player.magmaLevel=1;player.magmaRadius=54;player.lavaConstrain=constrained?1:0;
   magmaPatch(W*.3,H*.35);
   const original={x:zones[0]?.x,y:zones[0]?.y};
   magmaPatch(W*.68,H*.64);
   return {original,latest:{x:zones.at(-1)?.x,y:zones.at(-1)?.y},
    count:zones.length,stacks:zones[0]?.stacks||1,damage:zones[0]?.dps};
  });
 },
 runEncounter({ship='shot',seed=1,phase=10,scenario='live-pack',build='representative',seconds=25,policy='tactical',initialNovaReady=false,diagnostics=true}={}){
  if(typeof diagnostics!=='boolean')throw Error('Invalid diagnostics flag');
  if(typeof initialNovaReady!=='boolean')throw Error('Invalid initialNovaReady');
  if(!['legacy','tactical'].includes(policy))throw Error('Invalid ability policy');
  if(!BALANCE_AI_SHIPS.includes(ship)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid ship/seed');
  if(![0,10,20].includes(phase)||!['live-pack','live-boss'].includes(scenario))throw Error('Invalid combat scenario');
  if(!['base','representative'].includes(build)||!Number.isFinite(seconds)||seconds<=0||seconds>120)throw Error('Invalid build/duration');
  return balanceSandbox(()=>{
   balanceSetup(ship,seed,phase,build,scenario,policy);
   if(!diagnostics)balanceAbilityLog.drillDiagnostics=null;
   if(scenario==='live-boss'){
    spawnBoss('minor',phase>=20?'vortex':'guardian');
    boss.x=W*.67;boss.y=H*.33;
   }else balanceSpawnLiveRound(phase,0);
   if(initialNovaReady)player.energy=100; // controlled test-only ability activation
   const start=game.total,steps=Math.ceil(seconds*60),dt=1/60;
   let aiMoves=0,aiDodges=0,lastDash=game.combatLog.dashCount,winAt=null;
   for(let i=0;i<steps&&game.runOutcome!=='dead';i++){
    const a=balancePilotStep(i,policy);if(a.move)aiMoves++;
    drive(dt);balanceObserveDrill(dt,a);
    const delta=game.combatLog.dashCount-lastDash;if(delta>0)aiDodges+=delta;lastDash=game.combatLog.dashCount;
    if(scenario==='live-pack'&&i>0&&i%300===0)balanceSpawnLiveRound(phase,i/300);
    if(mode==='choice'){ // Process real boss reward without saving or UI-only interruptions.
     const options=choices;const c=options.find(c=>!c.isSupply)||options[0];
     if(c){const index=options.indexOf(c);choose(index);}
    }
    if(mode==='uniqueReward'||mode==='fusion'||mode==='elementResult')state('playing');
    // Stop at the actual boss kill; idle time after victory must not dilute DPS.
    if(scenario==='live-boss'&&!boss){winAt=game.total-start;break;}
   }
   const won=scenario==='live-boss'&&winAt!==null;
   const report=balanceTelemetryReport();
   return {...balanceResult(report,seconds,{won,cleared:false,terminal:game.runOutcome==='dead',phaseMinutes:phase,aiMoves,aiDodges}),
    initialNovaReady,timeToWin:winAt===null?null:Number(winAt.toFixed(3))};
  });
 },
 // Full-timeline simulations use the actual 15m challenge OR 30m normal scheduler.
 // Both are explicit opt-in; short encounters never count toward their clear rates.
 runFull({ship='shot',seed=1,seconds,preview=false,policy='tactical',fusionPolicy='always',gameMode='normal'}={}){
  if(!['legacy','tactical'].includes(policy))throw Error('Invalid ability policy');
  if(!['always','adaptive','never'].includes(fusionPolicy))throw Error('Invalid fusion policy');
  if(!['normal','challenge'].includes(gameMode))throw Error('Invalid game mode');
  if(!BALANCE_AI_SHIPS.includes(ship)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid ship/seed');
  const bossAt=gameMode==='challenge'?900:1800;
  const plannedSeconds=seconds===undefined?(preview?72:bossAt+60):seconds;
  if(!Number.isFinite(plannedSeconds)||(preview?(plannedSeconds<20||plannedSeconds>120):
   (plannedSeconds<bossAt||plannedSeconds>bossAt+600)))
   throw Error('Full simulation must include its own 15:00/30:00 boss; preview must last 20-120 seconds');
  return balanceSandbox(()=>{
   const scenario=gameMode==='challenge'?'full-15m':'full-30m';
   balanceSetup(ship,seed,0,'normal-random-rewards',scenario,policy,gameMode,true);
   const startSchedule={mode:game.gameMode,bossAt:ultimateThreshold(),
    firstBossAt:game.nextBossAt,firstRaidAt:game.nextRaidAt,
    firstRelicAt:game.nextRelicAt,firstVacuumAt:game.nextVacuumAt,
    nextUltimateAt:game.nextUltimateAt,
    nextBossAfterFirst:gameMode==='challenge'?135:150,
    modeSpecificSecondBoss:scheduledBossType(gameMode==='challenge'?135:150,gameMode),
    dogChickenAt:gameMode==='challenge'?480:900};
   // Neither mode is allowed to bypass the real enemy/boss/EXP/reward scheduler.
   let aiMoves=0,aiDodges=0,menuChoices=0,menuSkips=0;
   let lastDash=0,step=0,unhandled=null;
   const dt=1/60,steps=Math.ceil(plannedSeconds*60);
   function resolveMenus(){
    for(let n=0;n<20&&mode!=='playing'&&mode!=='dead'&&mode!=='victory';n++){
     if(mode==='choice'){
      if(balanceTryElementFusion(fusionPolicy)){menuChoices++;continue;}
      const pick=balancePickReward(choices);
      if(!pick){unhandled='empty choice';break;}
      balanceRecordReward(pick,choices);
      choose(choices.indexOf(pick));menuChoices++;
     }else if(mode==='uniqueReward'){
      continueAfterReward();menuSkips++;
     }else if(mode==='fusion'){
      dismissFusion();menuSkips++;
     }else if(mode==='elementResult'){
      continueAfterReward();menuSkips++;
     }else if(mode==='elementConfirm'||mode==='elementChoice'){
      skipElementFusion();menuSkips++;
     }else{unhandled=mode;break;}
    }
   }
   for(;step<steps&&!game.completed&&game.runOutcome!=='dead';step++){
    resolveMenus();
    if(unhandled||mode!=='playing')break;
    const a=balancePilotStep(step,policy,true);if(a.move)aiMoves++;
    drive(dt);balanceObserveDrill(dt,a);
    const dd=game.combatLog.dashCount-lastDash;if(dd>0)aiDodges+=dd;lastDash=game.combatLog.dashCount;
    if(mode!=='playing')resolveMenus();
   }
   const t=balanceTelemetryReport();
   return {...balanceResult(t,plannedSeconds,{won:!!game.completed,cleared:game.clearCount>0,
    terminal:game.completed||game.runOutcome==='dead',phaseMinutes:0,aiMoves,aiDodges}),
    fullRun:!preview,preview:!!preview,simulationTime:Number(game.total.toFixed(2)),
    finalBossAt:bossAt,finalBossSpawned:game.ultimateEncounterAt>0,
    finalBossSpawnTime:game.ultimateEncounterAt>0?Number(game.ultimateEncounterAt.toFixed(2)):null,
    reachedFinalBoss:game.ultimateEncounterAt>0,startSchedule,
    menuChoices,menuSkips,elementFusions:game.elementCombos.length,fusionPolicy,stopReason:game.completed?'clear':game.runOutcome==='dead'?'dead':
      unhandled?'unhandled-menu:'+unhandled:step>=steps?(preview?'preview-end':'time-limit'):'unknown',
    clearCount:game.clearCount};
  });
 },
 decide(snapshot){return decideAbilityUse(snapshot)},
 inspect(){return {ships:BALANCE_AI_SHIPS,profiles:BALANCE_AI_PROFILES,abilityPolicy:'tactical'}}
};
` + '\n' + decideAbilityUse.toString() + '\n' + drillContactGeometry.toString() + '\n';
