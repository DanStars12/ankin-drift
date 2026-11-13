# PHANTOM FRAME / DARK ELEMENT — development handoff

Development branch: `feature/phantom-frame-20261114`  
Base: `origin/main` at `925acf2ffe281485ced1f72ade397cadab33d6b8` (v14.0).  
Status: **implemented development candidate; not approved for main or release**.

## Implementation

| Area | Implementation | Validation status |
|---|---|---|
| PHANTOM basic combat | White translucent ghost, small core, one autonomous silver phantom; ghost has no ordinary shot | Logic tests and real-browser pressure fixture; broad visual review pending |
| Combat AI | HUNT / CHASE / ATTACK / REPOSITION, independent target selection, arena patrol, barrier-aware approach | Real game logic and engine stress tests |
| Blade | Directional sectors, bounded targets, criticals, distinct ownership/attack IDs, no recursive secondary attacks | Tested |
| Level | Independent Lv1–10; core/limit/parade growth; bounded overflow | Tested |
| Defense / XP | Post-dash immunity, HP/shield upgrades, local XP collection, conservation during compression, finite attraction | Tested |
| NOVA | SPECTRAL OVERDRIVE, local bullet clear, three compatible evolutions, distinct NOVA damage and barrier bypass | Tested |
| Night Parade | Two additional phantoms, total three; secondary phantoms cannot emit elements | Tested |
| Cards | 22 normal PHANTOM skills, six legends, six powers, four relics, three NOVA cores; shared useful survival/NOVA rewards | Tested; long-run reward balance incomplete |
| Evolution | Six concurrent weapon/support evolutions plus three NOVA evolutions; rank-aware recipes and BUILD ASSIST | Tested |
| DARK | Fear aura, stationary square virus, up to three temporary allies, no reward/conversion recursion; DOG bat/bear names and vector mascots | Logic and guide navigation tested; broad visual review pending |
| Element fusion | Six elements; sixty directed A/B variants; three disjoint pairs at Lv12/28/40; consumed DARK effects cleared | Tested |
| UI / saves | Six ship cards, PHANTOM HUD, recipe rank labels, four normal choices, DARK and three-fusion archive/ending support | Logic, archive, six-frame title, guide navigation and responsive browser tests |
| CO-OP / audio | No CO-OP or audio asset changes | Source scope checked; soundtrack browser regressions; physical audio playback unverified |

## Checks

- Baseline: 114 existing Node tests passed before implementation.
- Latest local check: **150 Node tests passed, 0 failed**; JavaScript syntax passed; PWA shell/reference validation passed with 24 cache entries. `test:phantom` contains 30 PHANTOM/DARK integration tests and five deterministic pilot-planner tests; all 35 pass.
- `npm run test:phantom` runs production-code integration tests through `scripts/runtime-vm-harness.mjs`.
- `npm run validate:phantom` runs six-frame seeded combat and actual 15/30-minute game schedulers.
- `node scripts/stress-phantom.mjs` runs 1,800 game seconds of synthetic engine stress with all nine PHANTOM evolutions, 200 enemies including three bosses. This is **not** a survival/clear-rate or rendering benchmark.
- `docs/qa/phantom-engine-stress.json`: latest exact stress results; 1,055,781 hits, maximum 14 pending secondary slashes and 21 visual effects. All element callbacks were from the primary phantom; no extra elemental callbacks. This is CPU-only evidence.
- `docs/qa/phantom-simulation.json`: initial integration snapshot, 36 short encounters and twelve planned full-timeline attempts. Keep these historical results separate from later candidates.
- `docs/qa/phantom-final-simulation.json`: later shared-reward candidate.
- `docs/qa/phantom-defensive-ai-simulation.json`: defensive pilot AI candidate with rank/ownership/AI-time diagnostics. One seed per full mode; not statistically sufficient for release decisions. These candidate reports precede the final HUNT patrol fix; that fix is covered by a dedicated runtime test and the final synthetic stress run.

