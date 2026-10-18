# MINES · VAULT Extraction Grid

MINES is an isolated seventh game (`mines`) registered in **ARCADE**. The featured Digital Derby card, existing cards/layout, auth UI and all six existing game implementations/art are unchanged. The shared canonical balance, account namespaces, session and bounded outbox remain in place. There is no second wallet or new dependency.

The original standalone frontend is preserved at `/workspace/output/VAULT_before_mines.html` (Git baseline `d850497`). New standalone frontend: `/workspace/output/VAULT_with_MINES.html`.

## Files and integration

- `mines/config.js`: explicit math config; debug off by default.
- `mines/model.js`: pure seeded placement, probability, state machine, checkpoint validation and simulation.
- `mines/game.js`: isolated controls/board, accessible buttons, short procedural audio, existing round/wallet services.
- `mines/screen.html`, `mines/presentation.css`: burgundy, gunmetal and ivory VAULT screen; emerald safe cores and amber/red unstable cores. Board uses DOM/CSS; no frame-by-frame asset allocation.
- `assets/mines/lobby-card.svg`: separate 16:9 mechanical grid illustration, without baked title.
- `tools/embed-vault.py`: embeds the new module/styles/card into the standalone `index.html`.
- `supabase_mines.txt` / `.sql`: identical incremental migration, preserving all user rows and balances.
- `supabase_schema.sql`: full installation also includes MINES.

The existing `vault/runtime.js` adapter is extended only for the new registry entry, selected bet/mine count, stable interactive checkpoint and checkpoint outbox event. The auth handlers and wallet debit/credit model are not replaced. One shared sync promise fix prevents an empty flush during an active round from permanently blocking later events.

## Config

| Parameter | Default |
|---|---:|
| `version` | 1 |
| `rows`, `cols` | 5, 5 |
| `defaultMines` | 3 |
| `minMines`, `maxMines` | 1, 24 |
| `houseEdge` | 0.03 |
| `maxWinX` | 50,000 |
| `debug` / `MINES_DEBUG` | false |

Bet choices reuse global `BETS`; default index 2. MAX selects the largest existing denomination, without inventing a new bet range. Selected bet and mine count persist independently of a locked active-round stake. Runtime debug shows seed, positions, probability and fair/adjusted multiplier only when explicitly enabled in source.

Changing house edge, board dimensions or cap requires updating the matching SQL validator and tests, then deploying both together. These are mathematical contract parameters, not cosmetic settings.

## Formula

For `m` mines and `k` safe picks on a 25-cell board:

```
P(survive k) = product(i = 0..k−1, (25 − m − i) / (25 − i))
fairMultiplier = 1 / P(survive k)
currentMultiplier = min(maxWinX, (1 − houseEdge) / P(survive k))
payout = round(bet × currentMultiplier, 6)
```

At zero picks the display is 1.00×, but CASH OUT is disabled. The 3% house edge is applied once to the complete survival probability, not compounded on each pick. Monetary settlement follows existing VAULT six-decimal precision. Displayed multiplier is rounded to two decimals; the actual payout uses full multiplier precision.

| Mines | 1 safe | 2 safe | 3 safe | 5 safe |
|---:|---:|---:|---:|---:|
| 1 | 1.0104× | 1.0543× | 1.1023× | 1.2125× |
| 3 | 1.1023× | 1.2597× | 1.4487× | 1.9570× |
| 5 | 1.2125× | 1.5316× | 1.9570× | 3.3241× |
| 10 | 1.6167× | 2.7714× | 4.9033× | 17.1615× |
| 20 | 4.8500× | 29.1000× | 223.1000× | 50,000.0000×* |

`*` The cap triggers automatic cashout as soon as it is reached, before further picks. All safe cells revealed also auto-cash out. The multiplier grows strictly until the cap; it cannot exceed the cap. For every attainable uncapped fixed stopping target, ideal return is `P × 0.97/P = 97%` before monetary rounding. Capped strategies can return less; 97% is not a promise for every capped target.

## Round and recovery flow

1. Generate a crypto-random 32-bit seed and one seeded Fisher–Yates permutation at START. Freeze exactly `mineCount` positions. No RNG runs on a click or reload.
2. Existing `VaultRoundService.begin` creates one UUID, debits once and writes the initial Mines checkpoint in the same local snapshot/outbox begin event.
3. A safe click updates only the opened-cell prefix and mathematically derived multiplier. Save locally immediately, queue an owned `save_mines_checkpoint` event, and continue UI without awaiting network.
4. Mine hit becomes BUST with payout zero. CASH OUT is allowed after a safe pick; payout and terminal checkpoint commit in one local stable write through `settleWithPayout`. Further clicks/settles are ignored.
5. Existing `record_game_round` atomically settles server wallet/round/stats/XP once by UUID. MINES validates immutable board, opened prefix, status and payout. It only updates its `minesRound` recovery namespace; it cannot overwrite another game's bonus.
6. F5 restores the same seed, mine positions, opened prefix and status. A PLAYING Mines round is resumable, unlike the animation/physics games that safely cancel interrupted work. No animation frame, sound, timeout or DOM state is persisted.
7. A second browser loads the same active checkpoint from the existing wallet recovery. Concurrent divergent pick orders trigger automatic recovery to the acknowledged remote checkpoint. A competing settled UUID wins once; stale local payout is discarded. No `max(localBalance, remoteBalance)` merge exists.

