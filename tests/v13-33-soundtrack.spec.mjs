import {test,expect} from '@playwright/test';

test('soundtrack unlock, title and battle themes, pause and loop without duplicate announcements',async({page,isMobile})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 expect(await page.evaluate(()=>window.ankinMusicStatus().unlocked)).toBe(false);
 await expect(page.locator('#bgmTrackToast')).toHaveText('');
 if(isMobile)await page.locator('#musicPreview').tap();else await page.locator('#musicPreview').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('title');
 await expect(page.locator('#bgmTrackToast')).toContainText('STARBOUND SIGNAL');
 const count=await page.evaluate(()=>window.ankinMusicStatus().director.transitions);
 await page.waitForTimeout(500);
 expect(await page.evaluate(()=>window.ankinMusicStatus().director.transitions)).toBe(count);
 if(isMobile)await page.locator('#start').tap();else await page.locator('#start').click();
 if(isMobile)await page.locator('#guideContinue').tap();else await page.locator('#guideContinue').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('battle');
 await expect(page.locator('#bgmTrackToast')).toContainText('NEON DRIFT');
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
test('original music code is cached by PWA and playable offline',async({page,context})=>{
 await page.goto('./');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const paths=await page.evaluate(async()=>{
  const name=(await caches.keys()).find(s=>s.startsWith('ankin-drift-mobile-'));
  return (await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname);
 });
 expect(paths).toContain('/ankin-drift/music-soundtrack.js');
 await context.setOffline(true);await page.reload();
 await expect(page.locator('#musicPreview')).toBeVisible();
 await page.locator('#musicPreview').click();
 await expect.poll(()=>page.evaluate(()=>window.ankinMusicStatus().director?.track)).toBe('title');
});
