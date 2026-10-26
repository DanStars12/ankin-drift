import { test, expect } from '@playwright/test';

function watchFailures(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  return errors;
}

test('game starts, simulation advances, pauses and resumes', async ({ page, isMobile }, testInfo) => {
  const errors = watchFailures(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/ANKIN DRIFT/);
  await page.locator(`[data-control="${isMobile ? 'mobile' : 'desktop'}"]`).click();
  await expect(page.locator('#game')).toBeVisible();
  const start = page.locator('#start');
  if (isMobile) await start.tap();
  else await start.click();
  await expect(page.locator('#guideContinue')).toBeVisible();
  if (isMobile) await page.locator('#guideContinue').tap();
  else await page.locator('#guideContinue').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#hudWave')).not.toHaveText('00:00');
  expect(await page.locator('#game').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some(value => value !== 0);
  })).toBe(true);
  if (isMobile) {
    await expect(page.locator('#dashTouch')).toBeVisible();
    await expect(page.locator('#novaTouch')).toBeVisible();
    await page.locator('#dashTouch').tap();
    await page.locator('#pauseButton').tap();
  } else {
    await page.keyboard.press('ArrowRight');
    await page.locator('#pauseButton').click();
  }
  await expect(page.locator('#resume')).toBeVisible();
  const paused = await page.locator('#hudWave').innerText();
  // Wait beyond the clock's one-second precision to detect a broken pause.
  await page.waitForTimeout(1200);
  await expect(page.locator('#hudWave')).toHaveText(paused);
  if (isMobile) await page.locator('#resume').tap();
  else await page.locator('#resume').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#hudWave')).not.toHaveText(paused);
  await page.screenshot({ path: testInfo.outputPath('playing.png') });
  expect(errors).toEqual([]);
});

test('PWA activates, caches its shell and starts offline', async ({ page, context }) => {
  const errors = watchFailures(page);
  await page.goto('./');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cacheEntries = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const names = (await caches.keys()).filter(name => name.startsWith('ankin-drift-mobile-'));
    return Promise.all(names.map(async name => ({ name, paths: (await (await caches.open(name)).keys()).map(req => new URL(req.url).pathname) })));
  });
  expect(cacheEntries).toHaveLength(1);
  expect(cacheEntries[0].paths).toEqual(expect.arrayContaining([
    '/ankin-drift/index.html', '/ankin-drift/manifest.webmanifest',
    '/ankin-drift/icons/icon-192.png', '/ankin-drift/icons/icon-512.png',
  ]));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#start')).toBeVisible();
  await page.locator('#start').click();
  await page.locator('#guideContinue').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hudWave')).not.toHaveText('00:00');
  expect(errors).toEqual([]);
});


