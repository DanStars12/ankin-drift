import {test,expect} from '@playwright/test';

test('soundtrack unlock, title and battle themes, pause and loop without duplicate announcements',async({page,isMobile})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 expect(await page.evaluate(()=>window.ankinMusicStatus().unlocked)).toBe(false);
 await expect(page.locator('#bgmTrackToast')).toHaveText('');
 if(isMobile)await page.locator('#musicPreview').tap();else await page.locator('#musicPreview').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('title');
 await expect(page.locator('#bgmTrackToast')).toContainText('Neon Horizon');
 const count=await page.evaluate(()=>window.ankinMusicStatus().director.transitions);
 await page.waitForTimeout(500);
 expect(await page.evaluate(()=>window.ankinMusicStatus().director.transitions)).toBe(count);
 if(isMobile)await page.locator('#start').tap();else await page.locator('#start').click();
 if(isMobile)await page.locator('#guideContinue').tap();else await page.locator('#guideContinue').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('battle');
 await expect(page.locator('#bgmTrackToast')).toContainText('16-Battle Beat');
 if(isMobile)await page.locator('#pauseButton').tap();else await page.locator('#pauseButton').click();
 await expect(page.locator('#resume')).toBeVisible();
 expect(await page.evaluate(()=>window.ankinMusicStatus().scene)).toBe('battle');
 if(isMobile)await page.locator('#resume').tap();else await page.locator('#resume').click();
 expect(errors).toEqual([]);
});
test('soundtrack controls save BGM/SE mute/levels without modifying legacy records',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 const saved=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='ankin_drift_v71_settings')));
 await page.locator('#openOptions').click();
 await page.locator('#bgm').click();
 await page.locator('#sound').click();
 await page.locator('#bgmVolume').evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#sfxVolume').evaluate(el=>{el.value='25';el.dispatchEvent(new Event('input',{bubbles:true}))});
 const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('ankin_drift_v71_settings')));
 expect(prefs).toMatchObject({bgm:40,sfx:25,bgmMuted:true,sfxMuted:true});
 await page.reload();await page.locator('#openOptions').click();
 await expect(page.locator('#bgm')).toContainText('OFF');
 await expect(page.locator('#sound')).toContainText('OFF');
 await expect(page.locator('#bgmVolume')).toHaveValue('40');
 await expect(page.locator('#sfxVolume')).toHaveValue('25');
 expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='ankin_drift_v71_settings')))).toEqual(saved);
 expect(errors).toEqual([]);
});
test('five MP3 songs are cached by PWA and playable offline',async({page,context})=>{
 await page.goto('./');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const paths=await page.evaluate(async()=>{
  const name=(await caches.keys()).find(s=>s.startsWith('ankin-drift-mobile-'));
  return (await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname);
 });
 expect(paths).toContain('/ankin-drift/music-soundtrack.js');
 for(const src of ['neon-horizon.mp3','16-battle-beat.mp3','trinity.mp3','overdrive-nemesis.mp3','the-last-horizon.mp3'])expect(paths).toContain('/ankin-drift/audio/'+src);
 await context.setOffline(true);await page.reload();
 const range=await page.evaluate(async()=>{
  const response=await fetch('./audio/16-battle-beat.mp3',{headers:{Range:'bytes=0-1023'}});
  return {status:response.status,contentRange:response.headers.get('content-range'),
   type:response.headers.get('content-type'),size:(await response.arrayBuffer()).byteLength};
 });
 expect(range.status).toBe(206);
 expect(range.contentRange).toMatch(/^bytes 0-1023\/\d+$/);
 expect(range.type).toMatch(/audio\/mpeg/);
 expect(range.size).toBe(1024);
 await expect(page.locator('#musicPreview')).toBeVisible();
 await page.locator('#musicPreview').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('title');
});


