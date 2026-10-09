# Bird Siege: one launch, one physical result

One paid round follows `SLINGSHOT → FLIGHT → APPROACH → IMPACT → SETTLING → RESULT`, with `IDLE` before payment and `RESETTING` after the result. A miss can go directly to settling. Split adds physical projectiles to the same round, never another paid/free attempt.

`bird/config.js` contains provisional tuning. `bird/model.js` generates an immutable seeded plan and runs the existing rigid-body engine without DOM. `bird/game.js` handles pointer/keyboard input, camera, effects and the existing VAULT service calls. `bird/presentation.css` affects only Bird Siege. Run `python3 tools/embed-vault.py` after changing these sources; the deployed `index.html` remains standalone.

## Probability and physical configuration

- `routes`: DRY/NORMAL/HOT/RARE weights and corridor placement probability. These names are internal and never displayed to players.
- `bonus`: visual spawn probability, candidate count, corridor/near-miss/alternate offsets and rare ×3 probability. Collected multipliers multiply naturally; strong chains are controlled by spawn/reachability probabilities.
- `archetypes`, `sizes`, `pigSpawnChance`, `pigs`, `materialWeights`, `fortressMaterialWeights`: independent scene-generation distributions. Larger scenes have more objects, not a predefined reward.
- `sling`, `flight`: launch power, nominal corridor, distance, gravity, approach distance, inertial steering and `maxFlightCorrection=.12`. World positions remain continuous during camera changes; gates never follow the player's actual shot.
- `materials`, `damage`: density/mass, HP, thresholds, restitution/friction, impulse damage and bomb pressure.
- `scoring`: actual pig/block destruction, partial damage, chain reactions and collected bonus points. Flight bonus points count only when something was destroyed. The score maps to a payout once, after physics sleeps or a ten-second settle timeout. No target payout or guaranteed profitable bonus exists.
- `round`: body/block/particle limits and a 1.5-second result pause. `debug`: bounds, velocities, HP/material, seed, nominal corridor, placement markers and sleep status.

## Scene library

Archetypes: **TOWER, BRIDGE, FORTRESS, DOUBLE_TOWER, TALL_THIN, PYRAMID, CANOPY, MULTI_FLOOR, SPLIT_STRUCTURE, WIDE_LOW**. Size classes create approximately 9, 15, 24 or 36 load-bearing blocks, with occasional bridge/canopy beams; all remain within 45 blocks. Support spacing, width, materials and pig positions vary by seed.

Materials: **Glass** (25 HP, mass factor .6), **Wood** (60 HP, factor 1), **Stone** (130 HP, factor 2.2). Weak contacts below each material's threshold cause no damage. Rotated rigid bodies, block-to-block impacts, falling pigs, angular impulses, ground friction, adaptive anti-tunneling substeps and contact-island sleep are retained from the existing engine. Broken bodies produce bounded decorative particles rather than an expanding set of rigid fragments.

Bonuses: **×2, ×3, Heavy, Mega, Bomb, Split, Pierce, Ricochet, Pig Hunter**. Multipliers affect the final destruction score; the others alter mass, radius, explosion impulses, projectile count, first-contact momentum or pig damage. Golden Pig is not implemented; gold/royal pigs still appear through the configured pig distribution.

## Wallet, reload and analytics

`VaultRoundService.begin` creates the canonical UUID and debits once. `VaultWalletService.applyDelta` credits only the final payout, followed by one `VaultRoundService.finish`. No separate Bird balance or direct database request exists. Result metadata includes seed, round ID, bet, route, offered/collected bonuses, building archetype/size, pigs/blocks destroyed, score, multiplier and payout.

The existing VAULT recovery policy cancels any interrupted paid Bird round without refund or payout, including a paid slingshot awaiting release. A settled payout stays in the existing wallet/outbox. Only the Bird reset adapter changed in the persistence layer; physics frames and visual transitions are never saved.

Controls: drag/release with mouse, touch or pen; action button or Space for a standard launch; arrow keys/A/D or compact pointer buttons for bounded flight correction. Camera and three parallax layers animate independently of the immutable plan. The logical viewport is identical on mobile and desktop, so display size does not change game mathematics.

## Validation and simulation

```
python3 tools/embed-vault.py
python3 tools/build-site.py
node --check /tmp/digital-derby-release.js
node tools/bird-physics-tests.cjs
node tools/bird-round-tests.cjs
python3 tools/bird-v2-isolation-check.py
python3 tools/bird-v2-browser-check.py
```

`simulateBirdRound(seed, bet, {vx, vy, steer})` runs the actual rigid-body scene without rendering. Omit the input to use the nominal launch. `BIRD_MODEL.plan(seed, bet)` generates plans without simulating bodies, suitable for large probability audits. Browser tests use the real Supabase SDK with isolated API fixtures; they do not certify the live Supabase database. Reports are in `reports/bird-*`.

These values are an initial mathematical foundation, **not final RTP calibration**. Real physics, the player's launch and bonus contacts determine the result.

The pre-change HTML is preserved at `/workspace/output/VAULT_before_bird_v2.html`; the revised downloadable file is `/workspace/output/VAULT_Bird_Siege_v2.html`. Other games, lobby and auth presentation are byte-checked against commit `a042ab9`.
