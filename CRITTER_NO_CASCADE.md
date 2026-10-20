> Release update2026-10-20: subsequent calibration and deployment instructions are in [RELEASE_NOTES.md](RELEASE_NOTES.md). The original implementation/test notes below are historical; use VAULT_RELEASE_SETUP.txt for the current database migration.

# Critter Chaos v4 — single-result gameplay

Status: review branch `feature/critter-single-spin-v4`; **not deployed**. Gameplay/recovery implementation is complete; RTP preservation is **not** complete. No production database changes were made.

## Rules

- Base: one5×5 grid, one orthogonal5+ cluster evaluation, ordinary x1 substitution Wild. No movement, refill, tumble or repeat evaluation.
- 3 Scatter →10 Free Spins; 4+ →SUPER20. Existing assets and theme retained.
- Bonus Wilds have stable `{id,cell,multiplier}` identities. Newly landed Wilds startx1. Persistent Wilds move every Free Spin **before** its one evaluation; no repeat win check after the result.
- A winning cluster uses the **sum** of its Wild multipliers (or1 without Wild). The current values pay first; each participating Wild doubles once for the next spin, even if used in several cluster types. Personal multipliers survive throughout the bonus.
- Movements, new Wilds, final field, wins and multiplier updates are immutable seeded plan fields. The renderer uses no RNG.
- Sequential planning chooses a currently free destination, reserving new landed Wilds. On a saturated25-Wild field, identities rotate simultaneously through occupied positions: all persistent identities still move, final positions stay unique. This avoids the impossible requirement of finding an empty cell on a full field. If one old Wild plus24 new Wilds saturates the grid, one new arrival swaps identity positions with it, recording its original `landedCell`.
- Existing raw paytable, symbol weights, PRNG, Wild/Scatter probabilities, `payScale` and10,000× cap preserved. **This does not preserve RTP when rules change.**

## HUD, art and purchases

Universal HUD source/layout and all other games are byte-identical to7611de9. Proportional SVG`xMidYMid meet`, images`object-fit:contain`,98% cell box, thin borders, symbol glow/pulse and readable multiplier badges retained. Win amount/multiplier count up; existing shared BIG/MEGA/EPIC presentation reused, followed by BONUS COMPLETE/TOTAL WIN/TOTAL X. Persistent state clears at completion.

The existing common BONUS entry opens the Critter shop:

| Mode | Full price | Effect |
|---|---:|---|
| Chance Boost |3× bet per paid spin | Scatter draw probability1.6%→2.4% (`features.scatterMultiplier:1.5`) |
| BONUS BUY |50× bet once |10 Free Spins, no artificial base Scatter |
| SUPER BUY |500× bet once |20 Free Spins |

Boost toggle is free, independent of other slots, indicated as SCATTER BOOST ACTIVE; prices follow the current bet immediately. Boost and purchase costs do not stack. These **legacy prices require recalibration** under the new rules before release.

## Recovery and money

The existing whole-cycle financial protocol is retained: one UUID, one stake, one complete deterministic outcome and one atomic wallet/statistics settlement. No per-animation or per-Free-Spin financial request is added. The complete result is credited to the canonical wallet once, as in the previous game; presentation reveals the result progressively without crediting it again.

Local owner-bound `vault:v1:user:<userId>` now contains `data.recovery.critterProgress` alongside the immutable`critterRound`. No new general storage namespace, password or secret key.

The validated progress checkpoint contains only:

- round ID and version;
- `baseDone`, next Free Spin index, remaining Free Spins;
- stable Wild positions and personal multipliers;
- revealed bonus total and completion flag.

The snapshot is derived from and checked against the immutable plan, saved synchronously at stable spin boundaries. No frame, animation, timer or DOM state is stored. Reload during a spin restarts that exact precomputed visual step from its last stable boundary; it never rerolls or calls commit/settlement again. Completed reload does not replay the bonus. Switching to the lobby pauses and later resumes the same feature. Signout clears in-memory private data; buckets remain owner-scoped.

