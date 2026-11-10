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

## v12.1 Fusion Selection & Copy Review

- Fusion milestone UI explicitly shows Lv12 (first) and Lv28 (second) and unlocks the choice once two eligible elemental skills are owned.
- Selection proceeds primary/main element first and sacrificed/sub element second; five attribute buttons stay visible and unavailable choices are disabled.
- Both elements used in the first fusion become unavailable for the second fusion, including the original main element.
- Consumed secondary attribute effects are removed. Collected cards stay in build history and investment is converted into primary-element resonance.
- Elemental skills carry the 属性融合素材 tag. Do not show the former repeated 属性融合可能！ banner on every level up.
- Text no longer promises an exclusive palette or calls consumed attribute effects dormant. Celebrations use the main element's color and show the resulting fusion skill name.

## v12.2 — EVOLUTION OVERDRIVE
- The first and second elemental fusions each add +28% direct output across all weapons / elemental damage sources through a single shared damage hook (up to +56% total). Echo investment contributes more to primary elemental skills.
- At pilot Lv22–34 regular boss HP growth is reduced smoothly up to 30%; the 30-minute final boss has separate HP logic and remains unchanged.
- Every FUSIONS recipe has a stable, identifiable colored chassis and themed crest (crystal, bolt, satellite, shield, flame, prism, spiral or orbit) and recolors primary projectiles, beams, escorts, comets, rocks and the drill aura.
- Visuals cap at 3 active seals (1 when heavy-load), with a rotating reveal of previously earned evolution seals and up to 8 attack glyphs (disabled at high pressure). Gameplay hitboxes stay untouched.
- The mobile DASH and NOVA controls use the existing threat-opacity convention when enemies/projectiles pass beneath the controls. The buttons remain interactable; detection uses actual on-screen rects, not world-only bottom bands.
- Validate at 320px and 390px, especially controls while projectiles approach from the right. Compare gameplay balance before and after on identical seeded encounters.


## v13.35 DOUBLE TIME timing diagnostics

Reports now expose `timing.requestedSpeed`, `effectiveSpeed` (simulated game seconds / sampled real seconds), `pendingGameSeconds`, `discardedGameSeconds` and `fixedStep`. A 2x request does not guarantee a slow device can keep up: heavy stalls slow combat rather than advance timers without collisions. The history remains bounded to 480 frames. New runs reset timing history. FPS caps and adaptive render resolution do not change requested simulation speed.

PR benchmarks run the base revision and candidate sequentially on the same runner and attach both reports. Compare the common 1x scenarios, then inspect the additional 2x + BALLISTIC cases separately. Synthetic stress and headless emulation are not real-device or long-session certification.

## v13.37 combat search / allocation optimization (2026-11-10 JST)

Base main: `18e1bc45bdca5fe76fb2ea79a3d5eb469faa27ab`. Branch: `perf/solo-combat-hotpaths-20261110`. Normal solo only; no CO-OP, save, enemy/bullet counts, weapon values, collision precision or simulation-step changes.

Hot paths found in the shipped implementation: cell-coordinate strings rebuilt for each enemy/query; nearest-target search iterates ring interiors only to skip them; barrier clipping allocates an outer array and four coordinate-pair arrays per wall/test (plus empty arrays when no walls exist). Replace these with numeric nested-map coordinates, ordered perimeter traversal and scalar clipping with a shared immutable empty list. Keep cell visitation, insertion order, strict radius/tie rules, dead/hidden exclusions and boss-part priority unchanged. Prune empty nested columns using the existing ten-second maintenance interval.

Four new semantic regression tests cover negative coordinates, 400 broad-phase queries, 700 nearest queries, visibility, strict boundaries/ties, movement/death, pruning, unindexed fallback, final-boss part priority, wall tangency/padding/parallel/zero-length segments and earliest wall. The benchmark additionally compares 4,800 outputs using the actual base/candidate functions, with five alternating timed repeats after warmup; checksums must match. It is a kernel benchmark, not a game simulation or FPS certification.

