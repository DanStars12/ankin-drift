import {test,expect} from '@playwright/test';import{readFileSync}from'node:fs';
test.use({trace:'off'});
const workload=JSON.parse(readFileSync(new URL('./performance.spec.mjs',import.meta.url),'utf8').match(/^const TEST_HOOK = ("[^\n]+");/)[1]);
const setup=readFileSync(new URL('./tactical-performance.spec.mjs',import.meta.url),'utf8').match(/const hook=workload\+String.raw`([\s\S]*?)`;/)[1];
const flags=readFileSync(new URL('./tactical-performance.spec.mjs',import.meta.url),'utf8').match(/const flags=(\{[\s\S]*?\n\});/)[1];
const hook=workload+setup+'const fusionDiagFlags='+flags+';'+String.raw`
const fusionDiagNative={split:splitWindMagma,paint:weaponPaint,impact:fusionImpact,glow:neonBlur,enemy:enemyDraw};
window.__fusionDiagSetup=variant=>{
 splitWindMagma=fusionDiagNative.split;weaponPaint=fusionDiagNative.paint;fusionImpact=fusionDiagNative.impact;neonBlur=fusionDiagNative.glow;enemyDraw=fusionDiagNative.enemy;
 const cfg=window.__tacticalPerfSetup({ship:'dog',flags:fusionDiagFlags.dog,fused:true});
 if(variant==='noSplit')splitWindMagma=()=>{};
 if(variant==='noGradient')weaponPaint=(g,main,slot,x1,y1,x2,y2,base)=>fusedColor(main,slot)||base;
 if(variant==='noImpact')fusionImpact=()=>{};
 if(variant==='noGlow')neonBlur=()=>0;
 if(variant==='noBurn')enemyDraw=e=>{const burn=e.burn;try{e.burn=0;fusionDiagNative.enemy(e);}finally{e.burn=burn;}};
 return cfg;
};
window.__fusionDiagSnapshot=()=>({zones:zones.length,children:zones.filter(z=>z.splitDepth).length,burning:enemies.filter(e=>e.burn>0).length,slow:enemies.filter(e=>e.slow>0).length,enemies:enemies.length,shots:shots.length});
`;
test('fusion stress ablation: isolate simulation, gradient, glow and burning costs',async({page},info)=>{
 test.skip(process.env.ANKIN_FUSION_DIAG!=='1','Dedicated diagnostic only.');test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{const r=await route.fetch(),html=await r.text(),anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";expect(html).toContain(anchor);await route.fulfill({response:r,body:html.replace(anchor,hook+'\n'+anchor)});});
 await page.goto('./');const variants=['full','noSplit','noGradient','noImpact','noGlow','noBurn'],rows=[];
 for(let repeat=0;repeat<2;repeat++)for(const variant of repeat?[...variants].reverse():variants){
  await page.evaluate(v=>window.__fusionDiagSetup(v),variant);await expect(page.locator('#overlay')).toBeHidden();await expect(page.locator('#hud')).toBeVisible();
  for(let i=0;i<8;i++){await page.keyboard.press('Space');await page.waitForTimeout(500);}
  const row=await page.evaluate(()=>({report:window.ankinPerformanceReport(),counts:window.__fusionDiagSnapshot()}));expect(row.report.frame.samples).toBeGreaterThan(15);expect(errors).toEqual([]);rows.push({variant,repeat,...row});
 }
 await info.attach('fusion-ablation.json',{body:JSON.stringify(rows,null,2),contentType:'application/json'});console.log('FUSION_ABLATION='+JSON.stringify(rows));
});
