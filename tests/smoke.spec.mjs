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
