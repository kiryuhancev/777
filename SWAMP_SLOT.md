> Current review update: [SWAMP_LEVELS.md](SWAMP_LEVELS.md). The rules below describe the previous bonus and remain relevant only to legacy sessions.

# VAULT swamp collect-slot

Working descriptor: **SWAMP FISHING**. This is not an approved final title. `swamp/config.js` exposes `GAME_LOGO_SRC: ''`; no invented logo/title is baked into artwork. A future local logo can use `GAME_LOGO_SRC: '__SWAMP_game_logo.webp__'` after placing the file in `assets/swamp/` and rebuilding.

## Source and isolation

Visual source: the supplied `Vault_Swamp_Fishing_Slot_Assets_for_Codex.zip`, unpacked without repainting. All original files remain in `assets/swamp/`. No Voodoo Fishin' material or external artwork was introduced. The scene reference is never used as an assembled game UI; a small material-only wood strip was extracted for the actual DOM reel frame.

The original frontend is preserved at `/workspace/output/VAULT_before_swamp.html`; the integrated standalone version is `/workspace/output/VAULT_with_Swamp_Fishing.html`. Git baseline: `1a5d5f3`. `tools/swamp-isolation-check.py` compares the entire original HTML, game scripts, assets, styles and auth/lobby design after excluding the new module/card/registry entry and the explicitly extended shared data adapter.

Source modules:

- `swamp/config.js`: weights, eight symbol pays, ten lines, money values, tiers, configurable maximum win.
- `swamp/model.js`: pure seeded generation, line evaluation, collection, retriggers, cap and business-checkpoint validation.
- `swamp/assets.js`: centralized runtime image map. `__SWAMP_<relative path>__` tokens are embedded as data URLs by `tools/embed-vault.py`.
- `swamp/game.js`: reel strips, anticipation, collect trails, automatic FS, AUTO (10/25/50/100/unlimited paid rounds), shared bet/settings controls and scoped procedural audio.
- `swamp/screen.html` / `swamp/presentation.css`: independent haunted-swamp scene inside the existing VAULT header.

## Actual asset paths

Original provided files:

```
assets/swamp/01_reference/slot_scene_reference.webp
assets/swamp/02_background/swamp_background.webp
assets/swamp/03_symbols/base_symbols_sheet.webp
assets/swamp/04_money_fish/money_fish_sheet.webp
assets/swamp/05_special/scatter.webp
assets/swamp/05_special/collector_wild_reference.webp
assets/swamp/05_special/rare_bonus_symbols.webp
assets/swamp/README_FOR_CODEX.txt
```

Prepared alpha WebP sprites in `assets/swamp/symbols/`:

```
fish_01.webp       bait_jar.webp      lantern.webp        bobber.webp
hook.webp          insect.webp        tackle_box.webp     spirit_lantern.webp
catfish.webp       rust_bobber.webp   worm_jar.webp        fish_03.webp
money_fish_1.webp  money_fish_2.webp   money_fish_3.webp    money_fish_4.webp
scatter.webp       collector.webp
```

`tools/extract-swamp-assets.py` crops the real 4×3 / 2×2 sheets, trims detached neighboring sheet fragments, keeps source alpha and prepares sprites up to 300px. The separate Scatter and Collector are compact copies of the supplied assets. The whole sheet is never drawn in one cell. Four extra regular sprites and the rare bonus sheet remain available for future expansion; the initial paytable uses eight regular objects.

Additional derived files:

- `assets/swamp/lobby_card.webp`: separate 960×540 dock background + one supplied strange fish; no baked title or slot screenshot.
- `assets/swamp/wood_frame_strip.webp`: 600×25 material crop from the reference beam, used as a frame texture rather than UI art.

Runtime preloads unique images once. There is no `new Image()` in an animation loop. Fog uses CSS layers; there are 14 fireflies; collect labels are capped at 32 visual particles even if more collections occur mathematically. Reduced-motion preferences are respected. Decorative lanterns hide on small screens; reels, cash values and controls remain visible.

## Explicit game rules