Local median candidate/base ratios: index rebuild0.933, circle query0.630, segment query0.719, nearest visible0.564, barrier clipping0.965, no-visible-target search0.023. These values do not imply an equivalent improvement to whole-frame time. Run `node scripts/benchmark-hotpaths.mjs BASE_CHECKOUT/index.html`; JSON is emitted under `artifacts/hotpaths/` and uploaded by performance CI.

Macro validation uses both 1x and 2x scenarios on the current base (which already supports DOUBLE TIME), three repeats per revision on the same runner, desktop and mobile390. Add explicit ENGAGE+HARUKANIUM+ISO stress with220 enemies/300 hostile bullets, and enable actual native walls for the five-ship active-tactics stress. Assert walls exist rather than assuming a random raid selected ENGAGE. Also run standard browser, swept collision, 1x/2x, save, catalog and paired400 full-timeline AI regressions. Target: identical gameplay results and improved simulation processing without hiding costs by reducing actors or changing render/game speed.

Local Node geometry/search and fixed-clock tests pass; browser startup was attempted but Chromium fails with `socket() failed: Operation not permitted` / ptrace restriction. Use real Chromium in GitHub CI for frame measurements. CI/headless phone emulation is not a real smartphone performance guarantee. Final CI and integration state are recorded in the PR; do not treat this initial local kernel result as a release or whole-game speedup.

### Release verification: PR #70

