# Swamp Fishing — deferred sequential bonus levels

Implemented after the shared BONUS/balance/Critter tile update (`SHARED_BONUS_UI.md`). Review branch only; no production deployment/database changes.

## Gameplay

- One bonus: any3+ Scatter →15 Free Spins, Level1 / collect×1. There is no new Super variant. Existing legacy bonus sessions retain their old rules through the frozen v1 model/config.
- Natural trigger finishes the paid spin and analog reel presentation, then opens a full-screen15-spin intro. It waits for Space or tap; no automatic Free Spin starts before input.
- One BONUS BUY offer, existing77× bet price. Shared YES/NO confirmation debits once, checkpoints the entitlement, then plays an explicitly purchased, non-paying presentation trigger with exactly3 Scatter through the existing analog reels. This board is not evaluated for another payout or bet. The intro waits for input just like a natural bonus.
- Each level has15 spins. Cumulative Collector thresholds4/8/12 qualify for Levels2/3/4, with collect multipliers×2/×3/×10. Reaching a threshold never changes the current level or adds spins in the middle of it.
- At the end of the current level, if qualified, the next15-spin entitlement is reserved exactly once in the settled checkpoint, with `phase:'level-up'` and `previousTier`. The UI still shows the previous active multiplier and0 current-level spins. Only confirmation activates/reveals the next level and starts its first Free Spin. This reservation makes F5 unable to grant the reward twice.
- Several thresholds can be prequalified, but levels still play sequentially in full. Counter never resets. At the end of Level4, or an unqualified level, the count-up BONUS COMPLETE waits for confirmation and returns to base.
- Max win cap remains50,000× including the triggering win. The cap ends the feature immediately. No repeated top-tier retriggers.

## Progress / state

Milestones at positions4/8/12 are separate anchor/reward badges with×2/×3/×10, not ordinary Fisherman portraits. Labels above the groups were removed. Ordinary icons and milestone lights accumulate sequentially; the visible Fishermen total continues beyond12. The separate COLLECT indicator always shows the active multiplier.

Canonical recovery names retain compatibility: `tier` (zero-based level), `remaining`, `collectors`, `totalWinX`, `spinsPlayed`, `featureId`, locked`bet`, plus version2/phase/previousTier/optional purchased triggerSeed. `getHudState().bonus` exposes derived `level`, `activeMultiplier`, `freeSpinsRemaining`, `fishermenCollected`, `nextThreshold`, `bonusTotal`, `active` and phase. Derived HUD aliases are not a second independent state.

Intro/Level Up/Complete are modal: SPIN/AUTO/BET/MAX/BONUS locked; Space/tap is swallowed so no underlying button fires. Repeated Space is ignored;180ms input guard avoids accidentally consuming a newly opened popup.

Existing owner-scoped recovery and begin/settle outbox persist the business checkpoint before animation. Reload discards frames and restores the stable feature state and pending popup. A bounded presentation acknowledgement in `vault:v1:user:<userId>:swamp-presentation` (one versioned record: feature/phase/spin token and timestamp) avoids redisplaying an already confirmed Complete on F5. This token never awards spins or money; all financial entitlement remains in the main recovery/remote wallet. Malformed token JSON is ignored.

## Database

Prepared complete, repeat-safe `supabase_swamp_levels.txt`, identical to`.sql`. It uses narrow, guarded hooks in the installed begin/record RPC functions, preserving their debit, credit, revision, UUID duplicate checks, admin restrictions, stats, XP, grants and RLS. Old1-state bonuses remain supported. New validation enforces one15-spin purchase and deferred transitions only when a level ends; current multiplier and fish collection must agree.

The migration refuses an unfamiliar existing SQL layout instead of replacing unrelated financial code. Run the WHOLE file in the project SQL Editor only when preparing release:
https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new

Then check:

```sql
select public.swamp_slot_capabilities();
```

Expected existing `version:2,purchaseVersion:1,boostVersion:1` plus **`bonusVersion:2`**. The new frontend checks that flag before allowing Swamp play. This script does not replace `supabase_critter_v4.txt` needed by the separate Critter update. Neither live script was run by the agent.

## Mathematics / release status

Generation/PRNG, symbol weights, line paytable/lineScale, fish values, collector probability, Scatter Boost and analog engine are unchanged;4,000 seeded generated boards match the frozen previous implementation exactly. The explicitly requested bonus rules **do change RTP**. No hidden calibration or payout targeting was added.

Real-model Monte Carlo, seed20261020:

| Mode | Cycles | Estimated RTP | Approximate95% interval |
|---|---:|---:|---:|
| Base, including earned bonus |200,000 |204.35% |179.90–228.81% |
| Scatter Boost |200,000 |211.86% |199.23–224.50% |
| BONUS BUY77× |20,000 |287.26% |282.03–292.49% |

About33.1 Free Spins per triggered feature in this sample. This is not exact/certified theoretical RTP. See`reports/swamp-levels-rtp.json`; reproduce with`node tools/swamp-levels-simulate.cjs 200000 20000`.

**Release blocker:** existing prices/weights with the new bonus are not balanced to the previous~96% target. No production publishing until a separate calibration decision. The prior Critter v4 RTP issue also remains open; this request changed its art/UI only.

## Tests

- `node tools/swamp-levels-tests.cjs`:15-spin trigger, all four sequential levels/60 spins, deferred multiplier timing, overflow, cap, checkpoints,100 purchased presentation boards, unchanged generation.
- `node tools/swamp-math-tests.cjs`: frozen legacy mathematics for previously started bonuses.
- `python tools/swamp-levels-sql-tests.py`: isolated PostgreSQL; repeat-safe migration; purchase+60 Free Spins with every begin/settle submitted twice; exact wallet/recovery,61 stats rounds, no duplicate credit or15-spin grant; premature transition rejected.
- `python tools/swamp-levels-browser-check.py`: real renderer/analog reels and vendored SDK with owned endpoints; natural intro, Space/tap, locks, complete four-level run, F5 at every pending gate, no repeat payout; purchased3Scatter/no second debit;320–1440px, no JS errors.
- `python tools/shared-bonus-check.py`: all shared shop/confirmation/boost flows, insufficient balance, double YES, full-tile Critter and read-only balance formatting.
- `python tools/swamp-levels-isolation-check.py`: other game assets/source/analog/HUD JS unchanged after the shared UI checkpoint; generic financial/auth code unchanged except Swamp capability gate, acknowledgement normalization in the Swamp outbox rebase and SQL entitlement hooks.
- Existing auth SDK15-case suite, Critter browser/F5, frozen Critter model and build syntax checks passed.

Physical mobile and live Supabase were not tested; browser results use Chromium viewport emulation and owned HTTP fixtures.
