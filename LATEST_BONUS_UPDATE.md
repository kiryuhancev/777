# VAULT latest bonus / Critter update

Local feature branch `feature/bonus-session-and-critter-v6`. Not published. Production database has not been changed by these tools.

## Scope and source

Requirements are preserved in `docs/latest-bonus-update/VAULT_Latest_Bonus_and_Critter_Update_Codex_Prompt.txt`. Later user instructions override the earlier cluster rules: Critter now uses left-to-right Ways and may recalibrate payouts around96%. **Swamp Fishing Scatter artwork and all Swamp symbol assets remain unchanged**, as explicitly requested October21.

## Critter v6

- 5×5, all five rows participate. Identical ordinary symbols/Wilds must occur on consecutive reels starting at reel1, minimum3. Pay the longest consecutive3/4/5-reel match for each symbol, without cascades.
- Ways are the product of matching counts per reel. For each bonus way, add its selected Wilds' personal multipliers; a way without Wilds has factor1. Sum these weighted ways, multiply by the mode's published3/4/5-reel pay coefficient and total stake. Never multiply Wild multipliers together or apply every Wild to every unrelated way.
- All-Wild ways are removed from regular-symbol ways and paid once as Bulldog. Winning positions include only cells that belong to a paid way.
- Base Wilds remain standard x1. Bonus Wilds retain IDs, positions and personal multipliers. Only Wilds in paid ways double after the current payout, for subsequent spins. The renderer reads a precomputed movement/result plan.
- Original PRNG algorithm, raw ordinary symbol weights, Scatter/Wild draw probabilities and movement random draws are retained. Deterministic postprocessing redistributes duplicate Scatters into empty columns. More than5 are reduced to5; the3/4+ normal/super trigger class is unchanged. This intentionally changes spatial distribution and the new Ways evaluation changes the payout distribution.
- Normal bonus10FS, Super20FS. Bonus buys50×/500×; Scatter Boost probability×1.5, spin price2.675367×.
- Cap remains10,000× per paid cycle. Configurable personal Wild multiplier ceiling2^40; x64 is not a cap.
- Supplied raccoon, WILD label, Scatter and x2–x64 plaques are independent layers with uniform `object-fit:contain`. Black original mattes use local screen blending; original image bytes are preserved. Larger badges use matching gold/red dynamic typography.
- Continuing spins gather Wilds into a680ms vortex (280ms quick), then dispatch from the center during the next fill. No animation makes random choices. Stable progress is saved before vortex.
- Frozen models1–5 are kept for saved rounds/outbox/recovery. New v6 records require the v6 server validator.

## Shared bonus settlement

`VaultBonusSession` in `vault/runtime.js` owns per-game business checkpoints in `data.recovery.bonusSessions`. Existing wallet remains canonical; no second balance is introduced.

- Critter holds its precomputed bonus portion; only the base portion is credited normally. Its earned display total follows stable FS progress.
- Derby and Swamp hold accepted free-spin payouts instead of crediting the wallet each spin.
- Heist and MAGNET hold the terminal feature payout until the summary is acknowledged.
- Existing round services still validate/log outcomes and statistics. A bonus event envelope routes the unchanged validated checkpoint through `apply_bonus_checkpoint`. Its old RPC settlement and transfer into the server ledger occur in one PostgreSQL transaction, so intermediate credit is not externally visible.
- `settle_bonus_session` credits the **server ledger amount**, not an amount supplied by the browser. Wallet/session row locks and unique event keys prevent duplicate credit. The final event increments wallet revision once and does not add another game/stats record.
- Local optimistic state and the owner-bound outbox save before continuing; retries/recovery rebase deltas and held amounts, never choose the larger balance. Previously paid legacy features finish with their old semantics.
- Terminal summaries restore after reload, including Critter on another device without a local animation cursor. No animation/timeout/physics frame is serialized.
- New paid actions require the bonus capability migration. Authentication startup does not await this capability and cannot hang on it.

## Shared local popups

`slot-hud/bonus-popup.js` / `.css`: one component inside each reel field,72% width (75% mobile), only local dim, themed card, guarded tap/SPACE. Repeat keys cannot advance multiple gates. Removing a host overlay cancels its presentation promise safely. Universal HUD controls/order remain intact.

## Database update

Run **all** of `VAULT_LATEST_UPDATE_SETUP.txt` in the Supabase SQL Editor. It includes the full Critter v6 migration and bonus ledger migration, with transaction boundaries. Existing users/wallets are not reset. Rerunning is supported.

After success:

```sql
select public.critter_capabilities(), public.vault_bonus_capabilities(), public.swamp_slot_capabilities();
```

Expected Critter `mathVersion:6`, `gameplayVersion:6`, bonus capability `version:1`; Swamp remains mathVersion4 / bonusVersion2. Reload the frontend after both frontend deployment and database migration. No URL/key change is needed.

RLS: users may read their own bonus sessions; no direct client writes to sessions/events or wallets. Functions use `auth.uid()`. No private/service key is added.

## Storage

Existing `vault:v1:user:<uuid>` remains the owner bucket. New whitelisted field: `data.recovery.bonusSessions`, with version/id/game/status/heldWin/totalWin only. New capability cache: `vault:v1:bonus-schema` (project URL+version, no user funds). Critter capability cache version becomes6. Existing namespace, pending queue limit and auth SDK storage remain.

## Math evidence

Fit:50,000 normal +50,000 super features,500,000 base+boost fields. Independent seed21102026 holdout:30,000 normal +30,000 super,250,000 base+250,000 boost fields. Report: `reports/critter-ways-rtp.json`.

Estimated RTP: base96.02%; Boost96.27%; normal buy95.91% (95% interval93.68–98.14%); super buy96.60% (94.73–98.48%). These are Monte Carlo estimates around the96% target, not a claim of exact RTP. Base/Boost use stratified conditional-bonus estimates with exact Scatter trigger probabilities; rare overlap with the whole-round cap introduces a small approximation, explicitly recorded in the report.

## Validation and preview

- All18 CI math/rules suites pass, including frozen Critter regressions and new Ways cases.
- `tools/critter-v6-sql-tests.py`: actual isolated PostgreSQL, all modes+versions1–5,1,000 extra model plans, changed payouts/moves/costs/cascades rejected, duplicate round/stat protection and RLS.
- `tools/bonus-session-sql-tests.py`: actual isolated PostgreSQL ledger, no early credit and exactly one final credit for Critter/Heist/MAGNET.
- `tools/bonus-update-browser-check.py`: Chromium, actual Supabase SDK, owned auth fixture, real isolated PostgreSQL RPCs; no production user data touched. Results in `reports/bonus-update-browser.json`. The browser suite covers all five slots plus an offline mid-vortex reload with an independently advanced server wallet revision.
- Build: `python tools/embed-vault.py`, `python tools/build-site.py`, `node --check /tmp/digital-derby-release.js`. Upload the complete `_site` directory for Pages, not only its HTML. Source `index.html` remains standalone.
- Preview PNGs are generated under `/workspace/output/` by the browser check.

Other games' math/config/symbol assets and the Universal HUD module/style are unchanged. Shared runtime and bonus presentation intentionally change for the five slots.