Implementation head: `485ab40614181ddc2fbe7230fb243d80d44d0e58`. [PR #70](https://github.com/DanStars12/ankin-drift/pull/70) records implementation and complete comparison. The release remains v13.37; service-worker cache is `ankin-drift-mobile-v13-37-combat-cache-v3`.

Browser performance [run 42705951997](https://github.com/DanStars12/ankin-drift/actions/runs/42705951997): three repeats per revision, same runner per desktop/mobile390 project. Median simulation P95 in milliseconds:

| Scenario | Desktop base → candidate | Mobile390 base → candidate |
| --- | ---: | ---: |
| Normal | 0.6 → 0.6 | 0.4 → 0.4 |
| Dual raid | 2.3 → 1.8 | 1.6 → 1.4 |
| Triple raid | 3.3 → 2.6 | 2.9 → 1.8 |
| Late game, 220 enemies / 300 bullets / 500 XP | 2.2 → 2.1 | 1.9 → 1.7 |
| DOUBLE TIME | 0.6 → 0.4 | 0.5 → 0.5 |
| DOUBLE TIME ENGAGE | 2.3 → 2.5 | 1.6 → 1.2 |
| DOUBLE TIME late game | 2.0 → 2.3 | 1.4 → 1.1 |

Desktop DOUBLE TIME ENGAGE (+0.2ms) and late game (+0.3ms) do not show improvement; repeat ranges overlap. P95 frame times are substantially unchanged (ordinary16.7–16.8ms; macro raid33.3–33.4ms). Do not claim a general FPS increase. Rendering costs and runner scheduling remain separate limitations.

Active five-ship tactics, actual ENGAGE/HARUKANIUM/ISO walls, BALLISTIC and2x: median simulation P50 desktop SHOT4.4→3.8, LASER4.9→4.4, CHARGE3.6→2.7, DRILL2.8→2.3, DOG4.0→3.7ms. Mobile390:0.7→0.7,1.1→0.8,0.7→0.6,0.7→0.6,0.9→0.7ms. Desktop DOG P95 is7.8→8.6ms with overlapping repeat ranges, so the change is not an across-the-board tail improvement. Effective simulation speeds remain~1.996/1.997x, discarded game time0, and reported JS heap medians9.5→9.5MB. These short samples cannot prove long-session memory behavior.

Both CI kernel runs pass4,800 differential outputs and all timed checksums. Candidate/base median ratios: refresh0.951–0.952, circle0.596–0.609, segment0.708–0.712, visible target0.566–0.579, no-visible-target0.023, wall clipping0.969–0.978. Kernel ratios are not whole-frame or FPS ratios.

Quality evidence on implementation head:
- Node85 tests PASS; JavaScript syntax and HTML/PWA PASS.
- Desktop,390px and320px each151 browser tests PASS,10 existing platform/opt-in skips. Initial validation42705951918 and final metadata-edit validation are linked in the PR.
- [Balance42705951972](https://github.com/DanStars12/ankin-drift/actions/runs/42705951972):400 full progression runs,200 old/new seed pairs exactly identical for result, simulated duration, rewards, fusions, clear and boss arrival. NORMAL36/100 and CHALLENGE59/100 on both revisions. SHOT/LASER/CHARGE/DRILL/DOG clears respectively17/1/6/11/1 and18/6/14/5/16. No balance or AI change.
- [DOUBLE TIME42705951632](https://github.com/DanStars12/ankin-drift/actions/runs/42705951632):30 exact1x/2x pairs,60 runs; native15m/30m schedules, final boss, rewards, double fusion and unchanged localStorage.
- [Progression diagnostic42705951670](https://github.com/DanStars12/ankin-drift/actions/runs/42705951670) PASS.

Limits: real phones, physical input latency, real-time30m rendering, GPU/browser diversity and long-session memory retention remain unverified. Headless viewport emulation is not phone hardware. Next priority: real-device drawing profiles and long-session frame/memory traces, then optimize the measured bottleneck without reducing enemies, bullets or danger visibility. The previously recorded conditional-skill availability cases remain a separate task.

Integration: PR #70 squash merge `6ecbe8de7510249ed1bbce2290c6ca929d240fc7`, with final implementation-head validation [42707307956](https://github.com/DanStars12/ankin-drift/actions/runs/42707307956) PASS. Performance evidence above is from the identical production files of implementation head485ab406. The documentation follow-up is `docs/solo-perf-verification-20261110`; it changes only this record.

## v13.37 parallel-stroke rendering (2026-11-10 JST)

Base `bd543afdb391c56139648d34e884d47c5cfaa371`; branch `perf/solo-render-batching-20261110`. For integer render scales and integer logical viewport dimensions, draw background grid vertical lines in one stroke and horizontal lines in a second stroke, retaining the original alpha accumulation at their crossings. Fractional scales/dimensions retain the original per-line rendering. Endpoints, spacing, colors and gameplay layers remain unchanged. No raster cache, persistent collection, graphics downgrade or combat change is introduced. Cache revision: `render-batch-v4`.

At1280×800 with integer pixel scale, the reference grid submits37 strokes versus2. Fractional-scale mobile and adaptive-resolution rendering keep the original command count. These are Canvas command counts, not measured frame-time or FPS improvements. Node geometry tests compare every endpoint with the previous renderer at320px,390px logical mobile coordinates, desktop and4K, including fractional times.

Rejected experiment: batching ENGAGE diagonal hatch strokes changed edge antialiasing. The strict pixel test on head b9ecc180 detected14,821 differing channels, maximum25/255, at320×740 scale0.69. Restore the original individual hatch strokes; do not relax the pixel assertion. The regression continues to extract and exercise the actual shipped ENGAGE loop, including negative/fractional walls, clipping and fading. No ENGAGE rendering optimization is adopted. A second strict failure on head1b64afcf found5,536 grid channels differing by at most2/255 at logical565.217×1223.188, scale1.1316. Preserve original rasterization for fractional scales/dimensions rather than relaxing exact pixel assertions. Integer-scale batching remains a candidate pending latest-head validation.

The browser regression compares all pixel channels against previous drawing commands in36 grid/hatch scenes at six viewport/resolution configurations and three animation times. The Canvas diagnostic alternates five old/new samples after warmup, each drawing60 frames with four unchanged ENGAGE walls and synchronous readback on every frame. It checks equal checksums and reports timings without assuming a speedup. This is a paint-kernel measurement, not game FPS. Existing same-runner macro and five-ship active stress benchmarks remain the gameplay performance comparison. Full timeline and save regressions remain required before merge.

Local Chromium startup was retried and still fails with socket/ptrace restrictions. Local Node87 checks, syntax and HTML/PWA pass. Latest-head CI pixel equality, macro performance and integration results must be confirmed and recorded in the PR before merge. Real-phone drawing profiles, physical input latency, real-time30m rendering and long-session memory trends remain open; these batching changes do not certify them.