- Five reels × three rows, ten distinct fixed paylines. Line pays run left-to-right starting at reel 1; only the longest 3/4/5 match pays per line. Concurrent lines add together.
- Paytable values are multiples of the **total bet**, not a per-line stake. All eight paying symbols are supplied physical fishing objects; no A/K/Q/J.
- Base Scatter: 9% probability of one Scatter on each reel, at a random row; at most one per reel. Exactly 3/4/5 grant 10/15/20 FS. Scatters have no cash pay and do not appear during FS.
- Money Fish: 7.5% per non-Scatter base position, 15% after a non-Collector FS position. They have no independent cash payout.
- Money values / integer weights: `2:60000, 5:27000, 10:9000, 15:2500, 20:1000, 25:400, 50:99, 2000:1`. Thus 2000× is 1 in 100,000 Money Fish value selections, not 1 in 100,000 paid wins.
- Collector Wild: FS only, reels 2–4, 2.8% per eligible position. It substitutes paying regular symbols. Every Collector collects **all** current Money Fish; N Collectors collect their sum N times. Nothing is guaranteed: collectors may land without fish, or fish without collectors.
- Each landed Collector advances a cumulative meter, even without a cash collect. Every fourth Collector awards +10 FS. Four/eight/twelve Collectors advance x1 → x2 → x3 → x10. Retriggers continue every four at x10.
- The multiplier at the **start of the spin** applies to every collect on that spin. All threshold awards accumulate; the upgraded multiplier applies from the next FS. Line pays are not multiplied by the collect tier.
- No sticky symbols: a fresh outcome is independently generated for every spin. No forced wins, sessions targeting a balance or physics/presentation back-solving exist.
- The bonus uses the triggering bet. Default maximum win: **50,000× per paid spin plus its entire associated bonus**, including any trigger-spin line pay. It is configurable in `SWAMP_CONFIG.maxWinX`. Reaching it terminates FS; it does not rewrite or redraw symbols.
- Free Spins start automatically. Leaving for the lobby pauses further spins; entering the game resumes. Backgrounding the document pauses future spins. AUTO counts paid spins, not FS. It can be stopped during an auto-triggered feature without cancelling earned FS.

## Math / simulation

```
node tools/swamp-math-tests.cjs
node tools/swamp-rtp.cjs 5000000 953174
```

The simulation executes independent paid rounds and **all** their free spins/retriggers with the exact production model, including the cap. It never selects a target payout and regenerates scenes to meet it. Config, seed, full output and 10,000-round batch returns are in `reports/swamp-rtp.json`.

Measured independent validation run:

| Metric | Observed |
|---|---:|
| Paid spins | 5,000,000 |
| Total return / paid stake | 96.3046% |
| Approximate 95% interval | 94.5826%–98.0266% |
| Base hit rate | 17.6250% |
| Bonus triggers | 31,774 (~1 per 157.4 paid spins) |
| FS played, including retriggers | 478,995 |
| Mean FS per bonus | 15.0751 |
| Zero-win FS | 67.0235% |
| FS at x1 / x2 / x3 / x10 | 304646 / 90036 / 42120 / 42193 |
| 2000× Money Fish seen during FS | 9 |
| Largest paid-round total | 5534.031× |
| Maximum-win truncations | 0 |

`targetRtp: .96` is a design/calibration reference, not a proven exact RTP. The measured return is a sample estimate. The approximate interval is based on independent full paid-round returns; the very rare upper tail remains sparsely sampled. Component line/collect return fields are uncapped attributions; `rtp` is always the actual capped return (this run encountered zero caps).

## Shared wallet and safe restore

No second balance is created. `state.balance` / `VaultWalletService` stay canonical. Every paid spin and FS uses the existing UUID-based `VaultRoundService` and stats outbox; FS have `bet=0` and `stake=triggeringBet`. Round metadata includes math version, RNG seed, feature ID, free-spin index, fish values, Collector count, applied multiplier, retriggers and actual paid amount.

Flow:

1. Consume stake or one FS through `begin`; save its business checkpoint before any await.
2. Generate the real outcome synchronously from RNG.
3. Atomically save local payout, remaining FS, collector meter/tier and final round status through `settleWithPayout`.
4. Animate the already committed outcome. The displayed wallet/last-win/meter hold at their pre-reveal values until the reels/collect have revealed the result; canonical funds are already saved. This display hold is transient, owner-bound and never serialized.
5. Queue existing `begin_game_round` / `record_game_round` RPCs, without awaiting APIs during animations.

F5 clears animations/DOM effects, resumes only the next entitled FS and never replays the last payout. If an interrupted `started` FS exists, its consumed counter stays consumed and it is cancelled without refund. The stable whitelist is `version, featureId, bet, remaining, collectors, tier, totalWinX, spinsPlayed`; no grid, animation frame, timer or audio node is stored as recovery.

New persisted fields use the existing user bucket: `bets.swamp`, `lastGame: 'swamp'`, `recovery.swampBonus`. One non-personal key, `vault:v1:swamp-schema`, caches successful schema support for this project; it contains no funds or identity. Existing mandatory authentication remains unchanged.

Server begin checks free-spin feature identity, sequential index and consumed checkpoint. A stale branch from another device is rejected and its subsequent local fork is discarded, not rebased into free money. SQL updates only the relevant game's recovery namespace, preserving other games' checkpoints. Existing RLS, auth.uid ownership and no-direct-wallet-update grants remain intact. Outcomes remain client-authoritative demo logic; full server RNG/settlement is not introduced here.

