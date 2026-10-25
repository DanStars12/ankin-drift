# ANKIN DRIFT v11.9: performance diagnostics

## How to collect a report

1. Play the game and enable **FPS表示** under game settings if desired.
2. When performance becomes poor (especially during a double/triple raid), pause and open the settings panel.
3. Click **負荷ログ保存（JSON）** to download an anonymized local JSON performance report.
4. Share the report with the developer. It includes only technical timing statistics, device canvas size, frame rate settings, raid effects, and entity counts; it does not include save data or account information.

The JSON may also be inspected from the browser developer console with:
\`window.ankinPerformanceReport()\`

The report contains up to 480 recent animation-frame samples. It separates frame intervals, simulation cost and rendering cost. p50/p95/p99 show tail latency; they are not equivalent to average FPS. Long-lived animations are not hidden or shortened by the monitor.

## v11.9 simulation optimization

Previously the enemy spatial lookup map was rebuilt twice on *every* simulation step.
It is now rebuilt after wind/rock forces **only if those forces actually changed enemy coordinates**. The initial per-tick rebuild and all gameplay collision rules stay intact.

## Repeatable performance scenarios

\`tests/performance.spec.mjs\` sets up test-only normal, dual-raid and triple-raid workloads directly inside isolated Playwright pages; it is not part of shipped gameplay. These scenarios use fixed random seeds for initial unit layout and record sampled frame/update/render timings. Subsequent gameplay randomness and GitHub CI machine load are not fixed, so raw FPS is a diagnostic rather than a universal performance guarantee.

Run with:

\`\`\`sh
npm ci
npx playwright install chromium
npx playwright test tests/performance.spec.mjs --project=desktop
npx playwright test tests/performance.spec.mjs --project=mobile-390
\`\`\`

GitHub Actions uploads the Playwright report including JSON attachments. Performance statistics in this initial release are informational and intentionally not a required merge check: GitHub-hosted machines are variable, and these tests do not measure real Android/iOS GPU performance. Existing \`PR validation\` remains the safety gate for normal behavior.

## Practical comparison policy

- Compare before/after on the **same hardware**, resolution, settings and load scenario.
- Look for P95/P99 frame-time regression or spikes, not only average FPS.
- Confirm hostile bullet visibility, warp warnings and touch controls still work.
- A test passing in headless Chromium does not replace a 20–40-minute real-device run.

## Second optimization pass (v11.9)

- Hostile projectiles are grouped into per-color Canvas paths during heavy rendering load and low-effects mode. This reduces draw submissions while retaining hostile bullet geometry and damage checks. Special pressure-bullet warning rings remain drawn on top.
- XP pickup proximity uses squared distances until a shard enters magnet range; a square root is no longer computed for every faraway shard. Pickup compaction reuses the existing array instead of allocating another array every simulation tick.
- The `late-game-stress` test scenario initially adds 500 energy orbs, up to 220 enemies and 300 hostile projectiles, plus magma patches and tornado effects at the 60-minute difficulty setting. The game's normal five-second shard consolidation reduces the number of orb objects without reducing stored XP; the test verifies this. It collects frame time P95/P99 as well as simulation and draw time. This is an **equivalent synthetic workload**, not a real 60-minute session.

Before-and-after numbers from GitHub-hosted runners are indicative only. Always retest on the same device at the same graphics and FPS settings, especially during long combined raids.

## v12.0 Elemental Rebirth
- Wind gusts push ordinary enemies away from the pilot and the gust perimeter, never pull inward. Both knockback and rendered arcs are bounded; bosses remain immune to gust push.
- Elemental fusion at levels 12 and 28 requires one acquired skill of each chosen element. Standard POWER + LEGENDARY evolution is still available separately.
- Secondary-element cards and acquisition history remain in the inventory and are converted into resonance damage; their effects are suspended. Special palettes identify each ordered fusion, including blue fire+ice magma and red wind+fire gusts.
- Fusion-specific rendering uses a reduced animation budget for high-load raids.
