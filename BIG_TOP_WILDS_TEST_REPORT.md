# BIG TOP WILDS — test report

Archive: `big-top/requirements/07_TESTS/TEST_CASES.txt` — **115 cases**.

The software checks below are covered by automated model/SQL/browser tests and explicit source/visual inspection as indicated. **TC-N01 and TC-N02 remain BLOCKED on actual hardware**, not passed: no physical iOS Safari/Android device is available. Chromium touch/viewport checks do not substitute for those two device sign-offs. No reproducible software failure remains in the completed runs; release has not been published.

## Executed evidence

- `reports/big-top-model.json`:46 acceptance references,3000 deterministic rounds; Ways, Scatter mapping, Encore/Applause and JSONB-order-safe recovery.
- `reports/big-top-sql.json`: real isolated PostgreSQL, re-runnable migration, exact payouts, duplicate-safe debit/base credit/bonus credit, RLS, insufficient funds, blocked user and tamper/bypass rejection.
- `reports/big-top-browser.json`: real Supabase SDK + isolated PostgreSQL; Normal/Quick/Turbo/Reduced timings, utility/feature popups, natural/purchased bonus, reloads,50 mobile spins,10 autoplay spins, all10 existing game routes.
- `reports/big-top-final-smoke.json`: final320px touch/Quick Bonus/full-reel label/character-fit checks after final presentation adjustments.
- `reports/bonus-update-browser.json`: all five previous slot bonus flows, one terminal wallet/stat event, offline/reload/admin-revision rebase, responsive/console/ID regression.
- `reports/reel-stability.json`: all five previous slot geometry/input/late-artwork tests.
- All19 workflow math/rules commands passed.233 pre-existing source/art files are byte-identical to the beginning of this task, except explicitly extended shared services (checked separately).
- Standalone build, combined JavaScript syntax and whitespace checks passed. No production database writes or deployment.

Geometry pattern fixtures verify the renderer at fixed2/6/mixed rows; live-spin stress exercises the same fixed viewport with seeded varying rows. Appearance-only cases include visual inspection, not a claim of automated aesthetic judgement. Device-specific and performance limits are stated explicitly.

## Case-by-case matrix

