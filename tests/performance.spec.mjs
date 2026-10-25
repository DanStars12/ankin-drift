import { test, expect } from '@playwright/test';

// Performance numbers are diagnostic, not a merge gate: runner CPU load varies.
// Scenario setup is executed only by Playwright; no gameplay shortcuts are shipped.
const scenarios = [
  { name: 'normal', total: 480, enemies: 40, hostile: 50, raid: false },
  { name: 'dual-raid', total: 1080, enemies: 105, hostile: 110, raid: true },
  { name: 'triple-raid', total: 2220, enemies: 150, hostile: 160, raid: true },
];

test('repeatable combat load profiles', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.locator('[data-control="' + (isMobile ? 'mobile' : 'desktop') + '"]').click();
  await page.locator('#start').click();
  await page.locator('#guideContinue').click();
  await expect(page.locator('#hud')).toBeVisible();
  const results = [];
  for (const scenario of scenarios) {
    const config = await page.evaluate(({ total, count, bullets, withRaid }) => {
      // Force deterministic workload shape in the isolated test page only.
      game.total = total;
      game.endless = true;
      game.nextUltimateAt = 100000;
      game.nextBossAt = total + 400;
      game.nextRaidAt = total + 400;
      game.nextRelicAt = total + 400;
      game.nextVacuumAt = total + 400;
      game.spawn = 100000;
      game.raid = null;
      game.bossQueue = [];
      game.ultimatePending = false;
      player.maxHp = 1e9;
      player.hp = 1e9;
      enemies = [];
      shots = [];
      hostile = [];
      zones = [];
      gusts = [];
      particles = [];
      hazards = [];
      enemyIndexReady = false;
      player.windCount = 0;
      player.magmaLevel = 0;
      // Equal, reproducible random stream for each named workload.
      const randBackup = Math.random;
      let seed = (total * 747796405) >>> 0;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      try {
        if (withRaid) startRaid();
        for (let i=0; i<count; i++) {
          const angle=(Math.PI * 2 * i) / count;
          const radius=Math.min(W,H) * (0.30 + (i%3)*.055);
          spawnEnemy(i%4===0 ? 'shooter' : 'drone', {
            x:clamp(player.x+Math.cos(angle)*radius,18,W-18),
            y:clamp(player.y+Math.sin(angle)*radius,18,H-18)
          });
        }
        for (let i=0; i<bullets; i++) {
          const a=(Math.PI * 2 * i) / bullets;
          hostileShot(clamp(player.x+Math.cos(a)*180,20,W-20),
                      clamp(player.y+Math.sin(a)*180,20,H-20),
                      a + Math.PI/2, 75, 2, 3, '#ff99be', 8);
        }
        if (withRaid) {
          player.magmaLevel=7;
          player.magmaTimer=9999; // Stable zones are created explicitly.
          player.windCount=0; // Fixed gusts avoid random transient behavior.
          for(let i=0;i<16;i++)zones.push({
            x:clamp(player.x+Math.cos(i)*140,30,W-30),
            y:clamp(player.y+Math.sin(i)*140,30,H-30),
            r:55,life:15,ttl:.2,dps:4,type:'magma'
          });
          for(let i=0;i<6;i++)gusts.push({
            x:clamp(player.x+Math.cos(i)*110,30,W-30),
            y:clamp(player.y+Math.sin(i)*110,30,H-30),
            vx:0,vy:0,r:90,life:15,tick:.2
          });
        }
      } finally {
        Math.random=randBackup;
      }
      return { raidEffects: game.raid?.effects?.length ?? 0, initialEnemies: enemies.length };
    }, { total: scenario.total, count: scenario.enemies, bullets: scenario.hostile, withRaid: scenario.raid });
    await page.waitForTimeout(2600);
    const report = await page.evaluate(() => window.ankinPerformanceReport());
    expect(report?.frame?.samples ?? 0).toBeGreaterThan(15);
    expect(report.frame.p95Ms).toBeGreaterThan(0);
    expect(report.frame.p99Ms).toBeGreaterThanOrEqual(report.frame.p95Ms);
    expect(errors).toEqual([]);
    results.push({ scenario:scenario.name, config, report });
  }
  await testInfo.attach('performance-v11.9.json', {
    body: JSON.stringify({ project:testInfo.project.name, results }, null, 2),
    contentType: 'application/json'
  });
  console.log('ANKIN DRIFT PERFORMANCE: ' + JSON.stringify(
    results.map(x=>({ scenario:x.scenario, frameP95:x.report.frame?.p95Ms,
      simP95:x.report.simulation?.p95Ms, drawP95:x.report.drawing?.p95Ms,
      counts:x.report.counters, raid:x.report.raid?.effects })),
  ));
});