### Browser evidence and local limitation

GitHub Actions can launch real Chromium. Implementation commit `0c5a8be01d4f11f413dce599d9e57531761479a1` passed validation run `43506372088`: **163 passed, zero failed, ten skipped on each of desktop, mobile-390 and mobile-320**. Syntax/Node, HTML/PWA and the aggregate PR validation jobs all succeeded. The preceding run's one failure per profile (an outdated common-codex expectation) is resolved. This acceptance applies to the implementation commit; later report-only commits do not change the tested game source.

Exact browser counters are preserved in `docs/qa/phantom-browser-validation.json`.

| Browser profile | 1x FPS / frame p95 | 2x FPS / frame p95 | Observed 2x game speed |
|---|---|---|---|
| desktop | 58 / 16.8 ms | 54 / 33.3 ms | 1.995x |
| mobile-390 | 53 / 33.4 ms | 54 / 33.4 ms | 1.995x |
| mobile-320 | 60 / 16.8 ms | 60 / 16.8 ms | 1.995x |

All six fixture measurements recorded zero discarded game seconds. These are short, non-seeded runner samples, not guaranteed FPS bounds.

The new fixture exercises three level-10 evolved phantoms, DARK, 120 enemies and two bosses for three real seconds at each speed (1x and 2x), logs native performance counters and attaches screenshots. Its ghost is invulnerable, so this measures browser execution and bounded effects, not survival or fair difficulty. Runner FPS does not predict the user's PC or physical phone performance. An inspected mobile-320 guide screenshot from the preceding run shows the PHANTOM blade preview and navigation fitting the viewport. That runner lacks Japanese glyphs, so the screenshot cannot establish Japanese text legibility.

Playwright attempted system Chromium (`/usr/bin/chromium`). Every attempted case failed before page execution at Chromium startup:

`FATAL:chrome/browser/process_singleton_posix.cc:297 — socket() failed: Operation not permitted (1)`

The local VM host stubs DOM/canvas. It can exercise production combat, save, menu markup, HUD, and renderer call paths, but cannot provide pixel or FPS evidence. Browser evidence must come from the actual Actions runs and their artifacts, rather than from the VM.

### Follow-up fixes

- Ordinary phantom attacks use the shared elemental conversion rules, including ice slow and lightning cooldown. Additional parade phantoms remain non-elemental.
- ENGAGE navigation routes around padded wall corners, escapes a wall that appears over a phantom, and skips enemies inside inaccessible barriers. Escape is gradual, without teleporting or ordinary attacks through walls.
- A protected final-boss core is excluded while modules remain alive. Independent NOVA tempest pulses retain barrier bypass without depending on ordinary blade hits.
- PHANTOM ignores boss-triggered automatic XP vacuum so the ghost collects its own drops; deliberate EXP SWEEP remains available. Other frames retain their existing behavior.
- PHANTOM now has six production-renderer guide previews. DARK and the two DOG mascots have guide entries; navigation and save preservation have browser coverage.
- The service worker cache version includes the new module APIs to avoid mixed installed versions.
- The optional lookahead pilot scores contact threats, projectile paths, hazards, walls and reachable XP. The default pilot remains unchanged because full-mode outcomes are mixed.

### Balance findings

In the initial three-seed, 30-second live-pack scenario at ten-minute enemy scaling, PHANTOM averaged 279.4 DPS against a five-frame median of 252.6 (+10.6%). Several seeds die before the 30-second cap; DPS is calculated over actual survival duration. This does not establish 15/30-minute survival or completed-build parity.

Historical full-timeline attempts died before final boss eligibility: initial challenge 398.48 seconds / Lv25 and normal 266.40 seconds / Lv22; shared-reward candidate 389.73 / Lv24 and 259.67 / Lv21; defensive candidate 605.78 / Lv34 and 130.90 / Lv11. Later candidates reach the final-boss schedule in some seeds but have not established clear-rate parity. Distinguish pilot policy failures from human-facing frame balance; expand to multiple seeds before changing difficulty or base damage.

