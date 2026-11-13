# PHANTOM DARTS / DARK update — 2026-11-14 JST

Base: main 7082913. Change: PR #79 (feature/phantom-darts-dark-20261114).

## Behavior

- PHANTOM: angular silver frame with luminous core/wing details, layered blade arcs, and four afterimages on the visible warp path. Primary and parade frames prioritize live RELIC enemies, including outside the ordinary sensing radius, without attacking through barriers.
- Every skill choice shows its current acquisition count and explicit maximum where configured. DARK choices and attribute tags use purple accents.
- PHANTOM relic pool: six unique relics (previously four); the existing reward/spawn rules still apply. Two additions: low-health execution bonus and every-fifth-slash echo.
- PHANTOM-only NOVA reuse reduction: 0.8 seconds per rank, three ranks, existing 10.5-second floor and energy requirement retained.

## DARTS

Each acquisition randomly unlocks an unowned type, for at most five different types. Darts do not consume primary/parade slots or use blade attacks or elemental copies. Shared sortie: 15 seconds deployed, then 10 seconds waiting. An acquisition during a sortie joins its remaining deployment time; during cooldown it joins the next sortie. Upgrade cards add 3 seconds per rank (three ranks), subtract 1 second from cooldown per rank (three ranks), or add 12% output per rank (four ranks).

| Type | Behavior |
|---|---|
| Shot | Fast, low-damage projectiles |
| Laser | Powerful, narrow, short-range beam |
| Charge | Charges while moving and fires a projectile that hits every aligned enemy once |
| Support | Follows ghost, heals inside its finite barrier, damages nearby enemies; barrier is destroyed by hostile hits and does not regenerate within a sortie |
| Follow | Collects XP only, with a 1.2 multiplier before ghost XP bonuses; healing items remain on the field |

Base movement speed and output derive from half the upgraded primary PHANTOM stats. Shot/beam/charge cadence follows PHANTOM attack-rate upgrades. Active types, positions, charge, barrier health, projectile hit sets, and sortie timers survive build reconstruction.

## DARK

- Fear continues to move enemies away from the player-controlled ghost for PHANTOM; the aura's attack origin remains the primary frame.
- Virus squares rotate clockwise at 0.7 rad/s. Collision checks transform enemies into the same rotating square's local coordinates.
- All converted enemies, including bear conversions, use the same mint ring, ALLY label and lifetime bar.
- Bat: pointed ears, scalloped wings, wing ribs and fangs. Bear: rounded head, brown ears, muzzle and blush, no white rectangular face outline.
- Four upgrade skills improve dark damage, cadence, fear duration, and ally damage. Synergies add weakness on fear-aura hits and increased virus damage to frightened enemies. DOG variants are supported. Boss immunity to fear/conversion, three allies and five-second lifetime remain enforced.

## Verification

- Local unit/logic tests: 161 passed (93 arsenal/combat, 16 clocks/kernels, 6 trace accounting, 17 archive, 8 ending, 12 balance report, 9 ability tactics).
- JavaScript syntax and HTML/PWA checks passed.
- Eleven new regression cases cover unique dart unlocks/cap, 15/10 timing, live-state preservation, XP bonus without duplicate collection, healing exclusion, finite support barrier, moving charge and penetration, output/cadence upgrades, distant RELIC priority, ghost fear direction, rotated-square collision, DOG availability, and cooldown limits.
- Synthetic engine-only stress: 1800 game seconds, 200 enemies including three bosses, three PHANTOM frames, five darts and all nine evolutions. Passed bounds: 15 queued echoes max, 24 blade/warp visuals max, five darts max, five live dart projectiles max, three laser visuals max. See qa/phantom-darts-engine-stress.json. This is not a rendering/FPS or full balance acceptance result.
- Local real-browser attempt blocked by environment `socket() ... Operation not permitted`; PC/390/320 browser verification runs in GitHub CI. Full approval remains pending those checks and visual review.