function rectanglesOverlap(a,b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test('FPS indicator stays clear of desktop HUD and mobile touch controls', async ({ page, isMobile }, testInfo) => {
  const errors = watchFailures(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/ANKIN DRIFT v12\.4/);
  await page.locator('[data-control="' + (isMobile ? 'mobile' : 'desktop') + '"]').click();
  await page.locator('#openOptions').click();
  await page.locator('#showFps').check();
  await page.locator('#optionsBack').click();
  await page.locator('#start').click();
  await page.locator('#guideContinue').click();
  const fps = page.locator('#fpsCounter');
  await expect(fps).toBeVisible();
  await expect(fps).toContainText('FPS');

  const sizes = isMobile
    ? [{ width: 390, height: 844 }, { width: 320, height: 740 }]
    : [
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 800, height: 600 },
      { width: 760, height: 540 },
    ];

  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await expect(fps).toBeVisible();
    const geometry = await page.evaluate(() => {
      const box = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return null;
        return {
          top:rect.top, bottom:rect.bottom,
          left:rect.left, right:rect.right,
          width:rect.width, height:rect.height,
        };
      };
      return {
        fps:box('#fpsCounter'),
        wave:box('#hud .hud-row > .hud-box'),
        build:box('#hudBuild'),
        bottom:box('#hud .hud-bottom'),
        dash:box('#dashTouch'),
        nova:box('#novaTouch'),
      };
    });
    expect(geometry.fps, 'Missing FPS badge').not.toBeNull();
    const { fps: indicator } = geometry;
    expect(indicator.left).toBeGreaterThanOrEqual(-1);
    expect(indicator.right).toBeLessThanOrEqual(viewport.width+1);
    expect(indicator.top).toBeGreaterThanOrEqual(-1);
    expect(indicator.bottom).toBeLessThanOrEqual(viewport.height+1);
    if (isMobile) {
      for(const key of ['dash','nova']) {
        if(geometry[key])expect(rectanglesOverlap(indicator,geometry[key]),'FPS overlaps '+key).toBe(false);
      }
    } else {
      expect(indicator.top).toBeGreaterThanOrEqual(geometry.wave.bottom+7);
      expect(Math.abs(indicator.left-geometry.wave.left)).toBeLessThanOrEqual(2);
      for (const key of ['wave','build','bottom']) {
        if(geometry[key] && geometry[key].width && geometry[key].height) {
          expect(rectanglesOverlap(indicator,geometry[key]),'FPS overlaps '+key+' at '+viewport.width).toBe(false);
        }
      }
    }
    // Store successful visual evidence for the main PC and mobile layouts.
    if (viewport.width === 1280 || (isMobile && viewport.width === 390)) {
      await page.screenshot({ path: testInfo.outputPath('fps-hud-'+viewport.width+'.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('v12 elemental fusion keeps cards and gusts never pull enemies toward the pilot', async ({ page, isMobile }) => {
  const errors=watchFailures(page);
  await page.route('**/ankin-drift/',async route=>{
    const original=await route.fetch(),html=await original.text();
    const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
    if(!html.includes(anchor))throw Error('v12 test injection anchor missing');
    await route.fulfill({response:original,body:html.replace(anchor,"window.__v12Checks=()=>{\n // Test-only scenarios operate inside the game IIFE. No public debug interface ships.\n newRun();game.level=12;\n game.skills.emberSeed=1;game.skills.coldCoil=1;\n game.acquisitionLog=['emberSeed','coldCoil'];restorePlayerBuild();\n const pairs=availableElementPairs();\n const initial={pairs:pairs.length,fire:elementInvestments('fire').count,ice:elementInvestments('ice').count};\n elementChoice={main:'fire'};state('elementChoice');selectElementFusion('ice');\n const echo={skills:[game.skills.emberSeed,game.skills.coldCoil],stored:game.acquisitionLog.length,sealed:[...game.sealedElements],combos:game.elementCombos.length,color:fusedColor('fire'),magmaLevel:player.magmaLevel};\n magmaPatch(player.x+80,player.y,1);echo.magmaColor=zones.at(-1)?.tint;\n newRun();game.level=12;\n game.skills.windOrigin=1;game.skills.emberSeed=1;game.acquisitionLog=['windOrigin','emberSeed'];restorePlayerBuild();\n elementChoice={main:'wind'};state('elementChoice');selectElementFusion('fire');\n const colorWind=fusedColor('wind');const restored=game.skills.emberSeed;\n player.windCount=7;player.windRadius=900;player.windStrength=10000;player.windTimer=0;player.windDps=5;\n const e={type:'drone',x:player.x+140,y:player.y,r:12,dead:false,hp:1e8,maxHp:1e8,slow:0,burn:0,frozen:0,dmg:0,xp:0,rockHit:0,phase:0};\n enemies=[e];refreshEnemyIndex();gusts=[];\n const before={x:e.x,y:e.y,playerX:player.x};\n tickGusts(.13);\n const after={x:e.x,y:e.y};\n const wind={color:colorWind,stored:restored,before,after,gusts:gusts.length,maximumRadius:Math.max(...gusts.map(g=>g.r)),tint:gusts[0]?.color};\n return {initial,echo,wind};\n};\nwindow.__v121StageChecks=()=>{\n newRun();game.level=12;\n for(const id of ['emberSeed','coldCoil','windOrigin','stoneSeed'])game.skills[id]=1;\n game.acquisitionLog=['emberSeed','coldCoil','windOrigin','stoneSeed'];\n restorePlayerBuild();\n const started=enterElementChoice();\n const startUI=elementChoiceMarkup();\n const firstMains=fusionMainChoices();\n chooseFusionMain('fire');\n const subUI=elementChoiceMarkup();\n const main=elementChoice.main;\n selectElementFusion('ice');\n const afterFirst={used:[...fusedElementKeys()],count:game.elementCombos.length,hasCard:game.skills.coldCoil===1};\n game.level=28;state('playing');\n const secondStarted=enterElementChoice();\n const secondMains=fusionMainChoices();\n const secondUI=elementChoiceMarkup();\n chooseFusionMain('wind');\n const secondSubUI=elementChoiceMarkup();\n selectElementFusion('fire'); // Already consumed; must not commit.\n const ignored=game.elementCombos.length===1&&mode==='elementChoice';\n selectElementFusion('rock');\n const final={count:game.elementCombos.length,used:[...fusedElementKeys()],cards:['emberSeed','coldCoil','windOrigin','stoneSeed'].every(x=>game.skills[x]===1),finished:availableElementPairs().length===0};\n return {started,startUI,firstMains,subUI,main,afterFirst,secondStarted,secondMains,secondUI,secondSubUI,ignored,final};\n};\n"+anchor)});
  });
  await page.goto('./');
  await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
  await page.locator('#start').click();
  await page.locator('#guideContinue').click();
  await expect(page.locator('#hud')).toBeVisible();
  const r=await page.evaluate(()=>window.__v12Checks());
  expect(r.initial.fire).toBe(1);
  expect(r.initial.ice).toBe(1);
  expect(r.initial.pairs).toBeGreaterThan(0);
  expect(r.echo.skills).toEqual([1,1]);
  expect(r.echo.stored).toBe(2);
  expect(r.echo.sealed).toContain('ice');
  expect(r.echo.combos).toBe(1);
  expect(r.echo.color).toBe('#50bfff');
  expect(r.echo.magmaColor).toBe('#50bfff');
  expect(r.wind.color).toBe('#ff5968');
  expect(r.wind.tint).toBe('#ff5968');
  expect(r.wind.stored).toBe(1);
  expect(r.wind.gusts).toBeLessThanOrEqual(4);
  expect(r.wind.maximumRadius).toBeLessThanOrEqual(165);
  expect(r.wind.after.x).toBeGreaterThanOrEqual(r.wind.before.x);
  expect(Math.hypot(r.wind.after.x-r.wind.before.x,r.wind.after.y-r.wind.before.y)).toBeLessThanOrEqual(10.01);
  expect(errors).toEqual([]);
});

test('v12.1 sequential fusion selection, disabled used attributes and milestone copy', async ({page,isMobile})=>{
 const failures=watchFailures(page);
 await page.route('**/ankin-drift/',async route=>{
  const fetched=await route.fetch(),html=await fetched.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('v12.1 test anchor changed');
  const script="window.__v12Checks=()=>{\n // Test-only scenarios operate inside the game IIFE. No public debug interface ships.\n newRun();game.level=12;\n game.skills.emberSeed=1;game.skills.coldCoil=1;\n game.acquisitionLog=['emberSeed','coldCoil'];restorePlayerBuild();\n const pairs=availableElementPairs();\n const initial={pairs:pairs.length,fire:elementInvestments('fire').count,ice:elementInvestments('ice').count};\n elementChoice={main:'fire'};state('elementChoice');selectElementFusion('ice');\n const echo={skills:[game.skills.emberSeed,game.skills.coldCoil],stored:game.acquisitionLog.length,sealed:[...game.sealedElements],combos:game.elementCombos.length,color:fusedColor('fire'),magmaLevel:player.magmaLevel};\n magmaPatch(player.x+80,player.y,1);echo.magmaColor=zones.at(-1)?.tint;\n newRun();game.level=12;\n game.skills.windOrigin=1;game.skills.emberSeed=1;game.acquisitionLog=['windOrigin','emberSeed'];restorePlayerBuild();\n elementChoice={main:'wind'};state('elementChoice');selectElementFusion('fire');\n const colorWind=fusedColor('wind');const restored=game.skills.emberSeed;\n player.windCount=7;player.windRadius=900;player.windStrength=10000;player.windTimer=0;player.windDps=5;\n const e={type:'drone',x:player.x+140,y:player.y,r:12,dead:false,hp:1e8,maxHp:1e8,slow:0,burn:0,frozen:0,dmg:0,xp:0,rockHit:0,phase:0};\n enemies=[e];refreshEnemyIndex();gusts=[];\n const before={x:e.x,y:e.y,playerX:player.x};\n tickGusts(.13);\n const after={x:e.x,y:e.y};\n const wind={color:colorWind,stored:restored,before,after,gusts:gusts.length,maximumRadius:Math.max(...gusts.map(g=>g.r)),tint:gusts[0]?.color};\n return {initial,echo,wind};\n};\nwindow.__v121StageChecks=()=>{\n newRun();game.level=12;\n for(const id of ['emberSeed','coldCoil','windOrigin','stoneSeed'])game.skills[id]=1;\n game.acquisitionLog=['emberSeed','coldCoil','windOrigin','stoneSeed'];\n restorePlayerBuild();\n const started=enterElementChoice();\n const startUI=elementChoiceMarkup();\n const firstMains=fusionMainChoices();\n chooseFusionMain('fire');\n const subUI=elementChoiceMarkup();\n const main=elementChoice.main;\n selectElementFusion('ice');\n const afterFirst={used:[...fusedElementKeys()],count:game.elementCombos.length,hasCard:game.skills.coldCoil===1};\n game.level=28;state('playing');\n const secondStarted=enterElementChoice();\n const secondMains=fusionMainChoices();\n const secondUI=elementChoiceMarkup();\n chooseFusionMain('wind');\n const secondSubUI=elementChoiceMarkup();\n selectElementFusion('fire'); // Already consumed; must not commit.\n const ignored=game.elementCombos.length===1&&mode==='elementChoice';\n selectElementFusion('rock');\n const final={count:game.elementCombos.length,used:[...fusedElementKeys()],cards:['emberSeed','coldCoil','windOrigin','stoneSeed'].every(x=>game.skills[x]===1),finished:availableElementPairs().length===0};\n return {started,startUI,firstMains,subUI,main,afterFirst,secondStarted,secondMains,secondUI,secondSubUI,ignored,final};\n};\n";
  await route.fulfill({response:fetched,body:html.replace(anchor,script+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 const result=await page.evaluate(()=>window.__v121StageChecks());
 expect(result.started).toBe(true);
 expect(result.startUI).toContain('属性融合解放');
 expect(result.startUI).toContain('特化する属性を選んでください');
 expect(result.startUI).toContain('Lv12');
 expect(result.firstMains).toContain('fire');
 expect(result.subUI).toContain('素材にする属性を1つ選んでください');
 expect(result.subUI).toContain('※選択した属性は融合され、失います！');
 expect(result.subUI).toContain('特化属性として選択済み');
 expect(result.main).toBe('fire');
 expect(result.afterFirst.hasCard).toBe(true);
 expect(result.afterFirst.used).toEqual(['fire','ice']);
 expect(result.secondStarted).toBe(true);
 expect(result.secondMains).toEqual(['wind','rock']);
 expect(result.secondUI).toContain('Lv28');
 expect(result.secondUI).toContain('前回の融合で使用済み');
 expect(result.secondSubUI).toContain('特化属性として選択済み');
 expect(result.ignored).toBe(true);
 expect(result.final.count).toBe(2);
 expect(result.final.used).toEqual(['fire','ice','wind','rock']);
 expect(result.final.cards).toBe(true);
 expect(result.final.finished).toBe(true);
 expect(failures).toEqual([]);
});

test('v12.4 boss HP, fusion damage and evolution identity on every synthesis', async ({page,isMobile})=>{
 const errors=watchFailures(page);
 await page.route('**/ankin-drift/',async route=>{
  const original=await route.fetch(),html=await original.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('v12.4 probe injection anchor changed');
  await route.fulfill({response:original,body:html.replace(anchor,"\nwindow.__v122Probe = () => {\n newRun();game.total=600;game.level=22;\n spawnBoss('major','titan');const beforeHP=boss.maxHp;\n boss=null;enemies=[];game.level=28;\n spawnBoss('major','titan');const afterHP=boss.maxHp;\n // At fixed elapsed time Lv28 has a modest HP discount.\n newRun();\n const p=initialP();applyElementFusionStats(p,{main:'fire',sub:'ice',resonance:6});\n const first=p.fusionOutputBonus;\n applyElementFusionStats(p,{main:'wind',sub:'rock',resonance:9});\n const second=p.fusionOutputBonus;\n player.fusionOutputBonus=p.fusionOutputBonus;\n const dummy={type:'drone',hp:10000,maxHp:10000,dead:false,burn:0,slow:0,rockHit:0,bladeHit:0,x:W*.4,y:H*.4,r:14};\n damageEnemy(dummy,100,{source:'element',special:true});\n const effective=10000-dummy.hp;\n game.fusions=Object.fromEntries(FUSIONS.map(f=>[f.id,1]));\n syncEvolutionVisuals(player);\n player.fusionList=FUSIONS.map(f=>f.id);\n const all=player.evolutionStyles.map(x=>({id:x.id,motif:x.motif,color:x.color}));\n const styleOK=all.every(x=>x.motif&&x.color.startsWith('hsl('));\n const diverse=[...new Set(all.map(x=>x.color))].length;\n state('playing');render();\n return {beforeHP,afterHP,first,second,effective,total:FUSIONS.length,visuals:all.length,styleOK,diverse,tint:player.evolutionTint,rendered:true};\n};\nwindow.__v122Threat = async kind => {\n newRun();state('playing');\n const button=kind==='dash'?dashTouch:novaTouch;\n const rect=button.getBoundingClientRect(),bounds=canvas.getBoundingClientRect();\n const x=((rect.left+rect.right)/2-bounds.left)*W/bounds.width;\n const y=((rect.top+rect.bottom)/2-bounds.top)*H/bounds.height;\n enemies=[{type:'drone',x,y,r:12,hp:200,maxHp:200,dead:false}];\n hostile=[];hudUpdate();\n const className='mobile-'+kind+'-threat';\n const dim=document.body.classList.contains(className);\n const opacity=Number(getComputedStyle(button).opacity);\n enemies=[];hudUpdate();\n const cleared=!document.body.classList.contains(className);\n return {dim,opacity,cleared,pointerEvents:getComputedStyle(button).pointerEvents};\n};\n"+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 const r=await page.evaluate(()=>window.__v122Probe());
 expect(r.beforeHP).toBeGreaterThan(r.afterHP);
 expect(r.afterHP/r.beforeHP).toBeGreaterThan(.83);
 expect(r.afterHP/r.beforeHP).toBeLessThan(.87);
 expect(r.first).toBeCloseTo(.42,4);
 expect(r.second).toBeCloseTo(.84,4);
 expect(r.effective).toBeCloseTo(184,2);
 expect(r.total).toBeGreaterThan(15);
 expect(r.visuals).toBe(r.total);
 expect(r.styleOK).toBe(true);
 expect(r.diverse).toBeGreaterThan(10);
 expect(r.tint).toMatch(/^hsl\(/);
 expect(r.rendered).toBe(true);
 expect(errors).toEqual([]);
});
test('v12.4 mobile touch controls dim under threats while staying tappable', async ({page,isMobile})=>{
 test.skip(!isMobile,'Touch-control opacity is mobile-only');
 const errors=watchFailures(page);
 await page.route('**/ankin-drift/',async route=>{
  const original=await route.fetch(),html=await original.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('v12.4 threat injection anchor changed');
  await route.fulfill({response:original,body:html.replace(anchor,"\nwindow.__v122Probe = () => {\n newRun();game.total=600;game.level=22;\n spawnBoss('major','titan');const beforeHP=boss.maxHp;\n boss=null;enemies=[];game.level=28;\n spawnBoss('major','titan');const afterHP=boss.maxHp;\n // At fixed elapsed time Lv28 has a modest HP discount.\n newRun();\n const p=initialP();applyElementFusionStats(p,{main:'fire',sub:'ice',resonance:6});\n const first=p.fusionOutputBonus;\n applyElementFusionStats(p,{main:'wind',sub:'rock',resonance:9});\n const second=p.fusionOutputBonus;\n player.fusionOutputBonus=p.fusionOutputBonus;\n const dummy={type:'drone',hp:10000,maxHp:10000,dead:false,burn:0,slow:0,rockHit:0,bladeHit:0,x:W*.4,y:H*.4,r:14};\n damageEnemy(dummy,100,{source:'element',special:true});\n const effective=10000-dummy.hp;\n game.fusions=Object.fromEntries(FUSIONS.map(f=>[f.id,1]));\n syncEvolutionVisuals(player);\n player.fusionList=FUSIONS.map(f=>f.id);\n const all=player.evolutionStyles.map(x=>({id:x.id,motif:x.motif,color:x.color}));\n const styleOK=all.every(x=>x.motif&&x.color.startsWith('hsl('));\n const diverse=[...new Set(all.map(x=>x.color))].length;\n state('playing');render();\n return {beforeHP,afterHP,first,second,effective,total:FUSIONS.length,visuals:all.length,styleOK,diverse,tint:player.evolutionTint,rendered:true};\n};\nwindow.__v122Threat = async kind => {\n newRun();state('playing');\n const button=kind==='dash'?dashTouch:novaTouch;\n const rect=button.getBoundingClientRect(),bounds=canvas.getBoundingClientRect();\n const x=((rect.left+rect.right)/2-bounds.left)*W/bounds.width;\n const y=((rect.top+rect.bottom)/2-bounds.top)*H/bounds.height;\n enemies=[{type:'drone',x,y,r:12,hp:200,maxHp:200,dead:false}];\n hostile=[];hudUpdate();\n const className='mobile-'+kind+'-threat';\n const dim=document.body.classList.contains(className);\n const opacity=Number(getComputedStyle(button).opacity);\n enemies=[];hudUpdate();\n const cleared=!document.body.classList.contains(className);\n return {dim,opacity,cleared,pointerEvents:getComputedStyle(button).pointerEvents};\n};\n"+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-control="mobile"]').click();
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 for(const kind of ['dash','nova']){
  const result=await page.evaluate(kind=>window.__v122Threat(kind),kind);
  expect(result.dim).toBe(true);
  expect(result.opacity).toBeLessThanOrEqual(.5);
  expect(result.cleared).toBe(true);
  expect(result.pointerEvents).toBe('auto');
 }
 expect(errors).toEqual([]);
});

test('v12.4 simple rendering is opt-in; organic magma never flashes into circles under load', async ({page,isMobile})=>{
 const errors=watchFailures(page);
 await page.route('**/ankin-drift/',async route=>{
  const original=await route.fetch(),html=await original.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  if(!html.includes(anchor))throw Error('v12.4 injection anchor missing');
  await route.fulfill({response:original,body:html.replace(anchor,"\nwindow.__v124RenderingSmoke=()=>{\n const originalFx=settings.fx,oldZones=zones,oldHostile=hostile;\n try{\n  // Offscreen bullets trigger the heavy-load condition without obstructing the magma.\n  hostile=Array.from({length:550},()=>({x:-999,y:-999,r:2,color:'#fff'}));\n  zones=[{type:'magma',x:player.x,y:player.y,r:70,life:3.5,ttl:1,dps:30,tint:null}];\n  const originalFill=ctx.fill,counts={};\n  try{\n   ctx.fill=function(...args){if(args[0] instanceof Path2D)counts[settings.fx]=(counts[settings.fx]||0)+1;return originalFill.apply(this,args)};\n   settings.fx='medium';render();\n   const organic={pathFills:counts.medium||0,heavy:renderHeavyLoad,cached:zones[0].visualPaths?.length||0};\n   settings.fx='simple';render();\n   const simple={pathFills:counts.simple||0,heavy:renderHeavyLoad};\n   settings.fx='low';render();\n   const low={pathFills:counts.low||0,heavy:renderHeavyLoad};\n   return {organic,simple,low};\n  }finally{ctx.fill=originalFill;}\n }finally{zones=oldZones;hostile=oldHostile;settings.fx=originalFx;}\n};\nwindow.__v124InputSmoke=()=>{\n // Simulate a release delivered outside the canvas, as on some embedded browsers.\n touchMove.id=721;touchMove.x=.81;touchMove.y=-.44;touchMove.captureOk=false;\n window.dispatchEvent(new PointerEvent('pointerup',{pointerId:721,bubbles:true}));\n const pointerReleased=touchMove.id===null&&touchMove.x===0&&touchMove.y===0;\n // Keyboard input on an options/form element must never steer the ship.\n const input=document.createElement('input');document.body.append(input);\n input.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));\n const typingGuard=!keys.has('KeyW');\n input.remove();\n keys.add('KeyA');touchMove.id=722;touchMove.x=.75;\n document.dispatchEvent(new Event('visibilitychange'));\n const focusReleased=!keys.size&&touchMove.id===null&&touchMove.x===0;\n return {pointerReleased,typingGuard,focusReleased};\n};\n"+anchor)});
 });
 await page.goto('./');
 await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#openOptions').click();
 await page.locator('#fxQuality').selectOption('simple');
 await expect(page.locator('#fxQuality')).toHaveValue('simple');
 await page.locator('#optionsBack').click();
 await page.locator('#start').click();
 await page.locator('#guideContinue').click();
 const a=await page.evaluate(()=>window.__v124RenderingSmoke());
 expect(a.organic.heavy).toBe(true);
 expect(a.organic.cached).toBe(3);
 expect(a.organic.pathFills).toBeGreaterThanOrEqual(3);
 expect(a.low.pathFills).toBeGreaterThanOrEqual(3);
 expect(a.simple.heavy).toBe(true);
 expect(a.simple.pathFills).toBe(0);
 const input=await page.evaluate(()=>window.__v124InputSmoke());
 expect(input).toEqual({pointerReleased:true,typingGuard:true,focusReleased:true});
 expect(errors).toEqual([]);
});
