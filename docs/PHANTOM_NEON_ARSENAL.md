# PHANTOM NEON ARSENAL — 2026-11-14

Base: main 8c9c0ba. Solo mode only; CO-OP is unchanged.

## Visuals and UI

The blade is now a thin white-neon isosceles triangle. It sweeps across the existing forward attack cone with angular afterimages; the purple fear aura retains its arcs. Blade hit rules, wall blocking and NOVA damage provenance are unchanged.

All six attribute colors appear in a gradient strip below the card description. The rarity border, title and rank remain available independently of attribute. The old full-card DARK overlay has been removed.

Hover details no longer cover their source trigger: placement uses the available space above or below and limits the panel height. Mouse exit waits 160 ms and is canceled on entering the tooltip, allowing recipe inspection and navigation. Choice cards no longer move upward under the pointer. Touch pinning and Escape dismissal remain supported.

Dart codex: a compact five-role overview plus five individual large animated previews, with each role's behavior and upgrades explained.

## Progression and regular skills

The first acquisition of each of ph_darts / ph_hunt / ph_sync / ph_assault / ph_shell grants one PHANTOM level. Repeated acquisition of the same skill does not grant another first-acquisition level. Rebuilding the loadout reconstructs this bonus once, with the existing level-10 ceiling.

Seven new regular dart upgrades: capacity limit break, thrusters, range, barrier armor, charge coil, healing and boss/relic focus. Dart skills carry the ファントムダーツ tag and expose a tag explanation.

The first five unlocked darts have distinct types. Additional slots choose randomly from all five types, including repeats. Limit break grants one slot/one dart per rank (five ranks). Armada and Sovereign can each add two slots/two darts. The absolute cap is 12 darts; primary and parade frames are a separate pool.

Support barrier base durability increases from 30 + 0.4 × primary output to 40 + 0.5 × primary output. A destroyed barrier rebuilds after five combat seconds. Bastion reduces this to four seconds. The recovery timer and barrier health survive loadout reconstruction. Projectile collision still uses swept segments.

## New upper-tier cards

| Tier | Card | Effect |
|---|---|---|
| LEGENDARY | ファントム・アルマダ | Two additional dart slots and darts, capped at 12 |
| LEGENDARY | ダーツ・コマンドリンク | Dart output +25%, cadence +12% |
| LEGENDARY | 白銀のデュエリスト | Blade damage to bosses/relic enemies +25% |
| LEGENDARY | ゴースト・ガーディアン | NOVA restores 10% ghost maximum HP |
| POWER | ANKIN ダーツリアクター | Dart weapon/charge cadence +15% |
| POWER | ANKIN バリア・バスティオン | Support barrier durability +50%, rebuild in 4 seconds |
| POWER | ANKIN ネオンランス | Blade reach +18, target cap +2 |
| POWER | ANKIN ソウルドライブ | XP pickup activates blade relay; NOVA gain +0.06 |
| UNIQUE | ダーツ・ソヴリン | Two dart slots/darts, sortie +5 seconds |
| UNIQUE | プリズム・ダーツ | Shot darts fire two 75%-damage projectiles |
| UNIQUE | 白刃ゼニス | Every fourth blade swing adds one 90%-damage echo; no recursion |
| UNIQUE | フェニックス・レスキュー | Support barrier/healing +50%; restoration clears nearby hostile shots |
| RELIC | ミラー・ダーツ | Shot dart projectiles bounce off the arena edge once |
| RELIC | クロノ・ニードル | Charge dart fires a delayed 60%-damage piercing echo |
| RELIC | アストラル・ハーベスト | Follow XP multiplier 1.2 → 1.35, before ghost XP modifiers |
| RELIC | 白刃の蓄電器 | Blade hit restores one shield, at most once per 0.25 seconds |

PHANTOM relic definitions total 10. Existing spawn/reward-selection rules are retained.

## Program Control

ウイルス・オーバーロード: virus-area damage +25% per rank, four ranks.
パーシステント・コード: virus-area duration +0.75 seconds per rank, four ranks (base three seconds).
Both require a virus weapon and also support the DOG bear. They do not extend converted-enemy lifetime or change ally caps and boss immunity.

## Verification

Local arsenal/combat: 102 passed. Clocks, archive, ending, trace, balance reports and ability-tactic suites passed; total local unit tests: 170. Syntax and PWA checks passed.

Regression cases cover first-acquisition levels and rebuilds, 12-dart bounds and repeated random types, barrier recovery, new tiers/one-off stock, split/reflected shots, delayed piercing echoes, XP relic accounting, real virus damage/lifetime and bounded shield recovery.

Browser regression coverage includes all six below-description gradients, unchanged rarity presentation, pointer stability, tooltip transfer/exit, five individual codex previews, and 320/390/1280 viewport bounds. Browser/long synthetic results are recorded separately in the PR once complete. Local Chromium remains unavailable because the environment disallows its singleton socket.

Synthetic engine stress completed 1800 combat seconds with 200 enemies, three bosses, all nine evolutions, three primary/parade frames and 12 darts. Maximum queue, visuals and projectile counts are recorded in qa/phantom-neon-engine-stress.json. This does not represent device FPS or a full survival/balance result.