test('MP3 player crossfades scene changes without synthesizing obsolete notes',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('./');
 await page.locator('#musicPreview').click();
 const result=await page.evaluate(async()=>{
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctx=new AC();await ctx.resume();
  const output=ctx.createGain();output.gain.value=0;output.connect(ctx.destination);
  const observed={oscillators:0,buffers:0,media:0};
  const makeOscillator=ctx.createOscillator.bind(ctx);
  const makeBuffer=ctx.createBufferSource.bind(ctx);
  const makeMedia=ctx.createMediaElementSource.bind(ctx);
  ctx.createOscillator=()=>{observed.oscillators++;return makeOscillator();};
  ctx.createBufferSource=()=>{observed.buffers++;return makeBuffer();};
  ctx.createMediaElementSource=element=>{observed.media++;return makeMedia(element);};
  const engine=window.AnkinSoundtrack.create(ctx,output);
  engine.tick({scene:'battle',enabled:true});
  engine.tick({scene:'trinity',enabled:true});
  engine.tick({scene:'battle',enabled:true});
  const active=engine.inspect();
  engine.tick({scene:'battle',enabled:false});
  await new Promise(resolve=>setTimeout(resolve,350));
  engine.tick({enabled:false});
  const stopped=engine.inspect();
  await ctx.close();
  return {observed,active,stopped};
 });
 expect(result.observed.oscillators).toBe(0);
 expect(result.observed.buffers).toBe(0);
 expect(result.observed.media).toBe(3);
 expect(result.active.transitions).toBe(3);
 expect(result.active.track).toBe('battle');
 expect(result.stopped.track).toBeNull();
 expect(result.stopped.activeTracks).toBe(0);
 expect(errors).toEqual([]);
});

test('five creator MP3 tracks replace the three synth themes and route every boss tier correctly',async({page})=>{
 await page.goto('./');
 const data=await page.evaluate(()=>({
  titles:window.AnkinSoundtrack.names,
  tracks:window.AnkinSoundtrack.tracks,
  scenes:['minor','unique','major','ultimate',null].map(type=>window.ankinMusicSceneForBossType(type))
 }));
 expect(data.titles).toEqual({
  title:'Neon Horizon',battle:'16-Battle Beat',trinity:'TRINITY',
  major:'OVERDRIVE NEMESIS',last:'THE LAST HORIZON'
 });
 expect(Object.keys(data.tracks)).toHaveLength(5);
 expect(data.scenes).toEqual(['trinity','trinity','major','last','battle']);
 for(const track of Object.values(data.tracks)){
  expect(track.url).toMatch(/^\.\/audio\/[-a-z0-9]+\.mp3$/);
 }
});
test('music notification is small, gradient colored and near health HUD',async({page,isMobile})=>{
 await page.goto('./');
 if(isMobile)await page.locator('#musicPreview').tap();else await page.locator('#musicPreview').click();
 await expect(page.locator('#bgmTrackToast')).toContainText('Neon Horizon');
 const appearance=await page.locator('#bgmTrackToast').evaluate(el=>({
  fontSize:parseFloat(getComputedStyle(el).fontSize),
  background:getComputedStyle(el).backgroundImage,
  boxShadow:getComputedStyle(el).boxShadow,
  left:el.getBoundingClientRect().left
 }));
 expect(appearance.fontSize).toBeLessThanOrEqual(12.5);
 expect(appearance.background).toContain('linear-gradient');
 expect(appearance.boxShadow).toBe('none');
 if(isMobile)await page.locator('#start').tap();else await page.locator('#start').click();
 if(isMobile)await page.locator('#guideContinue').tap();else await page.locator('#guideContinue').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('battle');
 await expect(page.locator('#bgmTrackToast')).toContainText('16-Battle Beat');
 const pos=await page.evaluate(()=>{
  const label=document.querySelector('#bgmTrackToast').getBoundingClientRect();
  const hp=document.querySelector('#hpFill').closest('.hud-box').getBoundingClientRect();
  return {leftDistance:Math.abs(label.left-hp.left),aboveHp:label.bottom<hp.top,gap:hp.top-label.bottom};
 });
 expect(pos.leftDistance).toBeLessThan(3);
 expect(pos.aboveHp).toBe(true);
 expect(pos.gap).toBeLessThan(24);
});
