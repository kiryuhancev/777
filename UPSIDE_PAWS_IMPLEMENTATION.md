# UPSIDE PAWS

New isolated game `upside_paws`. Written requirements are preserved in `upside-paws/requirements/`; `00_READ_FIRST/MASTER_IMPLEMENTATION_SPEC.txt` governs mechanics, the concept PNG governs the visual direction. No existing game was overwritten.

## Rules configured where the archive permits configuration

- Two independent 4×4 grids, one combined wager. Normal left / Upside right on desktop, stacked with a horizontal rift below600px. Both grids stay mounted.
- Project-compatible left-to-right Ways per world: three/four consecutive reels, row-independent, product of matching counts. Scatter never substitutes; Portal Wild substitutes. All-Portal ways have one highest-paying owner.
- Echo: eligible primary winning pet positions may copy their paired family to the same coordinate in the other world. Base15%, bonus50%, Full Breach100% per eligible pet position. Scatter destinations are protected. Events depend only on immutable primary grids.
- Portal: if the opposite coordinate has a paying family, copy that family into the Portal's own world skin. If the counterpart is special, the Portal remains a substituting Wild. All copies are decided before animation.
- Apply all planned transformations, then **one** secondary evaluation per world. Final eligible wins replace the primary presentation result; primary wins are not paid again.
- Resonance intersects final winning coordinates.0/1/2/3/4+ shared coordinates multiply the combined eligible win once by1/2/3/5/10.
- Scatter count spans both grids.3/4/5/6+ award10/12/15/20 Free Spins. No bonus retriggers were specified or added.
- Portal probability per cell: base1.2%, bonus4.5%, Full Breach9%. Scatter1.1%; ordinary symbols retain the configured weighted distribution after special selection.
- Breach Meter: Echo+8, Portal+10, any Resonance+12, capped100. At100 queue Full Breach for the **next** eligible Free Spin. Consuming it resets the meter before new contributions; another queued Full Breach requires actual new qualifying events.
- New-game paytable/weights are in `upside-paws/config.js`, also independently implemented in the SQL evaluator. Payout scale2.58, max combined win10,000×. The archive did not prescribe a numeric paytable or target RTP. Initial configuration has an empirical RTP estimate95.8149% over1,000,000 paid rounds,95% interval95.2194–96.4104%. This is not a certified theoretical RTP. No existing game's math changed.
- Dimension Breach buy17× current stake. One debit, exactly3 visible Scatter, presentation-only trigger payout0 and no extra wager, input-gated intro. A distinct price from older games follows this new game's configured bonus expectation.

## Files

- `upside-paws/config.js`: versioned rules, weights, paytable, probabilities, meter, pacing.
- `upside-paws/model.js`: pure seeded engine, independently evaluated grids, plans, validation, safe progress.
- `upside-paws/game.js`: animation/controller, playback only; no random result selection during animation.
- `upside-paws/screen.html`, `presentation.css`: fixed dual-grid geometry, paired skins, contained popups, responsive layout.
- `upside-paws/assets.js`: centralized URLs.
- `assets/upside-paws/symbols.png`: original generated2×6 atlas. First five columns dog/cat/rabbit/bird/hamster, Normal top / Upside bottom; final column Portal / Scatter. Uniform SVG viewports isolate each362×362 tile; the original2172×724 image remains unchanged.
- `assets/upside-paws/background.png`: independently generated environment, no baked-in interface. The archive concept is preserved only as a reference.
- `supabase_upside_paws.txt`: complete additive migration in one TXT file.
- `tools/upside-paws-*.py`, `tools/upside-paws-*.cjs`: model, database, browser, recovery and simulation checks.

## Wallet and persistence

Existing canonical VAULT balance, identity buckets, bounded outbox and bonus escrow are reused. No second wallet and no credentials added.

1. Generate and validate the full seeded session plan before showing motion.
2. `VaultUpsidePawsBridge.commit()` atomically saves the plan, queues `upside_paws`, and debits the combined spin or purchase cost once.
3. After base presentation, `finishBase()` queues `upside_paws_base` and credits only the base result once.
4. Each Free Spin saves stable `upside_paws_progress`: intro/base flags, next spin, total bonus win, meter and Full Breach queue. No per-Free-Spin wallet credit.
5. Bonus Complete confirmation uses the existing `bonus_settle` escrow event. SQL validates terminal progress and credits the held bonus once. Duplicate identities are idempotent.
6. Reload replays the same uncompleted deterministic presentation step. It never regenerates its result. Completed checkpoints skip paid actions. SQL JSONB key ordering is handled by structural validation.

Owner cache gains `recovery.upsidePawsRound`, `recovery.upsidePawsProgress`, `recovery.bonusSessions.upside_paws`, preferences `bets.upside_paws` and `bets.upsidePawsSpeed` inside existing `vault:v1:user:<id>` buckets. Schema support cache: `vault:v1:upside-paws-schema`. No passwords stored by new code.

The SQL validates payout arithmetic, transformations, primary/final eligibility, Resonance, bonus entitlement, progression, meter, costs, account access and owner identity. As with the current client-driven architecture, this does not claim to make RNG server-authoritative or make a browser-provided seed trustworthy.

## Setup and build

1. Existing baseline VAULT/bonus schema must already be installed.
2. If BIG TOP setup has not yet been installed, run all of `supabase_big_top.txt` first.
3. Run **all of `supabase_upside_paws.txt`**, from `begin` to `commit`, in the existing project's Supabase SQL Editor. It creates no new project and resets no balances.
4. Verify: `select public.upside_paws_capabilities();` returns `{"version":1}`.
5. Build: `python tools/embed-vault.py` then `python tools/build-site.py`; syntax: `node --check /tmp/digital-derby-release.js`.
6. Publish the complete `_site/` only when authorized; its index references hashed assets. Source `index.html` remains standalone.

No production SQL was executed and no publication was performed during implementation.