## Existing Supabase project — activate the new slot

1. Open https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new .
2. Copy **all** of `supabase_admin_swamp.txt` into the SQL Editor and click **Run**. The identical `.sql` file is also supplied.
3. Wait for `Success. No rows returned`. The migration is repeat-safe and preserves accounts, funds, stats and history.
4. Open the new slot again in VAULT. A capability probe detects readiness automatically. Older Swamp schemas still allow normal spins. Purchased entries require the new purchase capability; unsupported purchases cannot charge a stake or enter the outbox.

For a new database, the full updated `supabase_schema.sql` includes these changes. Frontend publication does not install SQL in a private Supabase project.

## QA / previews / build

- `tools/swamp-math-tests.cjs`: Rule/economic/recovery suites, including multi-Collector collection, multiple thresholds, top-tier retriggers, dry FS, 2000× selection and configurable max win.
- `tools/swamp-browser-check.py`: Chromium + actual Supabase SDK HTTP fixture; five widths (1440/1024/768/390/320), all asset decodes, 2000× text fit, no overflow/duplicate IDs, no console/page errors, shared funds, bet/F5 recovery and cross-account isolation.
- `tools/swamp-conflict-check.py`: stale offline FS fork rejection, last-FS retrigger persistence, automatic playback and leaving/pausing.
- `tools/swamp-sql-tests.py`: PostgreSQL 17, duplicate IDs, owned/sequential entitlements, last-FS consumption, namespace preservation, RLS and repeat-safe migration.
- Existing Auth, wallet conflict, Blackjack/Baccarat and Poker functional/viewport checks passed; original slot/Bird math checks remain in CI. These fixtures are not a test of the live Supabase project.

Previews: `previews/swamp-desktop.png`, `previews/swamp-mobile-bonus.png`, and `/workspace/output/swamp-base-390.png`. Bonus previews are real deterministic QA outcomes; production probabilities are unchanged.

Build:

```
python3 tools/embed-vault.py
python3 tools/build-site.py
node --check /tmp/digital-derby-release.js
```

The resulting `index.html` is standalone with embedded artwork and SDK. Local development can use `python3 -m http.server 8000`; authenticated play requires the configured Supabase origin/setup as before.

## Control and math update (version 2)

The toolbar follows Digital Derby's hierarchy: settings, bet, AUTO, MAX, SPIN, BONUS. AUTO offers 10/25/50/100/∞, STOP cancels future paid spins and lets the current result finish. Bet and purchases lock during auto/FS. Normal reels now take 240 + 5×180 = 1,140ms before extra anticipation/collect; FAST remains 70 + 5×75 = 445ms. Paid auto pause is 600ms. Mobile uses a fixed two-row toolbar with safe-area insets.

BONUS opens a priced shop: 10 FS at **77× bet**, 20 FS at **350× bet**. Both start at x1 with zero marks and use the same bonus reels/retriggers, with no guaranteed payout. The trigger-sized stake is locked. The purchase is a paid UUID round with zero direct payout; its FS entitlement is saved at begin before any animation. Repeated clicks/F5/retries cannot buy or grant twice. Purchased features use the same 50,000× stake cap. `purchaseStake`, type, price and feature size are checked in SQL; an old purchase schema disables these buys before any debit.

Scatter-per-reel increased from 7.5% to **9%**. Exact trigger probability is `sum(C(5,k)×p^k×(1−p)^(5−k), k=3..5)` = **0.63412794%**, or one per **157.70** spins on average. Previously it was one per 266.07 theoretically (the earlier sample observed ~263). There is no dry-streak guarantee or history-dependent RNG. Even at the new rate, about 28.0% of 200-spin sequences can contain no bonus.

To keep overall return near the same 96% target, line scale changed from 1.34 to **0.97**; Money Fish/Collector probabilities, money values, meter thresholds and tiers are unchanged. The current exact-config five-million-cycle report is `reports/swamp-rtp.json`; the historical version-1 result is retained as `reports/swamp-rtp-v1-baseline.json` rather than represented as current math.

Independent purchase pricing sample: `node tools/swamp-bonus-sim.cjs 100000` simulates complete actual features. It measured 73.6949× mean payout for 10 FS (95.7077% of its 77× price) and 338.0464× for 20 FS (96.5847% of 350×). Estimated standard errors of mean payout are 0.6925× and 1.8751× respectively. These are noisy estimates of high-volatility features, not certified exact RTPs. Full config/output: `reports/swamp-bonus-pricing.json`.

For all current features including the admin panel and MINES, use the **single latest** `supabase_admin_swamp.txt`; see `ADMIN_SETUP.md`. Do not apply old registry scripts afterward.
