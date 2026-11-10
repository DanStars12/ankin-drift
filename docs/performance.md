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

## v13.37 rendering audit and pixel regression protection (2026-11-10 JST)

Base `bd543afdb391c56139648d34e884d47c5cfaa371`; branch `perf/solo-render-batching-20261110`; [PR #72](https://github.com/DanStars12/ankin-drift/pull/72). No production rendering, cache, gameplay, save or CO-OP change is adopted. The final scope is development-only rendering tests and measurement infrastructure.

Rejected experiments:
- ENGAGE diagonal stroke batching on b9ecc180: strict comparison found14,821 differing channels, maximum25/255, at320×740 scale0.69.
- Backdrop grid batching on1b64afcf:5,536 channels differed by at most2/255 at logical565.217×1223.188, scale1.1316.
- Integer-scale-only grid batching on63b1812e:33,306 channels differed by at most1/255 at1280×800 scale2, time0.123. Even this restricted version did not retain exact rasterization.

Canvas command counts dropped37→2 for the1280×800 grid and176→4 for four experimental ENGAGE walls. However, final restricted-grid paint timings improved only about1% (desktop diagnostic median61.1→60.4ms per60 sampled frames, five alternating repeats after warmup). This is not whole-game FPS evidence. The small gain does not justify changing pixel coverage; restore index.html and sw.js byte-for-byte to the base. Do not weaken the pixel assertion or adopt the rejected paths later without new evidence.

Two Node regressions extract the actual shipped grid and wall loops and compare their endpoints and stroke counts with independent previous-renderer references, including negative/fractional coordinates and320px,390px logical mobile, desktop and4K sizes. Browser tests compare every pixel channel in36 grid/hatch scenes at six viewport/resolution configurations and three animation times, including clipped walls and fading opacity. Exact equality is required. The second browser test records native-reference timing baselines with60 frames per sample, per-frame synchronous readback, two warmup rounds, five alternating samples and equal final checksums. Identical production algorithms are now compared; fluctuations are measurement noise, not an optimization claim.

87 local Node tests, syntax and HTML/PWA pass. The latest final-head browser/performance checks must pass before merging the QA additions. Earlier candidate validation/performance failures and cancelled superseded runs remain in PR history. The existing same-runner macro/five-ship performance profiles continue to run unchanged. Next: use rendering traces to locate a larger bottleneck before changing drawing algorithms; preserve these coverage tests as a quality gate. Real devices, physical input latency, real-time30m drawing and long-session memory trends remain unverified. Local Chromium is blocked by socket/ptrace restrictions; actual browser checks run in GitHub CI.

## Native rendering trace diagnosis and benchmark isolation (2026-11-11 JST)

Base `7b95b1141190cab22fff4595850ce62a75cf5230`; branch `perf/solo-render-traces-20261111`; [PR #73](https://github.com/DanStars12/ankin-drift/pull/73). Production rendering, simulation, saves, graphics settings and CO-OP remain unchanged. This cycle improves measurement fidelity and makes native browser work inspectable rather than claiming a new game FPS improvement.

`ANKIN_RENDER_TRACE=1 npx playwright test tests/render-trace.spec.mjs --project=desktop` (or mobile-390) runs native normal SHOT, 2x ENGAGE triple raid and 2x DOG with escorts, two repeats. Each has an untraced4s window and a reset/warmup followed by4s of Chrome trace and1ms V8 CPU sampling. Diagnostic counters reset after warmup; real combat clocks are not reset mid-window. Optional `ANKIN_HUD_ABLATION=1` adds no-HUD-blur variants. Actual actors, graphics scale, browser/GPU backend, frame/draw/simulation/heap/timing reports accompany captures. Fixtures use high enemy HP / invulnerability to maintain load, not to certify real-player balance.

A separate recorder-overhead test alternates native4s windows with Playwright screenshot/snapshot recording on/off, reversing order for the second repeat. Head39faa7c results on the same runner: desktop DOG recording-on42.0/45.2FPS versus off48.2/49.0FPS; on scales0.76/0.88 versus off0.88/0.88. Desktop ENGAGE on48.2/47.2FPS versus off49.2/49.0FPS. Mobile390 remains59–60FPS on and60FPS off. Short samples and adaptive scaling limit generalization; these differences are measurement overhead, not shipped-game speedups.

Consequently performance.spec, tactical-performance and render-batching diagnostics explicitly disable automatic Playwright trace recording. Use ANKIN_PERF_DEBUG_TRACE=1 for an explicit debug rerun; those timings must not be compared with recorder-off measurements. Functional smoke tests retain their debug traces; performance failures retain screenshots, page errors and JSON reports, plus dedicated raw Chrome/CPU captures. Local Playwright1.64 source confirms trace defaults include screenshots and snapshots even in retain-on-failure mode. See [Playwright trace options](https://playwright.dev/docs/api/class-testoptions#test-options-trace). Both PR comparison revisions receive the same updated benchmark harness. Historical recorder-on numbers above must not be compared directly with the new recorder-off baseline.

The native benchmark fixture also resets overload/recovery clocks, render budget, last draw and FPS counters before applying resolution. Earlier scenarios could otherwise leave the next scenario partially overloaded despite resetting scale to1. A VM regression executes the actual injected setup against deliberately stale prior state and checks reset ordering. This changes only tests, not the shipped game.

CI stores gzipped Chrome JSON traces, CPU profiles and summaries under `artifacts/render-traces/`, uploaded as render-trace-desktop/mobile-390 for14days. A capture requires nonempty events/samples and explicit dataLossOccurred=false. The32MB setting bounds the Chrome buffer, not JSON expansion or compressed artifact size. Raw B/E and async events remain available; automatic duration aggregation handles complete X events only and reports phase/invalid counts. Per-thread interval union avoids double-counting nested tasks. Inclusive event durations overlap; they are wall time, not CPU utilization, and must not be added across threads.

V8 samples can arrive out of timestamp order. The first CI capture contained268 negative deltas among3849 samples, with all reconstructed timestamps within profile bounds. Reconstruct cumulative timestamps, stable-sort them and estimate forward intervals; report the initial unsampled gap, negative-delta count and reordered count. Never clamp/absolutize deltas or mislabel idle/program/GC as GPU cost. This follows the timestamp sorting approach in [Chrome DevTools](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/cpu_profile/CPUProfileDataModel.ts). Five aggregation regressions plus the fixture regression bring the Node total to93. Invalid bounds, missing nodes, nonfinite values and time before profile start remain rejected.

Findings on heada88c581: both projects report unavailable_software Canvas2D and disabled_software GPU compositing, using SwiftShader. Renderer-main LayerTreeHost::DoUpdateLayers inclusive durations dominate much of the capture, while sampled game functions are much smaller. These are attribution leads, not proof of GPU utilization. HUD blur ablation did not clearly change heavy-scenario frameP95 (desktop33.4ms with/without); mobile native HUD filter is already none. No HUD appearance change is adopted.

Local Chromium startup was retried and still fails with socket/ptrace restrictions; actual capture is verified in CI. Final latest-head results and integration are recorded in PR #73. Real devices, physical input latency, real-time30m rendering and long-session memory trends remain unverified. Next: compare traces from real GPU/device conditions before changing expensive-looking compositor paths. Do not repeat the rejected Canvas batching or HUD-blur experiments without new evidence. Previous main Pages deployment42814825420 had a timeout; its failed deployment stage was retried and succeeded, with production files unchanged.

## 2026-11-11 — Neon stability regression (pending CI)

Base `9cf889dd1b27e2d4b5be70f907332df5d776526d`; branch `fix/solo-directed-fusion-visuals-20261111`. Per-frame load/shot-count toggles previously switched neon shadows instantaneously. The shared render controller now enters reduced detail after sustained pressure, exits only after 3s below a lower threshold, and interpolates glow using wall-time exponential decay. Paused/choice screens retain quality state; a new run resets it. Shot motif and background-star opacity follow the same envelope. Enemy hit feedback no longer replaces the entire enemy fill with white. Hit physics, damage numbers, warnings and combat fixed steps are retained. These are visual stability changes, not claimed FPS improvements. Added 15/30/60/144Hz boundary-chatter and transition regressions; native browser/performance comparisons remain pending. No CO-OP changes.

During fusion stress review, the tactical benchmark was found to call the combat fixture from the title screen without entering the playing UI: `mode='playing'` advanced physics but left the full-screen title backdrop blur visible. The fixture now explicitly calls `state('playing')`, and active-weapon benchmarks assert that overlay is hidden and HUD visible. The exact updated fixture is copied into the baseline checkout as well. Earlier title-overlay FPS numbers are not valid in-play performance evidence; both sides are remeasured. The existing render-trace and ordinary benchmark tests already entered combat through Start/Guide, so this finding does not reattribute their previous native traces.

The corrected in-play comparison still showed extra cost in the synthetic 16-magma, 220-enemy, 300-hostile, 2x triple-raid workload: retaining all parents plus two children expanded 16 areas to48. The wind fusion now divides each parent into two 70%-radius daughters (parent becomes one), retaining98% total area with the original DPS and remaining lifetime. The same fixture now has at most32 daughter areas, without reducing enemies or hostile bullets. Both daughters must fit walls; cap saturation preserves the original patch. Re-measurement is required before adoption. Added a separate regression preventing map-edge clamping from redirecting wind knockback toward the pilot.

Fusion ablation (desktop/mobile, two reversed-order repeats) retained the FPS loss without splitting, gradients, adaptive glow or burn decorations, but removing inherited effects restored60FPS in all four windows. Those scenes had167–177 slowed enemies. `enemyDraw` still assigned an unconditional6px shadow to every slow outline; it now uses the same `neonBlur(6)` envelope as other neon. Slow timing, damage, enemy fill and blue outline remain intact. A native-render regression verifies high-quality/zero-envelope/LOW/SIMPLE values. Adoption still requires the final before/after benchmark.

A second ablation kept slow physics while hiding only slow decorations: desktop60/60FPS and mobile58/60FPS, versus full55/60 and50/55FPS on those runners. Direct slow bookkeeping or HUD blur removal alone did not explain the whole difference. At heavy load, the redundant slow ring now fades with the shared glow envelope and stops submitting strokes once almost transparent; the blue enemy fill remains, and frozen outlines remain visible. Normal-quality appearance is unchanged. The native-render regression verifies the blue fill, half-opacity transition and persistent frozen outline.
