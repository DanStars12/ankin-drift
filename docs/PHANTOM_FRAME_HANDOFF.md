# PHANTOM FRAME / DARK ELEMENT — development handoff

Development branch: `feature/phantom-frame-20261114`  
Base: `origin/main` at `925acf2ffe281485ced1f72ade397cadab33d6b8` (v14.0).  
Status: **implemented development candidate; not approved for main or release**.

## Implementation

| Area | Implementation | Validation status |
|---|---|---|
| PHANTOM basic combat | White translucent ghost, small core, one autonomous silver phantom; ghost has no ordinary shot | Logic tests pass; visual review pending |
| Combat AI | HUNT / CHASE / ATTACK / REPOSITION, independent target selection, arena patrol, barrier-aware approach | Real game logic and engine stress tests |
| Blade | Directional sectors, bounded targets, criticals, distinct ownership/attack IDs, no recursive secondary attacks | Tested |
| Level | Independent Lv1–10; core/limit/parade growth; bounded overflow | Tested |
| Defense / XP | Post-dash immunity, HP/shield upgrades, local XP collection, conservation during compression, finite attraction | Tested |
| NOVA | SPECTRAL OVERDRIVE, local bullet clear, three compatible evolutions, distinct NOVA damage and barrier bypass | Tested |
| Night Parade | Two additional phantoms, total three; secondary phantoms cannot emit elements | Tested |
| Cards | 22 normal PHANTOM skills, six legends, six powers, four relics, three NOVA cores; shared useful survival/NOVA rewards | Tested; long-run reward balance incomplete |
| Evolution | Six concurrent weapon/support evolutions plus three NOVA evolutions; rank-aware recipes and BUILD ASSIST | Tested |
| DARK | Fear aura, stationary square virus, up to three temporary allies, no reward/conversion recursion; DOG bat/bear names and vector mascots | Logic tested; visual review pending |
| Element fusion | Six elements; sixty directed A/B variants; three disjoint pairs at Lv12/28/40; consumed DARK effects cleared | Tested |
| UI / saves | Six ship cards, PHANTOM HUD, recipe rank labels, four normal choices, DARK and three-fusion archive/ending support | Logic and archive tests; browser/mobile layout pending |
| CO-OP / audio | No CO-OP or audio asset changes | Source scope checked; real browser regression blocked |

## Checks

- Baseline: 114 existing Node tests passed before implementation.
- Final local check: **138 Node tests passed, 0 failed**; JavaScript syntax passed; PWA shell/reference validation passed with 24 cache entries. 23 tests specifically exercise the PHANTOM/DARK integration.
- `npm run test:phantom` runs production-code integration tests through `scripts/runtime-vm-harness.mjs`.
- `npm run validate:phantom` runs six-frame seeded combat and actual 15/30-minute game schedulers.
- `node scripts/stress-phantom.mjs` runs 1,800 game seconds of synthetic engine stress with all nine PHANTOM evolutions, 200 enemies including three bosses. This is **not** a survival/clear-rate or rendering benchmark.
- `docs/qa/phantom-engine-stress.json`: exact stress results; 1,062,645 hits, maximum 14 pending secondary slashes and 21 visual effects. All element callbacks were from the primary phantom; no extra elemental callbacks.
- `docs/qa/phantom-simulation.json`: initial integration snapshot, 36 short encounters and twelve planned full-timeline attempts. Keep these historical results separate from later candidates.
- `docs/qa/phantom-final-simulation.json`: later shared-reward candidate.
- `docs/qa/phantom-defensive-ai-simulation.json`: defensive pilot AI candidate with rank/ownership/AI-time diagnostics. One seed per full mode; not statistically sufficient for release decisions. These candidate reports precede the final HUNT patrol fix; that fix is covered by a dedicated runtime test and the final synthetic stress run.

### Browser limitation

Playwright attempted system Chromium (`/usr/bin/chromium`). Every attempted case failed before page execution at Chromium startup:

`FATAL:chrome/browser/process_singleton_posix.cc:297 — socket() failed: Operation not permitted (1)`

The VM host stubs DOM/canvas. It can exercise production combat, save, menu markup, HUD, and renderer call paths, but **cannot** verify pixels, element clipping, touch input, PWA offline behavior, audio playback, FPS, or browser frame time. No such measurements are claimed.

### Balance findings

In the initial three-seed, 30-second live-pack scenario at ten-minute enemy scaling, PHANTOM averaged 279.4 DPS against a five-frame median of 252.6 (+10.6%). Several seeds die before the 30-second cap; DPS is calculated over actual survival duration. This does not establish 15/30-minute survival or completed-build parity.

Full-timeline PHANTOM attempts still die before final boss eligibility. Initial snapshot: challenge 398.48 seconds / Lv25; normal 266.40 seconds / Lv22. Shared-reward candidate: challenge 389.73 / Lv24; normal 259.67 / Lv21. Defensive pilot candidate: challenge 605.78 / Lv34; normal 130.90 / Lv11. The defensive AI candidate improves its tested challenge attempt but worsens its tested normal attempt. Do not treat the candidate as a proven improvement. Distinguish pilot policy failures from human-facing frame balance; expand to multiple seeds before changing difficulty or base damage.

## Unresolved / next work

1. Run browser/PC/mobile layout, touch, real FPS and frame-time profiling, PWA offline, BGM and baseline visual regression in an environment where Chromium can launch.
2. Validate 15/30-minute PHANTOM survival across several seeds; compare ghost navigation, XP routes, defense acquisition, phantom level, and evolution completion. Current full-run samples do not meet release criteria.
3. Re-check phantom path recovery against several ENGAGE barriers and moving screen edges in an actual browser.
4. Audit all DARK A/B variants during actual combat, including area telegraphs and ally visuals, and compare high-build DPS with the five existing frames.
5. Add real frame-level profiling with multiple raids, evolved blades, many projectiles, dark allies, and DOUBLE TIME. Synthetic CPU-only results are insufficient.
6. Request review for the complete LEVEL 4 change after these checks. Keep main and the live site unchanged.

## GitHub publication status

The user approved branch publication after destination verification. The connected GitHub integration uploaded the three commits and verified that the resulting source tree exactly matches the locally tested tree `da459bc00f919df4f3688b5361f79292b75548d4`.

Draft PR: https://github.com/DanStars12/ankin-drift/pull/78  
Branch: `feature/phantom-frame-20261114`  
Published implementation/test/report commit: `d475c2968c9957cf1e60a7f22f12443cac7af9b3` (same files as local checkpoint `540cbe0`).

The earlier approval-review blocker is resolved. Git command-line push lacked credentials; the connected GitHub integration completed publication. Main and the live site remain unchanged. Browser/FPS verification and long-run balance are still release blockers.

## Initial full-timeline comparison (one seed per mode)

| Frame | Challenge elapsed / result | Normal elapsed / result |
|---|---|---|
| SHOT | 916.90s / clear | 1802.47s / clear |
| LASER | 960.00s / time-limit | 1290.58s / dead |
| CHARGE | 930.90s / clear | 1817.07s / clear |
| DRILL | 929.25s / dead | 1860.00s / time-limit |
| DOG | 925.52s / clear | 1224.78s / dead |
| PHANTOM | 398.48s / dead | 266.40s / dead |

A time limit is a live run that ended at the planned benchmark cap, not a victory. Historical runs are not final-build acceptance tests.