| Case | Result | Evidence / method |
|---|---|---|
| TC-A01 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A02 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A03 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A04 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A05 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A06 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-A07 | COVERED | Browser: fixed2/6/mixed-row fixtures, equal widths/aspect ratios,50 mobile spins and popup geometry sampling. |
| TC-B01 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B02 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B03 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B04 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B05 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B06 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B07 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B08 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-B09 | COVERED | Node deterministic Ways tests + independent PostgreSQL recomputation; saved-round replay including reordered JSONB keys. |
| TC-C01 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C02 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C03 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C04 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C05 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C06 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C07 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-C08 | COVERED | Scripted RNG fixtures2–6 Scatter,3000 seeded plans, one-per-reel invariant; SVG viewport/alpha geometry review. |
| TC-D01 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D02 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D03 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D04 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D05 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D06 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D07 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D08 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D09 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-D10 | COVERED | Precomputed featurePlan, stop/showdown trace, genuine seeded label fixtures, single-debit SQL/UI checks; no RNG in animation callbacks. |
| TC-E01 | COVERED | SQL/Node multiplier arithmetic, genuine2/6-row full-reel fixtures;320px character/label bounds inspection. |
| TC-E02 | COVERED | SQL/Node multiplier arithmetic, genuine2/6-row full-reel fixtures;320px character/label bounds inspection. |
| TC-E03 | COVERED | SQL/Node multiplier arithmetic, genuine2/6-row full-reel fixtures;320px character/label bounds inspection. |
| TC-E04 | COVERED | SQL/Node multiplier arithmetic, genuine2/6-row full-reel fixtures;320px character/label bounds inspection. |
| TC-E05 | COVERED | SQL/Node multiplier arithmetic, genuine2/6-row full-reel fixtures;320px character/label bounds inspection. |
| TC-F01 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F02 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F03 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F04 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F05 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F06 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F07 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-F08 | COVERED | Real WAAPI stop timestamps for Normal/Quick/Turbo/Reduced; source animation-property inspection, decoded-assets gate,50-spin mobile stress. |
| TC-G01 | COVERED | Actual SDK + PostgreSQL: one debit, independent once-only base credit after presentation, duplicate RPC/click guards, no cascades. |
| TC-G02 | COVERED | Actual SDK + PostgreSQL: one debit, independent once-only base credit after presentation, duplicate RPC/click guards, no cascades. |
| TC-G03 | COVERED | Actual SDK + PostgreSQL: one debit, independent once-only base credit after presentation, duplicate RPC/click guards, no cascades. |
| TC-G04 | COVERED | Actual SDK + PostgreSQL: one debit, independent once-only base credit after presentation, duplicate RPC/click guards, no cascades. |
| TC-G05 | COVERED | Actual SDK + PostgreSQL: one debit, independent once-only base credit after presentation, duplicate RPC/click guards, no cascades. |
| TC-H01 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H02 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H03 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H04 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H05 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H06 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H07 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-H08 | COVERED | Natural Scatter and paid-trigger UI flows; local bounds/controls/Space/touch checks; no automatic intro acknowledgement. |
| TC-I01 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I02 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I03 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I04 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I05 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I06 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-I07 | COVERED | Actual SDK + PostgreSQL escrow; F5 at intro/mid-bonus/summary and after settlement; wallet frozen until one terminal credit. |
| TC-J01 | COVERED | 3000 seeded sessions, serialised progress, exact one-step Encore carry/expiry, collision/shrinking-row fixture and SQL continuity validation. |
| TC-J02 | COVERED | 3000 seeded sessions, serialised progress, exact one-step Encore carry/expiry, collision/shrinking-row fixture and SQL continuity validation. |
| TC-J03 | COVERED | 3000 seeded sessions, serialised progress, exact one-step Encore carry/expiry, collision/shrinking-row fixture and SQL continuity validation. |
| TC-J04 | COVERED | 3000 seeded sessions, serialised progress, exact one-step Encore carry/expiry, collision/shrinking-row fixture and SQL continuity validation. |
| TC-J05 | COVERED | 3000 seeded sessions, serialised progress, exact one-step Encore carry/expiry, collision/shrinking-row fixture and SQL continuity validation. |
| TC-K01 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K02 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K03 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K04 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K05 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K06 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-K07 | COVERED | Configured contributions, threshold/guarantee/reset model assertions, persisted meter/armed state and SQL continuity checks. |
| TC-L01 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L02 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L03 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L04 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L05 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L06 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L07 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L08 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-L09 | COVERED | Local menu/confirmation; NO/X/backdrop/ESC, insufficient YES, duplicate YES, one purchase debit, visible3-Scatter presentation spin, input-gated intro. |
| TC-M01 | COVERED | Real local Big Win count-up, highlight/dim, exact winX, independent data-layer credit after presentation; SQL/client cap arithmetic. |
| TC-M02 | COVERED | Real local Big Win count-up, highlight/dim, exact winX, independent data-layer credit after presentation; SQL/client cap arithmetic. |
| TC-M03 | COVERED | Real local Big Win count-up, highlight/dim, exact winX, independent data-layer credit after presentation; SQL/client cap arithmetic. |
| TC-M04 | COVERED | Real local Big Win count-up, highlight/dim, exact winX, independent data-layer credit after presentation; SQL/client cap arithmetic. |
| TC-M05 | COVERED | Real local Big Win count-up, highlight/dim, exact winX, independent data-layer credit after presentation; SQL/client cap arithmetic. |
| TC-N01 | BLOCKED — actual device unavailable | Actual iOS Safari not tested. WebKit download returns403 Domain forbidden; mobile Chromium equivalent exercised. Requires hardware QA before device sign-off. |
| TC-N02 | BLOCKED — actual device unavailable | Actual Android Chrome not tested. WebKit download returns403 Domain forbidden; mobile Chromium equivalent exercised. Requires hardware QA before device sign-off. |
| TC-N03 | COVERED | Chromium mobile/touch integration, popup10×, actual320px showdown/label bounds,50 paid spins +10 autoplay spins, no residual strips/errors; bounded effects. |
| TC-N04 | COVERED | Chromium mobile/touch integration, popup10×, actual320px showdown/label bounds,50 paid spins +10 autoplay spins, no residual strips/errors; bounded effects. |
| TC-N05 | COVERED | Chromium mobile/touch integration, popup10×, actual320px showdown/label bounds,50 paid spins +10 autoplay spins, no residual strips/errors; bounded effects. |
| TC-N06 | COVERED | Chromium mobile/touch integration, popup10×, actual320px showdown/label bounds,50 paid spins +10 autoplay spins, no residual strips/errors; bounded effects. |
| TC-N07 | COVERED | Chromium mobile/touch integration, popup10×, actual320px showdown/label bounds,50 paid spins +10 autoplay spins, no residual strips/errors; bounded effects. |
| TC-O01 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O02 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O03 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O04 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O05 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O06 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O07 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-O08 | COVERED | All10 prior routes opened; auth/session and wallet equality; F5 idle/mid-spin/mid-bonus/after credit, legacy bonus/offline recovery regression. |
| TC-P01 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P02 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P03 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P04 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P05 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P06 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |
| TC-P07 | COVERED | Four supplied references reviewed; prepared approved-prop atlas, distinct BOMBO/SKINNY, alpha tent Scatter, nine-control HUD order and reel-local dialogs. |

## Fixes found during verification

- Encore collisions when the next row count shrank: reserve sufficient valid cells and unique destinations before animation.
- Remote JSONB key order rejected an otherwise identical plan: canonical structural comparison now ignores object-key order.
- Null remote progress affected auth restoration: the new-game extension now handles empty/null checkpoints safely.
- Desktop popup dimensions survived a mobile breakpoint until close: shared geometry locks now remeasure against original CSS while retaining the owner token.
- Atlas neighbour bleed: nested clipped SVG viewports and per-object source rectangles prevent neighbouring symbols leaking into letterboxed cells.
- Full Reel Wild label clipped at320px: responsive font fits the same plaque without deforming artwork.
- Base payout order: separate idempotent base-credit transaction runs after base win presentation; bonus remains deferred to terminal acknowledgement.
- Shared utility dialogs were page-level by default: BIG TOP now mounts Settings/Paytable/Bet/Auto inside the reels with a local backdrop, focus handling and gameplay lock.

## Remaining verification

Only the two hardware-specific runs TC-N01/TC-N02 are not signed off. The report does not claim115/115 passed on physical devices or a certified60FPS guarantee. Current simulation is a Monte Carlo estimate with a confidence interval, not a certified theoretical RTP.
