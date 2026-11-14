/* Shared DARK weapons. Allies live outside the enemy/reward pool. */
(function(root){
'use strict';
const boss=e=>['minor','major','unique','ultimate','ultimatePart','relic'].includes(e.type);
function init(p){p.darkVirusPower=0;p.darkVirusDuration=0;p.darkPower=0;p.darkHaste=0;p.darkDread=0;p.darkCommand=0;p.darkResonance=0;p.darkTerror=0;p.darkFear=0;p.darkVirus=0;p.darkFearTimer=0;p.darkVirusTimer=0;p.darkFields=[];p.darkAllies=[];p.darkVisuals=[];}
function fear(e,p,seconds=2){if(e.dead)return;if(boss(e)){e.darkWeak=Math.max(e.darkWeak||0,seconds*.6);return;}if((e.fearResist||0)>0)return;e.fear=Math.max(e.fear||0,seconds+(p.darkDread||0)*.25);e.fearResist=seconds+2;}
function convert(e,p,random){if(boss(e)||e.darkConverted||p.darkAllies.length>=3||random()>.3)return false;e.darkConverted=true;
 p.darkAllies.push({x:e.x,y:e.y,r:e.r,type:e.type,color:'#b5a3f5',hp:Math.max(30,Math.min(500,e.maxHp*.5)),life:5,cooldown:0,spd:Math.min(250,e.spd||100),damage:Math.min(160,Math.max(18,e.dmg*2))*(1+(p.darkCommand||0)*.15)});return true;
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
 if(p.darkFear>0){p.darkFearTimer=(p.darkFearTimer||0)-dt;if(p.darkFearTimer<=0){p.darkFearTimer=Math.max(3,5-(p.darkHaste||0)*.35);const o=w.origin,a=o.angle??Math.atan2(p.dy,p.dx),r=180+p.darkFear*12;
  p.darkVisuals.push({x:o.x,y:o.y,angle:a,range:r,life:.3,type:'fear'});
  for(const e of w.candidates(o.x,o.y,r+60)){if(e.dead)continue;const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));
   if(d>r+e.r||Math.abs(delta)>Math.PI*.38)continue;const damage=(24+p.darkFear*12)*(1+(p.darkPower||0)*.15);w.damage(e,damage,{special:true,source:'darkFear',origin:{x:o.x,y:o.y}});if(w.random()<Math.min(.6,.3+(p.darkFear-1)*.04))fear(e,p);if(p.darkTerror)e.darkWeak=Math.max(e.darkWeak||0,1.5);affect(e,p,damage,'A',w);
  }
 }}
 if(p.darkVirus>0){p.darkVirusTimer=(p.darkVirusTimer||0)-dt;if(p.darkVirusTimer<=0){p.darkVirusTimer=Math.max(3.5,5.5-(p.darkHaste||0)*.35);const o=w.origin,target=w.target(o.x,o.y);if(target){const combo=w.combo('dark','B');p.darkFields.push({x:target.x,y:target.y,size:55+p.darkVirus*5+(combo?.sub==='rock'?25:0),life:3+(p.darkVirusDuration||0)*.75,tick:0,angle:0});if(p.darkFields.length>3)p.darkFields.shift();}}}
 for(const f of p.darkFields){f.life-=dt;f.angle=((f.angle||0)+dt*.7)%(Math.PI*2);f.tick-=dt;if(f.tick<=0){f.tick+=.25;
  for(const e of w.candidates(f.x,f.y,f.size*1.5+70)){const dx=e.x-f.x,dy=e.y-f.y,c=Math.cos(f.angle),s=Math.sin(f.angle);if(e.dead||Math.abs(dx*c+dy*s)>f.size+e.r||Math.abs(-dx*s+dy*c)>f.size+e.r)continue;
   const damage=(24+p.darkVirus*14)*.25*(1+(p.darkPower||0)*.15)*(1+(p.darkVirusPower||0)*.25)*(p.darkResonance&&e.fear>0?1.25:1);w.damage(e,damage,{special:true,source:'darkVirus',origin:{x:f.x,y:f.y}});affect(e,p,damage,'B',w);if(e.dead)convert(e,p,w.random);
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
function mascot(ctx,x,y,bear){ctx.save();ctx.translate(x,y);
 if(bear){
  ctx.fillStyle='#b38360';for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*10,-10,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e6ba98';ctx.beginPath();ctx.arc(side*10,-10,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b38360';}
  ctx.beginPath();ctx.ellipse(0,1,14,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9c8a2';ctx.beginPath();ctx.ellipse(0,6,7,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#342534';for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*5,-1,2.2,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.ellipse(0,4,2.8,2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#513545';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,5,4,.2,Math.PI-.2);ctx.stroke();
  ctx.fillStyle='#e59ca4';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*9,4,3,1.5,0,0,Math.PI*2);ctx.fill();}
 }else{
  ctx.fillStyle='#4e397f';ctx.strokeStyle='#c19bf2';ctx.lineWidth=1.4;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*6,-4);ctx.quadraticCurveTo(side*18,-22,side*31,-12);ctx.lineTo(side*25,9);ctx.quadraticCurveTo(side*20,0,side*16,11);ctx.quadraticCurveTo(side*12,3,side*7,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(side*7,-3);ctx.lineTo(side*25,-11);ctx.lineTo(side*16,10);ctx.stroke();}
  ctx.fillStyle='#9075bd';ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(-9,-21);ctx.lineTo(-2,-11);ctx.lineTo(3,-11);ctx.lineTo(10,-21);ctx.lineTo(11,-5);ctx.arc(0,0,12,-.4,Math.PI+.4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffc778';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*5,-1,3,2.3,-side*.25,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff7e2';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*5,5);ctx.lineTo(side*2,5);ctx.lineTo(side*3,10);ctx.fill();}
 }ctx.restore();}
function draw(p,ctx){
 if(p.shipType==='dog'){if(p.darkFear>0)mascot(ctx,p.x-36,p.y-20,false);if(p.darkVirus>0)mascot(ctx,p.x+36,p.y-20,true);}
 for(const f of p.darkFields||[]){ctx.save();ctx.fillStyle='#5d258544';ctx.strokeStyle='#c19bff';ctx.lineWidth=2;ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.fillRect(-f.size,-f.size,f.size*2,f.size*2);ctx.strokeRect(-f.size,-f.size,f.size*2,f.size*2);ctx.setLineDash([8,10]);ctx.strokeStyle='#e5caff';ctx.strokeRect(-f.size+8,-f.size+8,f.size*2-16,f.size*2-16);ctx.restore();}
 for(const a of p.darkAllies||[]){ctx.save();ctx.globalAlpha=Math.min(1,a.life);ctx.fillStyle=a.color;ctx.strokeStyle='#c6ffe6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#82ffcb';ctx.setLineDash([7,4]);ctx.beginPath();ctx.arc(a.x,a.y,a.r+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#82ffcb';ctx.fillRect(a.x-a.r,a.y+a.r+10,a.r*2*Math.min(1,a.life/5),3);ctx.fillStyle='#ffffff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('♥ ALLY '+a.life.toFixed(1),a.x,a.y-a.r-5);ctx.restore();}
 for(const v of p.darkVisuals||[]){ctx.save();ctx.globalAlpha=Math.max(0,v.life/.3);ctx.strokeStyle='#cba1ff';ctx.lineWidth=3;ctx.beginPath();if(v.type==='ally'){ctx.moveTo(v.x,v.y);ctx.lineTo(v.x2,v.y2);}else {
  for(let i=0;i<3;i++){ctx.lineWidth=i===0?6:2;ctx.strokeStyle=i===0?'#914fc0':'#e1baff';ctx.beginPath();ctx.arc(v.x,v.y,v.range*(1-i*.13),v.angle-Math.PI*.38+i*.08,v.angle+Math.PI*.38-i*.08);ctx.stroke();}
  for(let i=-3;i<=3;i++){const a=v.angle+i*.34,r=v.range*.88;ctx.beginPath();ctx.moveTo(v.x+Math.cos(a)*r,v.y+Math.sin(a)*r);ctx.lineTo(v.x+Math.cos(a+.025)*(r+14),v.y+Math.sin(a+.025)*(r+14));ctx.stroke();}
  ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.lineTo(v.x+Math.cos(v.angle-.38*Math.PI)*v.range,v.y+Math.sin(v.angle-.38*Math.PI)*v.range);ctx.moveTo(v.x,v.y);ctx.lineTo(v.x+Math.cos(v.angle+.38*Math.PI)*v.range,v.y+Math.sin(v.angle+.38*Math.PI)*v.range);
 }ctx.stroke();ctx.restore();}
}
root.AnkinDark={init,fear,convert,tick,interrupt,enemyTarget,intercept,draw,drawMascot:mascot,isBoss:boss};
})(globalThis);
