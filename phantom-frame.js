/* PHANTOM FRAME: deterministic combat-time AI; no DOM, pickup collection or enemy targeting side effects. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rank=(p,k)=>p.phantomRanks?.[k]||0;
function init(p){
 p.phantomLevel=1;p.phantomOverflow=0;p.phantomRanks={};p.phantoms=[];p.phantomEchoes=[];p.phantomVisuals=[];
 p.dartTypes=[];p.darts=[];p.dartProjectiles=[];p.dartVisuals=[];p.dartActive=0;p.dartCooldown=0;
 p.phantomNova=0;p.phantomRelay=0;p.phantomAttackId=0;p.phantomClock=0;p.phantomCollectClock=0;
 p.phantomMetrics={primaryDamage:0,extraDamage:0,bladeHits:0,attacks:0,aiMs:0};
 sync(p);
}
function sync(p){
 const count=rank(p,'parade')?3:1;
 while(p.phantoms.length<count){const i=p.phantoms.length;p.phantoms.push({id:i,primary:i===0,x:p.x+(i-1)*25,y:p.y-30,angle:-Math.PI/2,state:'HUNT',target:null,scan:i*.07,cooldown:0,warp:0,hits:0,chain:0,lastTarget:null});}
 p.phantoms.length=count;
}
function addRank(p,k){if(!p.phantomRanks)init(p);p.phantomRanks[k]=rank(p,k)+1;}
function level(p,n){const next=Math.min(10,p.phantomLevel+n),gain=next-p.phantomLevel;
 p.phantomOverflow=Math.min(.12,p.phantomOverflow+Math.max(0,p.phantomLevel+n-10)*.03);p.phantomLevel=next;
 p.maxHp+=gain*5;p.hp=Math.min(p.maxHp,p.hp+gain*5);p.shieldMax+=gain*2;p.shield=Math.min(p.shieldMax,p.shield+gain*2);p.shieldRecharge+=gain*.25;
}
function stats(p){const l=p.phantomLevel-1,active=p.phantomNova>0,novaScale=clamp(((p.novaDamage||175)-175)/1000,0,.3);
 return {range:85+rank(p,'edge')*9+rank(p,'crescent')*7+(rank(p,'reaper')?45:0)+rank(p,'emperor')*15,
 angle:(110+rank(p,'wide')*14+(rank(p,'reaper')?20:0))*Math.PI/180,
 cap:3+rank(p,'wide')+(rank(p,'reaper')?3:0),
 speed:(270+l*9+rank(p,'hunt')*12+rank(p,'predator')*35)*(1+rank(p,'assault')*.1)*(active?1.3+novaScale*.5+(rank(p,'novaAccel')?.35:0):1),
 sense:600+l*22+rank(p,'hunt')*85+rank(p,'predator')*180,
 period:Math.max(.16,.65/(1+l*.035+rank(p,'haste')*.09+rank(p,'algorithm')*.04+rank(p,'driver')*.07)/(active?1.35+(rank(p,'novaAccel')?.30:0):1)),
 damage:p.dmg*(1+l*.09+rank(p,'polish')*.15+rank(p,'emperor')*.3+rank(p,'sync')*.08+rank(p,'network')*.1+p.phantomOverflow+rank(p,'crescent')*.12)*(p.phantomRelay>0?1.18+rank(p,'coil')*.04:1)*(active?1.2+novaScale:1)*(1+(rank(p,'contract')?.35*(1-p.hp/Math.max(1,p.maxHp)):0))*(1+(rank(p,'astralCore')?(p.phantomLevel===10?.18:.04):0))};
}
function slash(p,f,world,s,type='blade',factor=1,angle=f.angle){
 const nova=type==='nova',range=nova?s.range*1.6:s.range;
 const attack={id:++p.phantomAttackId,phantomId:f.id,primary:f.primary,type,nova,element:f.primary&&!nova,angle,x:f.x,y:f.y,range,hit:new Set(),evolutions:{reaper:!!rank(p,'reaper'),flash:!!rank(p,'flash'),requiem:!!rank(p,'requiem')}};
 let n=0;
 for(const e of world.candidates(f.x,f.y,range+90)){
  if(e.dead||e.isoWarp||e.isoSafe>0||attack.hit.has(e)||!nova&&world.targetable&&!world.targetable(e))continue;
  const dx=e.x-f.x,dy=e.y-f.y,d=Math.hypot(dx,dy);if(d>range+e.r)continue;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
  if(!nova&&Math.abs(delta)>s.angle/2+Math.asin(Math.min(1,e.r/Math.max(1,d))))continue;
  if(!nova&&world.blocked(f.x,f.y,e.x,e.y))continue;
  attack.hit.add(e);let damage=(nova?world.novaDamage()*.24:s.damage)*factor*(f.primary?1:.6);
  if(!nova){const crit=rank(p,'critical')*.08+(p.crit||0);if(world.random()<Math.min(.97,crit))damage*=p.critMult||1.8;
   if(world.isBoss(e))damage*=p.bossBane||1;if(rank(p,'execution')&&e.hp<e.maxHp*.35)damage*=1.25;damage*=1+(rank(p,'oath')?Math.min(.3,f.chain*.03):0);}
  world.damage(e,damage,{special:true,source:nova?'nova':f.primary?'phantomBlade':'phantomExtra',phantomId:f.id,attackId:attack.id,attackType:type,primary:f.primary,nova,origin:{x:f.x,y:f.y}});
  if(attack.element&&type==='blade'&&world.element)world.element(e,damage,attack);
  f.hits++;p.phantomMetrics.bladeHits++;
  if(++n>= (nova?16:s.cap))break;
 }
 // Visual budget never suppresses a damage event.
 p.phantomVisuals.push({x:f.x,y:f.y,angle,range,arc:nova?Math.PI*2:s.angle,life:.18,total:.18,nova,primary:f.primary});
 if(p.phantomVisuals.length>24)p.phantomVisuals.splice(0,p.phantomVisuals.length-24);
 p.phantomMetrics.attacks++;return attack;
}
// Tiny visibility graph over padded wall corners. Replanned in combat time,
// at most twice per second per phantom; never teleports or returns to the ghost.
function findRoute(f,target,world){
 const walls=world.obstacles||[];if(!walls.length)return [];
 const points=[{x:f.x,y:f.y},{x:target.x,y:target.y}];
 for(const w of walls)for(const x of [w.x-14,w.x+w.w+14])for(const y of [w.y-14,w.y+w.h+14]){
  if(x<12||y<12||x>world.width-12||y>world.height-12||world.blocked(x,y,x,y,10))continue;points.push({x,y});
 }
 const n=points.length,dist=new Array(n).fill(Infinity),previous=new Array(n).fill(-1),seen=new Array(n).fill(false);dist[0]=0;
 for(let step=0;step<n;step++){
  let from=-1;for(let i=0;i<n;i++)if(!seen[i]&&(from<0||dist[i]<dist[from]))from=i;
  if(from<0||!Number.isFinite(dist[from]))break;if(from===1)break;seen[from]=true;
  const a=points[from];for(let to=0;to<n;to++){if(to===from||seen[to])continue;const b=points[to];
   if(world.blocked(a.x,a.y,b.x,b.y,10))continue;const next=dist[from]+Math.hypot(b.x-a.x,b.y-a.y);
   if(next<dist[to]){dist[to]=next;previous[to]=from;}
  }
 }
 if(previous[1]<0)return [];
 const route=[];for(let at=1;at>0;at=previous[at])route.push(points[at]);return route.reverse();
}
function tick(p,dt,world){
 sync(p);p.phantomClock+=dt;p.phantomNova=Math.max(0,p.phantomNova-dt);p.phantomRelay=Math.max(0,p.phantomRelay-dt);
 const s=stats(p);tickDarts(p,dt,world);
 for(const v of p.phantomVisuals)v.life-=dt;p.phantomVisuals=p.phantomVisuals.filter(v=>v.life>0);
 for(const echo of p.phantomEchoes){echo.delay-=dt;if(echo.delay<=0){slash(p,echo.frame,world,s,echo.type,echo.factor,echo.angle);echo.done=true;}}
 p.phantomEchoes=p.phantomEchoes.filter(e=>!e.done);
 for(const f of p.phantoms){
  f.cooldown-=dt;f.scan-=dt;f.warp=Math.max(0,f.warp-dt);f.routeTime=Math.max(0,(f.routeTime||0)-dt);
  f.novaTick=(f.novaTick||0)-dt;if(p.phantomNova>0&&rank(p,'novaTempest')&&f.novaTick<=0){f.novaTick=s.period;slash(p,f,world,s,'nova');}
  const overlaps=(x,y)=>world.obstacles?.some(w=>x>=w.x-10&&x<=w.x+w.w+10&&y>=w.y-10&&y<=w.y+w.h+10);
  if(overlaps(f.x,f.y)){
   // A newly spawned wall can cover a remote phantom. Move normally to the
   // nearest free face, withholding attacks until outside; never teleport.
   let exit=null,best=Infinity;
   for(const w of world.obstacles)for(const q of [{x:w.x-14,y:f.y},{x:w.x+w.w+14,y:f.y},{x:f.x,y:w.y-14},{x:f.x,y:w.y+w.h+14}]){
    if(q.x<12||q.y<12||q.x>world.width-12||q.y>world.height-12||overlaps(q.x,q.y))continue;
    const d=Math.hypot(q.x-f.x,q.y-f.y);if(d<best){best=d;exit=q;}
   }
   if(exit){const step=Math.min(best,s.speed*dt);f.x+=(exit.x-f.x)/Math.max(1,best)*step;f.y+=(exit.y-f.y)/Math.max(1,best)*step;}
   f.state='REPOSITION';f.routeTime=0;f.cooldown=Math.max(f.cooldown,.1);continue;
  }
  if(!f.target||f.target.dead||f.target.isoWarp||world.targetable&&!world.targetable(f.target)||Math.hypot(f.target.x-f.x,f.target.y-f.y)>s.sense*1.2&&f.target.type!=='relic')f.target=null;
  if(f.scan<=0){f.scan=.22/(1+rank(p,'algorithm')*.12+rank(p,'predator')*.4);
   {let best=null,score=Infinity;
    for(const e of [...(world.relics||[]),...world.candidates(f.x,f.y,s.sense)]){if(e.dead||e.isoWarp||e.isoSafe>0||world.targetable&&!world.targetable(e)||e===f.unreachable&&p.phantomClock<(f.unreachableUntil||0))continue;
     const d=Math.hypot(e.x-f.x,e.y-f.y);if(d>s.sense&&e.type!=='relic')continue;
     let value=e.type==='relic'?d-100000:d;for(const other of p.phantoms)if(other!==f&&other.target===e&&!world.isBoss(e))value+=130;
     if(value<score){score=value;best=e;}}
    if(!f.target||best?.type==='relic')f.target=best;
   }
  }
  const target=f.target;
  if(!target){
   // Patrol the arena rather than escorting the ghost or remaining idle forever
   // after the pilot and a remote enemy pack move beyond the local search radius.
   f.state='HUNT';const index=(Math.floor(p.phantomClock/4)+f.id*2)%5;
   const wx=world.width*([.22,.78,.78,.22,.5][index]),wy=world.height*([.22,.22,.78,.78,.5][index]);
   const dx=wx-f.x,dy=wy-f.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,s.speed*.45*dt);
   const move=world.motion(f.x,f.y,f.x+dx/d*step,f.y+dy/d*step,10);f.x=clamp(move.x,12,world.width-12);f.y=clamp(move.y,12,world.height-12);f.angle=Math.atan2(dy,dx);continue;
  }
  if(f.lastTarget!==target){f.chain=0;f.lastTarget=target;f.routeTime=0;f.route=[];}
  const dx=target.x-f.x,dy=target.y-f.y,d=Math.hypot(dx,dy);f.angle=Math.atan2(dy,dx);
  if(d>s.range*.65+target.r||world.blocked(f.x,f.y,target.x,target.y)){
   f.state='CHASE';let aim=target;
   if(world.obstacles?.length&&world.blocked(f.x,f.y,target.x,target.y,10)){
    if(f.routeTime<=0){f.route=findRoute(f,target,world);f.routeTime=.5;if(!f.route.length){f.unreachable=target;f.unreachableUntil=p.phantomClock+1.5;f.target=null;f.scan=0;continue;}}
    while(f.route?.length&&Math.hypot(f.route[0].x-f.x,f.route[0].y-f.y)<8)f.route.shift();
    if(f.route?.length){aim=f.route[0];f.state='REPOSITION';}
   }else f.route=[];
   const mx=aim.x-f.x,my=aim.y-f.y,md=Math.max(1,Math.hypot(mx,my));
   const step=Math.min(md,s.speed*dt),nx=f.x+mx/md*step,ny=f.y+my/md*step;
   const move=world.motion(f.x,f.y,nx,ny,10);f.x=move.x;f.y=move.y;
   if(move.blocked){f.state='REPOSITION';f.routeTime=0;
    // Axis-aligned sliding avoids a tangent's tiny inward component at a wall.
    const side=f.id%2?1:-1,axisX=world.motion(f.x,f.y,f.x+Math.sign(mx||side)*step,f.y,10),axisY=world.motion(f.x,f.y,f.x,f.y+Math.sign(my||side)*step,10);
    const sx=Math.hypot(axisX.x-f.x,axisX.y-f.y),sy=Math.hypot(axisY.x-f.x,axisY.y-f.y),slide=sx>sy?axisX:axisY;f.x=slide.x;f.y=slide.y;
   }
   if(rank(p,'flash')&&f.warp<=0&&d<260&&!world.blocked(f.x,f.y,target.x,target.y)){
    const from={x:f.x,y:f.y};const move=world.motion(f.x,f.y,target.x-Math.cos(f.angle)*s.range*.5,target.y-Math.sin(f.angle)*s.range*.5,10);f.x=move.x;f.y=move.y;f.warp=2.2;p.phantomVisuals.push({type:'warp',x:from.x,y:from.y,x2:f.x,y2:f.y,angle:f.angle,life:.42,total:.42});
   }
  }
  f.x=clamp(Number.isFinite(f.x)?f.x:p.x,12,world.width-12);f.y=clamp(Number.isFinite(f.y)?f.y:p.y,12,world.height-12);
  if(Math.hypot(target.x-f.x,target.y-f.y)<=s.range+target.r&&f.cooldown<=0){
   f.state='ATTACK';f.cooldown+=s.period;if(f.cooldown<0)f.cooldown=0;
   const a=slash(p,f,world,s);f.chain++;
   // Capture position and direction. Delayed hits cannot recursively enqueue hits.
   const snapshot={...f,target:null,lastTarget:null};
   const echoes=rank(p,'requiem')?2:(rank(p,'echo')||rank(p,'orchestra')||rank(p,'matrix'))?1:0;
   for(let i=0;i<echoes;i++)p.phantomEchoes.push({frame:snapshot,delay:.13*(i+1),angle:a.angle,type:'echo',factor:.32+rank(p,'echo')*.08+rank(p,'orchestra')*.18+rank(p,'matrix')*.1});
   if(rank(p,'double')&&world.random()<rank(p,'double')*.16)p.phantomEchoes.push({frame:snapshot,delay:.09,angle:a.angle,type:'double',factor:.55});
   if(rank(p,'afterimage')&&f.chain%5===0)p.phantomEchoes.push({frame:snapshot,delay:.22,angle:a.angle,type:'echo',factor:.4});
   if(rank(p,'emperor')&&f.hits>=8){f.hits=0;slash(p,f,world,s,'emperor',.85);}
   if(rank(p,'eternal')&&f.chain%4===0)slash(p,f,world,s,'coordination',.35);
  }
 }
 if(p.phantomVisuals.length>24)p.phantomVisuals.splice(0,p.phantomVisuals.length-24);
}
const DART_TYPES=['shot','laser','charge','support','follow'];
const DART_COLORS={shot:'#86e7ff',laser:'#e9a6ff',charge:'#ffcc83',support:'#83ffd1',follow:'#c1a3ff'};
function addDart(p,random=Math.random){
 p.dartTypes??=[];const available=DART_TYPES.filter(t=>!p.dartTypes.includes(t));
 if(!available.length)return;const type=available[Math.min(available.length-1,Math.floor(random()*available.length))];p.dartTypes.push(type);
 if(p.dartActive>0)p.darts.push(makeDart(p,type,p.dartTypes.length-1));
}
function makeDart(p,type,i){return {type,id:i,x:p.x+(i-2)*14,y:p.y-35,angle:-Math.PI/2,cooldown:0,charge:0,barrier:30+stats(p).damage*.4};}
function segmentDistance(x,y,x2,y2,px,py){const dx=x2-x,dy=y2-y,t=clamp(((px-x)*dx+(py-y)*dy)/Math.max(.0001,dx*dx+dy*dy),0,1);return Math.hypot(px-x-dx*t,py-y-dy*t);}
function tickDarts(p,dt,w){
 p.dartTypes??=[];p.darts??=[];p.dartProjectiles??=[];p.dartVisuals??=[];
 p.dartVisuals=p.dartVisuals.filter(v=>(v.life-=dt)>0);
 if(!p.dartTypes.length)return;
 if(p.dartActive>0){p.dartActive=Math.max(0,p.dartActive-dt);if(!p.dartActive){p.darts=[];p.dartCooldown=Math.max(5,10-rank(p,'dartCycle'));}}
 else {p.dartCooldown=Math.max(0,p.dartCooldown-dt);if(!p.dartCooldown){p.dartActive=15+rank(p,'dartDuration')*3;p.darts=p.dartTypes.map((t,i)=>makeDart(p,t,i));}}
 const s=stats(p),power=s.damage*.5*(1+rank(p,'dartPower')*.12),speed=s.speed*.5;
 for(const f of p.darts){f.cooldown-=dt;let target=null,best=Infinity;
  if(f.type==='follow'){
   for(const e of w.pickups||[]){if(e.type!=='energy'||e.collected)continue;const d=Math.hypot(e.x-f.x,e.y-f.y);if(d<best){best=d;target=e;}}
  }else if(f.type!=='support')for(const e of w.candidates(f.x,f.y,s.sense)){
   if(e.dead||e.isoWarp||e.isoSafe>0||w.targetable&&!w.targetable(e))continue;const d=Math.hypot(e.x-f.x,e.y-f.y),value=d-(e.type==='relic'?100000:0);if(value<best){best=value;target=e;}
  }
  let aim=target||{x:p.x+Math.cos(p.phantomClock+f.id)*45,y:p.y+Math.sin(p.phantomClock+f.id)*45};
  const dx=aim.x-f.x,dy=aim.y-f.y,d=Math.max(.001,Math.hypot(dx,dy));f.angle=Math.atan2(dy,dx);
  const reach=f.type==='shot'?270:f.type==='laser'?70:f.type==='charge'?260:0;
  if(!target||d>reach){
   if(w.blocked(f.x,f.y,aim.x,aim.y,7)){
    f.routeTime=(f.routeTime||0)-dt;if(f.routeTime<=0){f.route=findRoute(f,aim,w);f.routeTime=.5;}if(f.route?.length){while(f.route.length&&Math.hypot(f.route[0].x-f.x,f.route[0].y-f.y)<8)f.route.shift();if(f.route.length)aim=f.route[0];}
   }
   const mx=aim.x-f.x,my=aim.y-f.y,md=Math.max(.001,Math.hypot(mx,my)),step=Math.min(md,speed*dt),move=w.motion(f.x,f.y,f.x+mx/md*step,f.y+my/md*step,7);f.x=clamp(move.x,10,w.width-10);f.y=clamp(move.y,10,w.height-10);
  }
  if(f.type==='support'){
   const radius=42;if(f.barrier>0){
    if(Math.hypot(f.x-p.x,f.y-p.y)<radius)p.hp=Math.min(p.maxHp,p.hp+dt*1.5*(power/16));
    if(f.cooldown<=0){f.cooldown=.5;for(const e of w.candidates(f.x,f.y,radius+50)){if(e.dead||Math.hypot(e.x-f.x,e.y-f.y)>radius+e.r)continue;w.damage(e,power*.16,{special:true,source:'phantomDart',origin:{x:f.x,y:f.y}});f.barrier=Math.max(0,f.barrier-(e.dmg||0)*.25);if(!f.barrier)break;}}
   }continue;
  }
  if(f.type==='follow'){
   if(target&&!target.collected&&Math.hypot(target.x-f.x,target.y-f.y)<20){target.collected=true;w.collect?.(target,1.2);pickup(p);}continue;
  }
  if(f.type==='charge')f.charge=Math.min(1,f.charge+dt*(1/s.period)*.32);
  if(!target||w.blocked(f.x,f.y,target.x,target.y)||Math.hypot(target.x-f.x,target.y-f.y)> (f.type==='laser'?85:600))continue;
  const angle=Math.atan2(target.y-f.y,target.x-f.x);
  if(f.type==='laser'&&f.cooldown<=0){f.cooldown=.15*s.period/.65;w.damage(target,power*.55,{special:true,source:'phantomDart',origin:{x:f.x,y:f.y}});p.dartVisuals.push({type:'laser',x:f.x,y:f.y,x2:target.x,y2:target.y,life:.12,total:.12});}
  if(f.type==='shot'&&f.cooldown<=0||f.type==='charge'&&f.charge>=1){const charged=f.type==='charge';f.cooldown=s.period*.48;f.charge=0;
   p.dartProjectiles.push({x:f.x,y:f.y,vx:Math.cos(angle)*(charged?570:470),vy:Math.sin(angle)*(charged?570:470),life:1.7,charged,damage:power*(charged?4:.32),hit:new Set()});
  }
 }
 for(const b of p.dartProjectiles){b.life-=dt;if(b.life<=0)continue;const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;if(w.blocked(ox,oy,b.x,b.y)){b.life=0;continue;}
  for(const e of w.candidates((ox+b.x)/2,(oy+b.y)/2,Math.hypot(b.x-ox,b.y-oy)/2+80)){
   if(e.dead||e.isoWarp||e.isoSafe>0||b.hit.has(e)||w.targetable&&!w.targetable(e)||segmentDistance(ox,oy,b.x,b.y,e.x,e.y)>e.r+(b.charged?7:3)||w.blocked(ox,oy,e.x,e.y))continue;
   b.hit.add(e);w.damage(e,b.damage,{special:true,source:'phantomDart',origin:{x:ox,y:oy}});if(!b.charged){b.life=0;break;}
  }
 }p.dartProjectiles=p.dartProjectiles.filter(b=>b.life>0);
}
// Use the same swept projectile collision as the ghost so fast bullets cannot
// cross a support barrier between simulation steps.
function intercept(p,b,x,y,distance){
 for(const f of p.darts||[]){if(f.type!=='support'||f.barrier<=0)continue;
  if(distance(x,y,b.x,b.y,f.x,f.y)<(42+b.r)**2){f.barrier=Math.max(0,f.barrier-b.damage);b.ttl=0;return true;}
 }return false;
}
function nova(p,world){for(const f of p.phantoms)f.novaTick=0;p.phantomNova=6+Math.min(4,Math.max(0,p.novaRadius-180)/90);const radius=Math.min(480,p.novaRadius)*(rank(p,'novaSanctuary')?1.5:1);
 world.clear(p.x,p.y,radius);if(rank(p,'novaSanctuary'))p.shield=Math.min(p.shieldMax,p.shield+40+world.novaDamage()*.1);
}
function pickup(p){if(rank(p,'relay')||rank(p,'cycle'))p.phantomRelay=2.4;}
function dashEnd(p){p.iframes=Math.max(p.iframes,.2+.07*rank(p,'dash'));if(rank(p,'veil')){p.phantomVeil=.65;p.phantomVeilShield=20+rank(p,'barrier')*8;}}
function collection(p,dt,orbs){p.phantomCollectClock+=dt;const field=rank(p,'field'),line=rank(p,'line'),astral=rank(p,'collector'),pulse=astral&&p.phantomCollectClock>=Math.max(3,8-astral);
 if(pulse)p.phantomCollectClock=0;
 const radius=p.magnet+(line?80+line*35:0)+(pulse?180+astral*90:0)+(field?120:0);
 if(line||pulse||field)for(const e of orbs){if(e.type!=='energy'||e.collected)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d>p.magnet&&d<radius&&d>1){const step=Math.min(d-p.magnet*.9,dt*(110+line*35+(pulse?200:0)));e.x+=dx/d*step;e.y+=dy/d*step;}}
}
function drawGhost(ctx){ctx.fillStyle='#f5f8ff';ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(15,13);ctx.lineTo(0,6);ctx.lineTo(-15,13);ctx.closePath();ctx.fill();ctx.stroke();}
function hull(ctx,color,primary=true){
 ctx.fillStyle='#19283f';ctx.strokeStyle=color;ctx.lineWidth=1.7;
 ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(7,-10);ctx.lineTo(22,14);ctx.lineTo(9,9);ctx.lineTo(0,17);ctx.lineTo(-9,9);ctx.lineTo(-22,14);ctx.lineTo(-7,-10);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=primary?'#e4f4ff':'#a5b7d9';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(5,5);ctx.lineTo(0,11);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#86ddff';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*7,-3);ctx.lineTo(side*15,9);ctx.lineTo(side*10,7);ctx.stroke();}
 ctx.fillStyle='#d3a8ff';ctx.fillRect(-2,-6,4,10);
}
function draw(p,ctx){
 for(const f of p.phantoms){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle+Math.PI/2);hull(ctx,p.evolutionTint||(f.primary?'#bcefff':'#849fcf'),f.primary);ctx.globalAlpha=.5;ctx.strokeStyle='#9fbdff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,15);ctx.lineTo(0,27+Math.sin((p.phantomClock||0)*20)*5);ctx.lineTo(6,15);ctx.stroke();ctx.restore();}
 for(const v of p.phantomVisuals){ctx.save();ctx.globalAlpha=Math.max(0,v.life/v.total);ctx.strokeStyle=v.nova?'#ffffff':p.evolutionTint||'#a9cfff';
  if(v.type==='warp'){
   ctx.lineWidth=8;ctx.globalAlpha*=.25;ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.lineTo(v.x2,v.y2);ctx.stroke();ctx.globalAlpha=Math.max(0,v.life/v.total);ctx.lineWidth=1.5;ctx.setLineDash([9,7]);ctx.stroke();ctx.setLineDash([]);
   for(let i=0;i<4;i++){ctx.save();ctx.globalAlpha*=.22+i*.1;ctx.translate(v.x+(v.x2-v.x)*i/3,v.y+(v.y2-v.y)*i/3);ctx.rotate(v.angle+Math.PI/2);hull(ctx,'#b9a6ff',false);ctx.restore();}
  }else{
   ctx.lineWidth=v.nova?10:7;ctx.globalAlpha*=.3;ctx.beginPath();ctx.arc(v.x,v.y,v.range,v.angle-v.arc/2,v.angle+v.arc/2);ctx.stroke();ctx.globalAlpha=Math.max(0,v.life/v.total);ctx.lineWidth=2.5;ctx.strokeStyle='#f2fcff';ctx.stroke();
   ctx.lineWidth=1;ctx.strokeStyle='#9eb4ff';ctx.beginPath();ctx.arc(v.x,v.y,v.range*.86,v.angle-v.arc*.43,v.angle+v.arc*.43);ctx.stroke();
  }ctx.restore();
 }
 for(const f of p.darts||[]){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle+Math.PI/2);ctx.scale(.52,.52);hull(ctx,DART_COLORS[f.type]);ctx.restore();
  ctx.save();ctx.strokeStyle=DART_COLORS[f.type];ctx.fillStyle=DART_COLORS[f.type];ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText({shot:'S',laser:'L',charge:'C',support:'+',follow:'XP'}[f.type],f.x,f.y+23);
  if(f.type==='support'&&f.barrier>0){ctx.globalAlpha=.55;ctx.setLineDash([10,5]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,42,0,Math.PI*2);ctx.stroke();}
  if(f.type==='charge'){ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,17,-Math.PI/2,-Math.PI/2+Math.PI*2*f.charge);ctx.stroke();}ctx.restore();
 }
 for(const b of p.dartProjectiles||[]){ctx.save();ctx.strokeStyle=b.charged?'#ffcc83':'#86e7ff';ctx.lineWidth=b.charged?7:3;const length=b.charged?.045:.018;ctx.beginPath();ctx.moveTo(b.x-b.vx*length,b.y-b.vy*length);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
 for(const v of p.dartVisuals||[]){ctx.save();ctx.globalAlpha=v.life/v.total;ctx.strokeStyle='#efb5ff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.lineTo(v.x2,v.y2);ctx.stroke();ctx.restore();}
}
root.AnkinPhantom={init,sync,addDart,tickDarts,intercept,rank,addRank,level,stats,tick,nova,pickup,dashEnd,collection,drawGhost,draw};
})(globalThis);
