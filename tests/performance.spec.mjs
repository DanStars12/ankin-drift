const TEST_HOOK = "window.__ankinPerfTestScenario = function({ total, count, bullets, withRaid }) {\n      // Force deterministic workload shape in the isolated test page only.\n      game.total = total;\n      game.endless = true;\n      game.nextUltimateAt = 100000;\n      game.nextBossAt = total + 400;\n      game.nextRaidAt = total + 400;\n      game.nextRelicAt = total + 400;\n      game.nextVacuumAt = total + 400;\n      game.spawn = 100000;\n      game.raid = null;\n      game.bossQueue = [];\n      game.ultimatePending = false;\n      player.maxHp = 1e9;\n      player.hp = 1e9;\n      enemies = [];\n      shots = [];\n      hostile = [];\n      zones = [];\n      gusts = [];\n      particles = [];\n      hazards = [];\n      enemyIndexReady = false;\n      player.windCount = 0;\n      player.magmaLevel = 0;\n      // Equal, reproducible random stream for each named workload.\n      const randBackup = Math.random;\n      let seed = (total * 747796405) >>> 0;\n      Math.random = () => {\n        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;\n        return seed / 4294967296;\n      };\n      try {\n        if (withRaid) startRaid();\n        for (let i=0; i<count; i++) {\n          const angle=(Math.PI * 2 * i) / count;\n          const radius=Math.min(W,H) * (0.30 + (i%3)*.055);\n          spawnEnemy(i%4===0 ? 'shooter' : 'drone', {\n            x:clamp(player.x+Math.cos(angle)*radius,18,W-18),\n            y:clamp(player.y+Math.sin(angle)*radius,18,H-18)\n          });\n        }\n        for (let i=0; i<bullets; i++) {\n          const a=(Math.PI * 2 * i) / bullets;\n          hostileShot(clamp(player.x+Math.cos(a)*180,20,W-20),\n                      clamp(player.y+Math.sin(a)*180,20,H-20),\n                      a + Math.PI/2, 75, 2, 3, '#ff99be', 8);\n        }\n        if (withRaid) {\n          player.magmaLevel=7;\n          player.magmaTimer=9999; // Stable zones are created explicitly.\n          player.windCount=0; // Fixed gusts avoid random transient behavior.\n          for(let i=0;i<16;i++)zones.push({\n            x:clamp(player.x+Math.cos(i)*140,30,W-30),\n            y:clamp(player.y+Math.sin(i)*140,30,H-30),\n            r:55,life:15,ttl:.2,dps:4,type:'magma'\n          });\n          for(let i=0;i<6;i++)gusts.push({\n            x:clamp(player.x+Math.cos(i)*110,30,W-30),\n            y:clamp(player.y+Math.sin(i)*110,30,H-30),\n            vx:0,vy:0,r:90,life:15,tick:.2\n          });\n        }\n      } finally {\n        Math.random=randBackup;\n      }\n      perfRing.head=0;perfRing.count=0;\n      return { raidEffects: game.raid?.effects?.length ?? 0, initialEnemies: enemies.length };\n\n};\n";
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
  // Inject a test-only scenario function into the game IIFE when the browser loads it.
  // This hook exists only in this isolated Playwright response, not in production HTML.
  await page.route('**/ankin-drift/', async route => {
    const original = await route.fetch();
    const html = await original.text();
    const anchor = "document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
    if (!html.includes(anchor)) throw Error('Game boot anchor changed; update test injection');
    await route.fulfill({ response: original, body: html.replace(anchor, TEST_HOOK + anchor) });
  });
  await page.goto('./');
  await page.locator('[data-control="' + (isMobile ? 'mobile' : 'desktop') + '"]').click();
  await page.locator('#start').click();
  await page.locator('#guideContinue').click();
  await expect(page.locator('#hud')).toBeVisible();
  const results = [];
  for (const scenario of scenarios) {
    const config = await page.evaluate(args => window.__ankinPerfTestScenario(args), { total: scenario.total, count: scenario.enemies, bullets: scenario.hostile, withRaid: scenario.raid });
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
