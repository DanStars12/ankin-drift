import {test,expect} from '@playwright/test';
import {renderBatchSources,legacyGrid,legacyHatching} from '../scripts/render-batch-harness.mjs';
const sources=renderBatchSources();
test('batched backdrop and ENGAGE retain pixel coverage across mobile, desktop and resolution changes',async({page})=>{
 test.setTimeout(60000);
 await page.goto('./');
 const results=await page.evaluate(({sources,grid,hatch})=>{
  const candidateGrid=Function('return ('+sources.drawBackdropGrid+')')(),candidateHatch=Function('return ('+sources.drawEngageHatching+')')();
  const baseGrid=Function('return ('+grid+')')(),baseHatch=Function('return ('+hatch+')')();
  const rows=[];
  for(const [width,height,scale]of [[320,740,.69],[390/.69,844/.69,1.1316],[1280,800,1],[1280,800,.76],[1280,800,2],[800,1280,.82]]){
   for(const time of [0,.123,1811.37])for(const kind of ['grid','hatch']){
    const canvases=[document.createElement('canvas'),document.createElement('canvas')];
    const images=canvases.map((c,i)=>{c.width=Math.round(width*scale);c.height=Math.round(height*scale);const g=c.getContext('2d');
     g.scale(scale,scale);g.fillStyle='#152440';g.fillRect(0,0,width,height);
     if(kind==='grid')(i?candidateGrid:baseGrid)(g,width,height,time);
     else for(const wall of [{x:120.3,y:80.7,w:320.2,h:180.4},{x:-40,y:height-100,w:250,h:340}]){
      g.save();g.globalAlpha=.45*(time===0?1:.37);g.strokeStyle='#78f1ed';g.lineWidth=2;
      g.beginPath();g.rect(wall.x,wall.y,wall.w,wall.h);g.clip();(i?candidateHatch:baseHatch)(g,wall);g.restore();
     }
     return g.getImageData(0,0,c.width,c.height).data;
    });
    let differing=0,max=0;for(let i=0;i<images[0].length;i++){const d=Math.abs(images[0][i]-images[1][i]);if(d)differing++;max=Math.max(max,d)}
    rows.push({width,height,scale,time,kind,differing,max});
    for(const c of canvases){c.width=1;c.height=1;}
   }
  }
  return rows;
 },{sources,grid:String(legacyGrid),hatch:String(legacyHatching)});
 expect(results).toHaveLength(36);for(const row of results)expect(row.differing,JSON.stringify(row)).toBe(0);
});

test('render submission cost: alternating real Canvas draws with synchronous readback',async({page},testInfo)=>{
 test.setTimeout(120000);await page.goto('./');
 const result=await page.evaluate(({sources,grid,hatch})=>{
  const draws=[{grid:Function('return ('+grid+')')(),hatch:Function('return ('+hatch+')')()},
   {grid:Function('return ('+sources.drawBackdropGrid+')')(),hatch:Function('return ('+sources.drawEngageHatching+')')()}];
  const contexts=draws.map(()=>{const c=document.createElement('canvas');c.width=1280;c.height=800;return c.getContext('2d')});
  const walls=[{x:80,y:130,w:280,h:160},{x:700,y:80,w:350,h:200},{x:200,y:500,w:330,h:180},{x:900,y:510,w:220,h:190}];
  function run(i){const g=contexts[i],d=draws[i],start=performance.now();
   for(let frame=0;frame<60;frame++){
    g.fillStyle='#152440';g.fillRect(0,0,1280,800);d.grid(g,1280,800,frame/60);
    for(const wall of walls){g.save();g.beginPath();g.rect(wall.x,wall.y,wall.w,wall.h);g.clip();g.strokeStyle='#78f1ed';g.lineWidth=2;g.globalAlpha=.45;d.hatch(g,wall);g.restore()}
   }
   // Flush deferred Canvas work; this is a paint-kernel diagnostic, not game FPS.
   const pixel=g.getImageData(0,0,1280,800).data;let checksum=0;for(let p=0;p<pixel.length;p+=4)checksum+=pixel[p];
   return {ms:performance.now()-start,checksum};
  }
  for(let warm=0;warm<2;warm++){run(0);run(1)}
  const baseline=[],candidate=[];let equal=true;
  for(let repeat=0;repeat<5;repeat++){
   const values=[];for(const i of repeat%2?[1,0]:[0,1])values[i]=run(i);
   equal&&=values[0].checksum===values[1].checksum;baseline.push(values[0].ms);candidate.push(values[1].ms);
  }
  const median=a=>[...a].sort((a,b)=>a-b)[2];
  for(const g of contexts){g.canvas.width=1;g.canvas.height=1}
  return {framesPerSample:60,baselineMs:baseline,candidateMs:candidate,ratio:median(candidate)/median(baseline),equal};
 },{sources,grid:String(legacyGrid),hatch:String(legacyHatching)});
 expect(result.equal).toBe(true);
 await testInfo.attach('render-batching.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 console.log('RENDER_BATCH_BENCHMARK='+JSON.stringify(result));
});
