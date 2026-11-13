/* PHANTOM FRAME: deterministic combat-time AI; no DOM, pickup collection or enemy targeting side effects. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rank=(p,k)=>p.phantomRanks?.[k]||0;
function init(p){
 p.phantomLevel=1;p.phantomOverflow=0;p.phantomRanks={};p.phantoms=[];p.phantomEchoes=[];p.phantomVisuals=[];
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
  if(e.dead||e.isoWarp||e.isoSafe>0||attack.hit.has(e))continue;
  const dx=e.x-f.x,dy=e.y-f.y,d=Math.hypot(dx,dy);if(d>range+e.r)continue;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
  if(!nova&&Math.abs(delta)>s.angle/2+Math.asin(Math.min(1,e.r/Math.max(1,d))))continue;
  if(!nova&&world.blocked(f.x,f.y,e.x,e.y))continue;
  attack.hit.add(e);let damage=(nova?world.novaDamage()*.24:s.damage)*factor*(f.primary?1:.6);
  if(!nova){const crit=rank(p,'critical')*.08+(p.crit||0);if(world.random()<Math.min(.97,crit))damage*=p.critMult||1.8;
   if(world.isBoss(e))damage*=p.bossBane||1;damage*=1+(rank(p,'oath')?Math.min(.3,f.chain*.03):0);}
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
 const s=stats(p);
 for(const v of p.phantomVisuals)v.life-=dt;p.phantomVisuals=p.phantomVisuals.filter(v=>v.life>0);
 for(const echo of p.phantomEchoes){echo.delay-=dt;if(echo.delay<=0){slash(p,echo.frame,world,s,echo.type,echo.factor,echo.angle);echo.done=true;}}
 p.phantomEchoes=p.phantomEchoes.filter(e=>!e.done);
 for(const f of p.phantoms){
  f.cooldown-=dt;f.scan-=dt;f.warp=Math.max(0,f.warp-dt);f.routeTime=Math.max(0,(f.routeTime||0)-dt);
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
  if(!f.target||f.target.dead||f.target.isoWarp||Math.hypot(f.target.x-f.x,f.target.y-f.y)>s.sense*1.2)f.target=null;
  if(f.scan<=0){f.scan=.22/(1+rank(p,'algorithm')*.12+rank(p,'predator')*.4);
   if(!f.target){let best=null,score=Infinity;
    for(const e of world.candidates(f.x,f.y,s.sense)){if(e.dead||e.isoWarp||e.isoSafe>0)continue;
     const d=Math.hypot(e.x-f.x,e.y-f.y);if(d>s.sense)continue;
     let value=d;for(const other of p.phantoms)if(other!==f&&other.target===e&&!world.isBoss(e))value+=130;
     if(value<score){score=value;best=e;}}
    f.target=best;
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
    if(f.routeTime<=0){f.route=findRoute(f,target,world);f.routeTime=.5;}
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
    const move=world.motion(f.x,f.y,target.x-Math.cos(f.angle)*s.range*.5,target.y-Math.sin(f.angle)*s.range*.5,10);f.x=move.x;f.y=move.y;f.warp=2.2;
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
   if(rank(p,'emperor')&&f.hits>=8){f.hits=0;slash(p,f,world,s,'emperor',.85);}
   if(rank(p,'eternal')&&f.chain%4===0)slash(p,f,world,s,'coordination',.35);
   if(p.phantomNova>0&&rank(p,'novaTempest'))slash(p,f,world,s,'nova');
  }
 }
}
function nova(p,world){p.phantomNova=6+Math.min(4,Math.max(0,p.novaRadius-180)/90);const radius=Math.min(480,p.novaRadius)*(rank(p,'novaSanctuary')?1.5:1);
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
function draw(p,ctx){
 for(const f of p.phantoms){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle+Math.PI/2);ctx.fillStyle=f.primary?'#e4ecf5':'#9cabbf';ctx.strokeStyle='#f4fbff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(13,12);ctx.lineTo(0,5);ctx.lineTo(-13,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=f.primary?'#ffffff':'#899de8';ctx.fillRect(-2,-5,4,8);ctx.restore();}
 for(const v of p.phantomVisuals){ctx.save();ctx.globalAlpha=Math.max(0,v.life/v.total)*.8;ctx.strokeStyle=v.nova?'#ffffff':p.evolutionTint||'#cfdfff';ctx.lineWidth=v.nova?7:4;ctx.beginPath();ctx.arc(v.x,v.y,v.range,v.angle-v.arc/2,v.angle+v.arc/2);ctx.stroke();ctx.restore();}
}
root.AnkinPhantom={init,sync,rank,addRank,level,stats,tick,nova,pickup,dashEnd,collection,drawGhost,draw};
})(globalThis);