Persistence remains under existing `vault:v1:user:<uid>` / `vault:v1:guest` versioned buckets:

```
bets.mines
bets.minesCount
recovery.minesRound: {
  version, roundId, bet, mineCount, seed, minePositions,
  opened, status, multiplier, payout
}
recovery.openRounds.mines
queue: begin / mines(checkpoint) / settle / existing settings
```

One new capability cache key: `vault:v1:mines-schema` (schema version and Supabase project only). The existing queue limit remains; no unbounded log is introduced. Round history metadata includes bet, mine count, safe picks, multiplier, cashout/bust, payout and the fixed business checkpoint. There is no separate user-facing history screen in this version.

This follows the project's current **client-authoritative demo** architecture: mine positions can be inspected through browser developer tools/localStorage. Hidden visual cells expose no mine-correlated DOM class, label or animation before reveal. This is not server-secret or cryptographically provable fairness; a future server-authoritative implementation would generate/keep the board on the backend. No service keys are added to the client.

## Supabase activation

For an existing VAULT installation (including Swamp):

1. Open https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new .
2. Open `supabase_mines.txt`, copy the **entire file** into a new query, from the opening `begin;` through final `commit;`.
3. Select all query text and Run. Expected: success; no rows returned.
4. Refresh VAULT and open MINES. The capability check enables START automatically.

The script is repeat-safe; it neither resets accounts nor changes starting balances/auth/RLS policies. It extends game ID constraints and existing shared RPC registries, adds owned checkpoint validation/RPC, and keeps anon access revoked. Do not run an older table-only/Swamp-only registry migration afterward, as older files do not include MINES. A missing migration disables only MINES before any wager is charged. URL/public key are unchanged.

## Verification and reproduction

```
python3 tools/embed-vault.py
python3 tools/build-site.py
node --check /tmp/digital-derby-release.js
node tools/mines-math-tests.cjs
node tools/mines-rtp.cjs 1000000
python3 tools/mines-isolation-check.py
python3 tools/mines-browser-check.py
python3 tools/mines-sql-tests.py
```

Browser checks run real Chromium and the embedded Supabase SDK with an HTTP contract fixture, not live Supabase. They cover mobile widths 320/390/768/1024/1440, 44px minimum cells, no horizontal overflow/duplicate IDs, auth/card transitions, settings, once-only stake/payout/stats, exact F5 recovery, offline/retry, second browser and conflicting branches. SQL checks use isolated PostgreSQL 17 for migration, prefix immutability, payout validation, idempotency and RLS.

Existing auth/session/offline tests, six-game isolation, Swamp browser/math, table rules, Digital Derby math and Breakers physics/round tests also run. Live Supabase activation remains the user's SQL Editor step; local tests do not claim that migration was applied remotely.

Simulation output is in `reports/mines-rtp.json`. `simulateMinesStrategy({mineCount,safePicks,rounds,seed})` is also available in the browser console. It simulates actual generated boards and a fixed ordered reveal strategy, stops automatically at a cap before the requested pick target, and reports sampled RTP/bust rate, analytic RTP/bust rate, cashout multiplier and effective stopping pick. Rare high-risk outcomes need much larger samples than common strategies.

## Recorded simulation

Each strategy used 1,000,000 independent paid boards. A requested target beyond the cap stops at the first cap-reaching safe pick, matching production.

| Mines | Requested / effective picks | Sample RTP | Analytic RTP | Bust rate |
|---:|---:|---:|---:|---:|
| 1 | 1 / 1 | 97.0197% | 97.0000% | 3.9805% |
| 3 | 3 / 3 | 96.8484% | 97.0000% | 33.1481% |
| 5 | 5 / 5 | 96.9274% | 97.0000% | 70.8406% |
| 10 | 3 / 3 | 96.9078% | 97.0000% | 80.2362% |
| 20 | 2 / 2 | 96.6411% | 97.0000% | 96.6790% |
| 12 | 13 / 11 | 90.0000% | 87.4950% | 99.9982% |

The capped 12-mine strategy is a rare-tail example, not evidence that the uncapped 97% formula is wrong. Its 50,000× payout occurs only after eleven surviving picks. Sample results are estimates; the analytic value follows the actual stopping boundary.
