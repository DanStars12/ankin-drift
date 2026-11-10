import {test,expect}from'@playwright/test';
import {readFileSync,mkdirSync,writeFileSync}from'node:fs';import{gzipSync}from'node:zlib';
import{summarizeTrace,summarizeCpu}from'../scripts/render-trace-summary.mjs';
const source=readFileSync(new URL('./performance.spec.mjs',import.meta.url),'utf8');
const workload=JSON.parse(source.match(/^const TEST_HOOK = ("[^\n]+");/)[1]);
const hook=workload+String.raw`
window.__renderTraceSetup=({ship,engage,doubleTime})=>{
 selectedShip=ship;
 const config=window.__ankinPerfTestScenario({total:engage?3600:480,count:engage?220:40,bullets:engage?300:50,withRaid:engage,engage,doubleTime});
 player.iframes=1e8;
 for(const e of enemies)e.hp=e.maxHp=1e8;
 if(ship==='dog'){
  player.dogBones=6;player.dogChicks=6;player.dogChickenEvolved=true;
  player.orbit=4;player.empRadius=180;player.empDps=40;player.rockWalls=3;player.rockCooldowns=[0,0,0];player.droneCount=3;
 }
 return config;
};
window.__renderTraceResetMeasurements=()=>{
 perfRing.head=0;perfRing.count=0;actualDraws=0;lastFpsSample=0;actualFps=0;
 discardedSimulationSeconds=0;stalledFrameCount=0;
};
`;
test('CDP rendering diagnosis: paired untraced and traced native combat',async({page,browser,isMobile},testInfo)=>{
 test.skip(process.env.ANKIN_RENDER_TRACE!=='1','Opt-in Chromium profiling, separate from ordinary performance measurements.');
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{const r=await route.fetch(),html=await r.text();
  const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
  expect(html).toContain(anchor);await route.fulfill({response:r,body:html.replace(anchor,hook+anchor)});
 });
 await page.goto('./');await page.locator('[data-control="'+(isMobile?'mobile':'desktop')+'"]').click();
 await page.locator('#start').click();await page.locator('#guideContinue').click();
 const root=await browser.newBrowserCDPSession();let gpu;
 try{const info=await root.send('SystemInfo.getInfo');gpu={devices:info.gpu.devices,renderer:info.gpu.auxAttributes?.glRenderer,features:info.gpu.featureStatus}}catch(e){gpu={unavailable:String(e.message)}}
 const version=await root.send('Browser.getVersion');await root.detach();
 const session=await page.context().newCDPSession(page);await session.send('Profiler.enable');await session.send('Profiler.setSamplingInterval',{interval:1000});
 const dir='artifacts/render-traces/'+testInfo.project.name;mkdirSync(dir,{recursive:true});const results=[];
 const scenarios=[{name:'normal',ship:'shot',engage:false,doubleTime:false},{name:'engage-2x',ship:'shot',engage:true,doubleTime:true},{name:'dog-2x',ship:'dog',engage:true,doubleTime:true}];
 try{
  for(const scenario of scenarios)for(let repeat=0;repeat<2;repeat++){
   await page.evaluate(x=>window.__renderTraceSetup(x),scenario);await page.waitForTimeout(1000);
   const untracedStart=await page.evaluate(()=>window.ankinPerformanceReport());await page.evaluate(()=>window.__renderTraceResetMeasurements());
   await page.waitForTimeout(4000);const untraced=await page.evaluate(()=>window.ankinPerformanceReport());
   const config=await page.evaluate(x=>window.__renderTraceSetup(x),scenario);if(scenario.engage)expect(config.initialWalls).toBeGreaterThan(0);
   await page.waitForTimeout(1000);const before=await page.evaluate(()=>window.ankinPerformanceReport());await page.evaluate(()=>window.__renderTraceResetMeasurements());
   const events=[];const collect=({value})=>{for(const event of value)events.push(event)};session.on('Tracing.dataCollected',collect);
   const complete=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));
   await session.send('Tracing.start',{transferMode:'ReportEvents',traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:32768,
    includedCategories:['devtools.timeline','blink.user_timing','v8','cc','gpu','toplevel','disabled-by-default-devtools.timeline']}});
   await session.send('Profiler.start');await page.waitForTimeout(4000);const {profile}=await session.send('Profiler.stop');
   await session.send('Tracing.end');const completion=await complete;session.off('Tracing.dataCollected',collect);
   const traced=await page.evaluate(()=>window.ankinPerformanceReport());
   const name=scenario.name+'-'+repeat;
   writeFileSync(dir+'/'+name+'.trace.json.gz',gzipSync(JSON.stringify({traceEvents:events})));
   writeFileSync(dir+'/'+name+'.cpuprofile.gz',gzipSync(JSON.stringify(profile)));
   expect(completion.dataLossOccurred).toBe(false);expect(events.length).toBeGreaterThan(0);expect(profile.samples.length).toBeGreaterThan(0);
   expect(traced.mode).toBe('playing');expect(traced.frame.samples).toBeGreaterThan(15);expect(traced.timing.requestedSpeed).toBe(scenario.doubleTime?2:1);
   const row={scenario:scenario.name,repeat,config,untracedStart,untraced,before,traced,cpu:summarizeCpu(profile),trace:summarizeTrace(events)};
   writeFileSync(dir+'/'+name+'.summary.json',JSON.stringify(row,null,2));results.push(row);
   console.log('RENDER_TRACE_SUMMARY='+JSON.stringify({scenario:row.scenario,repeat,untraced:untraced.frame,traced:traced.frame,draw:traced.drawing,sim:traced.simulation,
    cpu:row.cpu,threads:row.trace.threads.slice(0,8),counters:traced.counters,gpu}));
  }
 }finally{await session.detach()}
 expect(errors).toEqual([]);
 writeFileSync(dir+'/environment.json',JSON.stringify({version,gpu,project:testInfo.project.name,warning:'Headless CI is not device certification. Trace wall time is not CPU time. Sampling and tracing add overhead.'},null,2));
 await testInfo.attach('render-trace-summary.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