`phantom-pilot-comparison.json` records an earlier mechanics snapshot's five-seed 60-second comparison: the potential pilot survived 0/5, the optional lookahead pilot 3/5. This is a representative short encounter, not a full-run clear rate or a five-seed validation of the latest mechanics. `phantom-pilot-full-comparison.json` and `phantom-pilot-routes-xp-comparison.json` are intermediate mechanics snapshots. `phantom-pilot-final-comparison.json` is the post-module-targeting/NOVA snapshot; use its source hash to check comparability. A time-limit result means alive at the benchmark cap, not victory. Source hashes deliberately exclude documentation and browser-test-only changes.

Latest full-run mechanics source hash: `a0a620b20f08bc366ace66b447b359864486501d34464f9f5ce9ade99609f1d4`.

| Mode | Pilot | Seed | Elapsed game seconds | Player level | Result |
|---|---|---|---:|---:|---|
| Challenge | potential (default) | 1 | 398.50 | 25 | dead |
| Challenge | potential (default) | 2 | 960.00 | 42 | time-limit |
| Challenge | lookahead (optional) | 1 | 960.00 | 44 | time-limit |
| Challenge | lookahead (optional) | 2 | 539.22 | 31 | dead |
| Normal | potential (default) | 1 | 258.87 | 19 | dead |
| Normal | potential (default) | 2 | 1203.72 | 66 | dead |
| Normal | lookahead (optional) | 1 | 1860.00 | 94 | time-limit |
| Normal | lookahead (optional) | 2 | 1845.18 | 88 | clear |

The optional pilot reaches the 30-minute boss in both tested normal seeds and clears one. Challenge remains mixed. Eight runs (two seeds per mode and policy) do not establish reliable survival or a release-quality clear rate; neither pilot nor player-facing difficulty was changed to turn time limits into wins.

## Unresolved / next work

1. Inspect wider visual and tactile behavior on physical devices; the three-profile Actions run is green and pressure counters/screenshots have been checked. The runner lacks Japanese glyphs, so Japanese text legibility and physical audio playback still require separate checks.
2. Validate 15/30-minute PHANTOM survival across several seeds; compare ghost navigation, XP routes, defense acquisition, phantom level, and evolution completion. Current full-run samples do not meet release criteria.
3. Re-check phantom path recovery against several ENGAGE barriers and moving screen edges in an actual browser. Production-code wall, trapped-spawn, protected-core and NOVA-through-wall regressions already pass locally.
4. Audit all DARK A/B variants during actual combat, including area telegraphs and ally visuals, and compare high-build DPS with the five existing frames.
5. Add real frame-level profiling with multiple raids, evolved blades, many projectiles, dark allies, and DOUBLE TIME. Synthetic CPU-only results are insufficient.
6. Request review for the complete LEVEL 4 change after these checks. Keep main and the live site unchanged.

## GitHub publication status

The user approved branch publication after destination verification. The connected GitHub integration uploaded the three commits and verified that the resulting source tree exactly matches the locally tested tree `da459bc00f919df4f3688b5361f79292b75548d4`.

Draft PR: https://github.com/DanStars12/ankin-drift/pull/78  
Branch: `feature/phantom-frame-20261114`  
Published implementation/test/report commit: `d475c2968c9957cf1e60a7f22f12443cac7af9b3` (same files as local checkpoint `540cbe0`).

The earlier approval-review blocker is resolved. Git command-line push lacked credentials; the connected GitHub integration completed publication. The latest implementation is `0c5a8be01d4f11f413dce599d9e57531761479a1` (tree `0c3fa7646c677facbb48c21e76f596799855044f`, identical to local `bf5275b`). Main and the live site remain unchanged. Three-profile browser acceptance is green; broad visual review and long-run balance remain release blockers.

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
