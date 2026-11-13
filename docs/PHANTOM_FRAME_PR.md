# Draft: PHANTOM FRAME and DARK elemental expansion

Adds a sixth normal-mode frame with a player-controlled ghost and independent silver blade attackers. Night Parade adds two non-elemental phantoms; the primary phantom owns elemental attacks. Includes dedicated progression, defense, XP support, six compatible evolutions and three compatible NOVA evolutions.

Adds shared DARK fear/virus weapons, bounded five-second hacked allies, DOG mascots, sixty directed A/B elemental recipes and a third fusion at Lv40. Updates archive/ending compatibility, rank-aware recipes, HUD, ship selection, four normal reward choices and PWA shell caching. CO-OP and audio assets are unchanged.

Validation: 138 Node tests passed; syntax and PWA shell/reference checks passed. Actual shipped combat logic was exercised through seeded VM simulations; a synthetic 30-minute all-evolution engine stress run completed with bounded secondary-hit queues and visual counts.

**Draft / do not merge:** PHANTOM full-run survival remains inadequate in measured AI samples. Real PC/mobile layout, touch, browser FPS, audio and offline regression have not been verified because Chromium cannot launch under the environment's socket restriction. See `docs/PHANTOM_FRAME_HANDOFF.md` and `docs/qa/` for exact measurements, candidate history, limitations and next steps.
