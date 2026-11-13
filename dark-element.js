/* Shared DARK weapons. Allies live outside the enemy/reward pool. */
(function(root){
'use strict';
const boss=e=>['minor','major','unique','ultimate','ultimatePart','relic'].includes(e.type);
function init(p){p.darkFear=0;p.darkVirus=0;p.darkFearTimer=0;p.darkVirusTimer=0;p.darkFields=[];p.darkAllies=[];p.darkVisuals=[];}
function fear(e,p,seconds=2){if(e.dead)return;if(boss(e)){e.darkWeak=Math.max(e.darkWeak||0,seconds*.6);return;}if((e.fearResist||0)>0)return;e.fear=Math.max(e.fear||0,seconds);e.fearResist=seconds+2;}
function convert(e,p,random){if(boss(e)||e.darkConverted||p.darkAllies.length>=3||random()>.3)return false;e.darkConverted=true;
 p.darkAllies.push({x:e.x,y:e.y,r:e.r,type:e.type,color:'#b5a3f5',hp:Math.max(30,Math.min(500,e.maxHp*.5)),life:5,cooldown:0,spd:Math.min(250,e.spd||100),damage:Math.min(160,Math.max(18,e.dmg*2))});return true;
}
function affect(e,p,damage,slot,w){
 const combo=w.combo('dark',slot);if(!combo)return;
 if(combo.sub==='fire')w.burn(e,damage*.3,2);
 if(combo.sub==='ice')w.chill(e,2,slot==='A'?.2:.35);
 if(combo.sub==='thunder'&&(e.darkArcUntil||0)<=w.time){e.darkArcUntil=w.time+.8;w.chain(e,damage*.3);}
 if(combo.sub==='wind'){if(slot==='A')fear(e,p,2.6);else{const dx=w.origin.x-e.x,dy=w.origin.y-e.y,d=Math.max(1,Math.hypot(dx,dy));e.x+=dx/d*8;e.y+=dy/d*8;}}
 if(combo.sub==='rock'){if(slot==='A')e.darkWeak=Math.max(e.darkWeak||0,2);else w.slow(e,2.5);}
}
function tick(p,dt,w){
 p.darkFields??=[];p.darkAllies??=[];p.darkVisuals??=[];
 p.darkVisuals=p.darkVisuals.filter(v=>(v.life-=dt)>0);
 if(p.darkFear>0){p.darkFearTimer=(p.darkFearTimer||0)-dt;if(p.darkFearTimer<=0){p.darkFearTimer=5;const o=w.origin,a=o.angle??Math.atan2(p.dy,p.dx),r=180+p.darkFear*12;
  p.darkVisuals.push({x:o.x,y:o.y,angle:a,range:r,life:.3,type:'fear'});
  for(const e of w.candidates(o.x,o.y,r+60)){if(e.dead)continue;const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));
   if(d>r+e.r||Math.abs(delta)>Math.PI*.38)continue;const damage=24+p.darkFear*12;w.damage(e,damage,{special:true,source:'darkFear',origin:{x:o.x,y:o.y}});if(w.random()<Math.min(.6,.3+(p.darkFear-1)*.04))fear(e,p);affect(e,p,damage,'A',w);
  }
 }}
 if(p.darkVirus>0){p.darkVirusTimer=(p.darkVirusTimer||0)-dt;if(p.darkVirusTimer<=0){p.darkVirusTimer=5.5;const o=w.origin,target=w.target(o.x,o.y);if(target){const combo=w.combo('dark','B');p.darkFields.push({x:target.x,y:target.y,size:55+p.darkVirus*5+(combo?.sub==='rock'?25:0),life:3,tick:0});if(p.darkFields.length>3)p.darkFields.shift();}}}
 for(const f of p.darkFields){f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick+=.25;
  for(const e of w.candidates(f.x,f.y,f.size*1.5+70)){if(e.dead||Math.abs(e.x-f.x)>f.size+e.r||Math.abs(e.y-f.y)>f.size+e.r)continue;
   const damage=(24+p.darkVirus*14)*.25;w.damage(e,damage,{special:true,source:'darkVirus',origin:{x:f.x,y:f.y}});affect(e,p,damage,'B',w);if(e.dead)convert(e,p,w.random);
  }
 }}p.darkFields=p.darkFields.filter(f=>f.life>0);
 for(const a of p.darkAllies){a.life-=dt;a.cooldown-=dt;if(a.hp<=0||a.life<=0)continue;let target=null,best=600**2;
  for(const e of w.candidates(a.x,a.y,600)){if(e.dead)continue;const d=(e.x-a.x)**2+(e.y-a.y)**2;if(d<best){best=d;target=e;}}
  if(!target)continue;const dx=target.x-a.x,dy=target.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),r=a.type==='shooter'?260:a.r+target.r+20;
  if(d>r){const step=Math.min(d-r,a.spd*dt);a.x+=dx/d*step;a.y+=dy/d*step;}
  if(d<=r+5&&a.cooldown<=0){a.cooldown=a.type==='shooter'?1.1:.7;w.damage(target,a.damage,{special:true,source:'darkAlly',noConversion:true,origin:{x:a.x,y:a.y}});p.darkVisuals.push({x:a.x,y:a.y,x2:target.x,y2:target.y,life:.14,type:'ally'});}
 }p.darkAllies=p.darkAllies.filter(a=>a.hp>0&&a.life>0);
}
function interrupt(e,p,dt,w){e.fearResist=Math.max(0,(e.fearResist||0)-dt);e.darkWeak=Math.max(0,(e.darkWeak||0)-dt);
 if(!e.fear||e.fear<=0||boss(e))return false;e.fear=Math.max(0,e.fear-dt);const dx=e.x-p.x,dy=e.y-p.y,d=Math.max(1,Math.hypot(dx,dy));e.x=Math.max(e.r,Math.min(w.width-e.r,e.x+dx/d*e.spd*dt));e.y=Math.max(e.r,Math.min(w.height-e.r,e.y+dy/d*e.spd*dt));return true;
}
function enemyTarget(e,p){if(boss(e))return p;let target=p,best=(p.x-e.x)**2+(p.y-e.y)**2;for(const a of p.darkAllies||[]){if(a.hp<=0||a.life<=0)continue;const d=(a.x-e.x)**2+(a.y-e.y)**2;if(d<best){best=d;target=a;}}return target;}
function intercept(p,b,x,y,distance){for(const a of p.darkAllies||[]){if(a.hp<=0||a.life<=0)continue;if(distance(x,y,b.x,b.y,a.x,a.y)<(a.r+b.r)**2){a.hp-=b.damage;b.ttl=0;return true;}}return false;}
function mascot(ctx,x,y,bear){ctx.save();ctx.translate(x,y);ctx.fillStyle=bear?'#bd9878':'#a38ad5';ctx.strokeStyle='#eadfff';ctx.lineWidth=1.5;
 if(bear){ctx.beginPath();ctx.arc(-11,-10,6,0,Math.PI*2);ctx.arc(11,-10,6,0,Math.PI*2);ctx.fill();ctx.fillRect(-13,-10,26,23);ctx.strokeRect(-13,-10,26,23);}else{ctx.beginPath();ctx.moveTo(-4,-4);ctx.quadraticCurveTo(-23,-18,-26,3);ctx.lineTo(-10,6);ctx.moveTo(4,-4);ctx.quadraticCurveTo(23,-18,26,3);ctx.lineTo(10,6);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#ffffff';for(const x of [-5,5]){ctx.beginPath();ctx.ellipse(x,-1,3.6,4.5,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#201c32';for(const x of [-5,5]){ctx.beginPath();ctx.arc(x,-.5,1.8,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(0,6,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function draw(p,ctx){
 if(p.shipType==='dog'){if(p.darkFear>0)mascot(ctx,p.x-36,p.y-20,false);if(p.darkVirus>0)mascot(ctx,p.x+36,p.y-20,true);}
 for(const f of p.darkFields||[]){ctx.save();ctx.fillStyle='#5d258544';ctx.strokeStyle='#c19bff';ctx.lineWidth=2;ctx.fillRect(f.x-f.size,f.y-f.size,f.size*2,f.size*2);ctx.strokeRect(f.x-f.size,f.y-f.size,f.size*2,f.size*2);ctx.restore();}
 for(const a of p.darkAllies||[]){ctx.save();ctx.globalAlpha=Math.min(1,a.life);ctx.fillStyle=a.color;ctx.strokeStyle='#c6ffe6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ALLY '+a.life.toFixed(1),a.x,a.y-a.r-5);ctx.restore();}
 for(const v of p.darkVisuals||[]){ctx.save();ctx.globalAlpha=Math.max(0,v.life/.3);ctx.strokeStyle='#cba1ff';ctx.lineWidth=3;ctx.beginPath();if(v.type==='ally'){ctx.moveTo(v.x,v.y);ctx.lineTo(v.x2,v.y2);}else ctx.arc(v.x,v.y,v.range,v.angle-Math.PI*.38,v.angle+Math.PI*.38);ctx.stroke();ctx.restore();}
}
root.AnkinDark={init,fear,convert,tick,interrupt,enemyTarget,intercept,draw,isBoss:boss};
})(globalThis);
