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

test('FPS indicator stays clear of desktop HUD and mobile touch controls', async ({ page, isMobile }) => {
  const errors = watchFailures(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/ANKIN DRIFT v11\.10/);
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
  }
  expect(errors).toEqual([]);
});