Progress cursors currently persist locally in that browser profile. Remote wallet recovery stores the complete settled round. A new device with no local cursor shows the terminal result instead of replaying already-paid Free Spins. This does not duplicate credit. Cross-device *mid-feature presentation* synchronization is a separate step.

Legacy v1/v2/v3 round validation uses frozen models/configs, so existing queued financial events retain their original results. Invalid/missing v4 progress safely falls back to terminal result, never inventing a new bonus or refund.

## RTP — unresolved release blocker

Offline real-model simulation, seed20261024;200,000 complete paid cycles per base mode and10,000 complete purchased bonuses per purchase mode:

| Mode | Estimated return / full paid price | Approximate95% interval |
|---|---:|---:|
| Normal |17.78% |8.18–27.38% |
| Scatter Boost |25.31% |17.91–32.72% |
| BONUS BUY50× |0.323% |0.298–0.348% |
| SUPER BUY500× |55.20% |51.59–58.82% |

These are Monte Carlo estimates with high variance, **not exact/certified theoretical RTP**. Natural bonus frequency in this sample is0.743% (~1/135), with SUPER0.070%. Boost frequency2.218% (~1/45), SUPER0.296%. No result is targeted or adjusted after RNG.

Removing12-step cascades while keeping the tiny prior payScale heavily reduces regular/normal-bonus returns; persistent multipliers make SUPER much stronger. Thus “new rules + exactly the old paytable/coefficients/weights + unchanged RTP” cannot honestly be confirmed. No payout retuning was performed without resolving the requested priority. The build is kept off production pending a decision on separate calibration toward the previously requested~96%.

Raw report:`reports/critter-v4-rtp.json`; reproduce:`node tools/critter-v4-simulate.cjs 200000 10000`.

## Database/release preparation

Prepared complete repeat-safe`supabase_critter_v4.txt` (identical`.sql` and canonical`supabase_critter.txt`). Run only when this version is ready to release; do not run a selected fragment. Project SQL Editor:
https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new

After running:

```sql
select public.critter_capabilities();
```

Expected`version:2, featuresVersion:3, gameplayVersion:4, roundVersions:[1,2,3,4]`. Old capability fields intentionally remain for existing published clients. New frontend checks`gameplayVersion:4`; unavailable schema cannot charge a stake. The script adds pure v4 structural/evaluation validation while keeping the existing atomic wallet lock, duplicate handling, revision, access restrictions, stats, XP, grants and RLS. It does **not** make client RNG server-authoritative.

## Verification

- `node tools/critter-v4-tests.cjs`:5000 seeded base rounds, natural bonus and400 purchases, once-only evaluation, standard base Wild, personal persistence/summing/doubling, unique movement/saturated fields, stable recovery, tamper rejection, unchanged raw constants; legacy1/2/3 validation.
- `python tools/critter-v4-sql-tests.py`: isolated PostgreSQL only; repeat-safe migration, all modes/legacy versions, exact wallet, duplicate idempotency, one stats update, own-user RLS, admin block, tampered costs/moves/multipliers/cascade rejection.
- `python tools/critter-v4-browser-check.py`: actual vendored Supabase SDK with owned HTTP fixtures, real movement and proportional transform, mid-hop F5 resumes the exact plan, full normal/SUPER completion, no duplicate settlement, shop/boost/preferences, mobile320–1440, navigation/signout, no console/page errors.
- `python tools/critter-v4-isolation-check.py`:193 protected files, other games/HUD unchanged, shared money/auth unchanged, exact legacy freeze and SQL financial tail.
- Existing auth15-case suite, boot guard, Universal HUD and frozen legacy math suites pass. Syntax checked on rebuilt standalone HTML.

The live Supabase and physical iPhone were not tested. Browser tests use Chromium viewport emulation and owned endpoints; SQL tests use the isolated local database.
