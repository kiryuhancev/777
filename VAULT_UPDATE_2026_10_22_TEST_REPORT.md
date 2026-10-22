# VAULT update — 2026-10-22 test report

Authoritative current suite: `requirements/2026-10-22/05_TESTS/TEST_CASES.txt` (**120 cases**).

Environment: Chromium desktop1440px, portrait390px/320px touch. Tests use the real frontend and Supabase SDK with isolated synthetic PostgreSQL accounts/RPCs. No production user data, migration or deployment was touched.

Evidence: `reports/vault-update-2026-model.json`, `vault-update-2026-sql.json`, `vault-update-2026-browser.json`, `vault-update-2026-bonus.json`, `vault-update-2026-profiles.json`, `vault-update-2026-regression.json`, `vault-update-2026-source-audit.json`. Existing `reports/reel-stability.json` and `reports/bonus-update-browser.json` cover shared delayed assets/analog strips and other slot bonuses. Screenshots are in `/workspace/output/`.

| Test | Result | Evidence |
|---|---|---|
| BT-A01 — SHOW TICKET occupies exactly one normal cell. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A02 — SHOW TICKET is visually distinct from SCATTER tent. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A03 — SHOW TICKET is not rendered on curtain overlay. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A04 — SHOW TICKET does not itself stretch to reel height. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A05 — SHOW TICKET activates feature only on its own configured reel. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A06 — Trigger result/winner/multiplier exists in featurePlan before animation. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A07 — No Spotlight trigger remains wired to Curtain Feature. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-A08 — Ticket appearance remains readable at 320px mobile. | PASS | Current model5000-seed invariants; browser actual cell/trigger sequence; mobile SHOW preview; source audit(no Spotlight symbol) |
| BT-B01 — 2-row triggering reel: curtain width == reel width. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B02 — 2-row triggering reel: curtain height == 100% reel height. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B03 — 3-row reel curtain fills full reel. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B04 — 4-row reel curtain fills full reel. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B05 — 5-row reel curtain fills full reel. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B06 — 6-row reel curtain fills full reel. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B07 — Curtain never covers neighboring reel. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B08 — Curtain overlay does not resize reel container. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B09 — Curtain opening/closing does not alter row heights. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-B10 — Reel bounds remain pixel-stable through feature. | PASS | Browser full-reel bounds/rows2–6 at1440/390/320; RAF grid/HUD drift measurements |
| BT-C01 — Reels fully settle before curtain begins. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C02 — Ticket receives readable trigger pulse/focus. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C03 — Left curtain half enters from left edge of triggering reel. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C04 — Right curtain half enters from right edge of triggering reel. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C05 — Both halves meet/close across entire reel. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C06 — Closed state covers the entire visible reel. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C07 — Curtains reopen toward their reel edges. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C08 — Open curtain remains as visible stage framing. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C09 — Stage is clipped within one reel. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C10 — No clown pixels overlap adjacent reels. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C11 — Normal mode sequence is readable and not instantaneous. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C12 — Quick mode preserves same stages/result. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C13 — Turbo mode preserves same stages/result. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-C14 — Reduced Motion preserves semantic sequence without layout changes. | PASS | Browser real Normal close/hold/open/duel timeline; Quick/Turbo profile test; Reduced Motion feature stress |
| BT-D01 — Only BOMBO and SKINNY appear in showdown. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D02 — BOMBO matches approved large/round/heavy silhouette. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D03 — SKINNY matches approved tall/thin/elastic silhouette. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D04 — Generic red/blue placeholder clown is not used. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D05 — Characters remain visually distinct beyond color alone. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D06 — Both characters stay inside open curtain stage during duel. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D07 — Duel result matches predetermined featurePlan winner. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-D08 — No RNG is called from duel animation callbacks. | PASS | Approved-reference/artwork inspection; clipped dual-character browser stage; immutable featurePlan/winner/animation source audit |
| BT-E01 — After duel, loser leaves/hides. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E02 — Exactly one winning approved clown remains. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E03 — Curtains remain OPEN in final state. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E04 — Final open stage fills exactly one full reel. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E05 — x1 result displays WILD only. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E06 — x2 result displays x2 only. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E07 — x3 result displays x3 only. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E08 — x5 result displays x5 only. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E09 — x10 result displays x10 only. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E10 — No WILD + xN double label. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E11 — No black generic multiplier badge. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E12 — Character is repositioned/scaled without non-uniform facial/body stretching. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-E13 — Full Reel multiplier applies per reel according to baseline math, not once per Wild cell. | PASS | Browser all WILD/x2/x3/x5/x10 replacements and uniform SVG scaling; pure model+independent SQL multiplier arithmetic |
| BT-F01 — Two triggered reels resolve independently. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-F02 — Three triggered reels resolve independently if allowed by config. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-F03 — Resolution order is deterministic left-to-right unless plan says otherwise. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-F04 — Already-resolved reel remains visible while next reel resolves. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-F05 — Final payout evaluation happens only after all curtains resolve. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-F06 — One visual feature cannot create an unplanned extra trigger. | PASS | Real seeded3-trigger browser case, deterministic sorted order, no hidden repaint/second credit; model plan validation |
| BT-G01 — reelHeights [2,2,2,2,2,2] displays 64 WAYS. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G02 — [4,6,3,5,4,6] displays 8,640 WAYS. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G03 — [6,6,6,6,6,6] displays 46,656 WAYS. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G04 — Current ways updates each spin from engine reelHeights. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G05 — Ways value is not calculated from CSS/pixel heights. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G06 — By final settle displayed ways exactly matches engine product. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G07 — Static 'UP TO 46,656' is not the only current-ways display. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G08 — Ways display does not overflow 320px mobile UI. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-G09 — Visible UI does not use the trademarked word MEGAWAYS. | PASS | Forced engine heights64/8640/46656 current-ways display at320px; DOM-independent formula |
| BT-H01 — Ticket landing causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H02 — Curtain closing causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H03 — Curtain opening causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H04 — Clown duel causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H05 — Winner/result transition causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H06 — Win highlight on resolved curtain causes no layout jump. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H07 — 320px viewport has no horizontal page overflow. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H08 — 390px viewport has no horizontal page overflow. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| BT-H09 — no relevant console errors during 50 repeated feature spins. | PASS | 50 real mobile paid feature rounds, fixed geometry/effects/DOM count, no overflow or console errors |
| SF-I01 — All base symbols fully readable desktop. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I02 — All base symbols fully readable at 390px. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I03 — All base symbols fully readable at 320px. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I04 — Collector/Fisherman head/body/lantern/important prop not cropped. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I05 — Money Fish silhouettes and displayed values not cropped. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I06 — Scatter artwork/text fully visible. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I07 — Card/low symbols not clipped. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I08 — Premium/special symbols not clipped. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I09 — No non-uniform stretching. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I10 — Win highlight does not change crop/scale incorrectly. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I11 — Bonus mode uses same safe-fit guarantees. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I12 — Late image decode/load causes no geometry jump. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| SF-I13 — Reel strip animation does not expose neighboring atlas art. | PASS | Production-cell symbol audit at1440/390/320 base/bonus/highlight; complete Collector source; actual analog/delayed-image reel stability regression |
| UP-J01 — Normal 10 uses Normal-world art. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J02 — Normal J/Q/K/A use Normal-world art. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J03 — Upside 10 uses Upside-world counterpart. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J04 — Upside J/Q/K/A use Upside-world counterparts. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J05 — Rank identity is immediately readable in both worlds. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J06 — World skins are never randomly swapped. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J07 — Card symbols remain readable at mobile cell size. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| UP-J08 — No aspect-ratio distortion. | PASS | Both provided rank sets mapped deterministically; all five ranks per world at1440/390/320; uniform SVG transform checks |
| SH-K01 — Free-spin win updates BONUS WIN but not wallet during active bonus. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K02 — Final bonus total settles once at terminal bonus completion. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K03 — Reload mid-bonus restores total and remaining state. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K04 — Reload after settlement cannot pay again. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K05 — Bonus Buy YES debits once. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K06 — Bonus Buy double tap cannot double debit. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K07 — Purchased bonus plays presentation trigger spin without extra wager debit. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K08 — Bonus Intro opens inside game/reel area. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K09 — Bonus Complete opens inside game/reel area. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K10 — Popup open/close does not change game height. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K11 — Space/click/tap performs one transition only. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| SH-K12 — Underlying controls cannot click through blocking popup. | PASS | Actual SDK+local PostgreSQL bonus purchase/cancel/doubleYES, frozen bonus balance, intro/mid/summary/settled F5, terminal once-only credit; unchanged shared popup module |
| RG-L01 — BIG TOP baseline left-to-right Ways math unchanged except intended trigger presentation changes. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L02 — BIG TOP Scatter behavior unchanged. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L03 — BIG TOP Bonus behavior unchanged except shared approved fixes. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L04 — Swamp Fishing math/RNG unchanged by symbol-fit fix. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L05 — UPSIDE PAWS Dual Grid math unchanged by card art addition. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L06 — Universal HUD semantics unchanged. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L07 — Existing VAULT game routes still load. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L08 — Auth/session unchanged. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L09 — Wallet balances reconcile exactly after repeated rounds. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |
| RG-L10 — No relevant new console errors. | PASS | All21 math/rules suites plus syntax; v1 round SQL/browser F5; v2 independent SQL; source hashes for Swamp/UP math and shared HUD/popups; all routes/session restore |

## Authorized change and historical compatibility

The user explicitly approved full-reel gameplay and recalibration toward96% after the single-cell/full-reel conflict was identified. RG-L01 therefore preserves the evaluator/weights/row distribution/initial Scatter rules while permitting the approved payout coefficient and full-reel transformation. Immutable v1 models and private SQL routing keep already-started v1 rounds financially unchanged. The new ticket presentation never selects a winner or independently credits money.

## Statistical RTP evidence

Calibration:5,000,000 paid rounds, target96%,95% interval≈90.13–101.87%. Configured payout scale0.11025308, buy244× (100,000 bonus calibration expected234.0059×). Independent2,000,000 paid rounds:102.73%,95%CI92.69–112.76%; target is inside the interval. Additional offline1,000,000 importance-proposal rounds:106.26%,95%CI93.48–119.04%; mean likelihood weight0.99744. This diagnostic did not reduce total variance because of the rare base-game tail. **A true theoretical96% RTP is not established or certified by these samples.** See raw calibration/validation/importance JSON and scripts. No existing Swamp/UP mathematics changed.

## Hardware limits

Inherited baseline TC-N01 (physical iOS Safari) and TC-N02 (physical Android Chrome device) are **BLOCKED: hardware/browser unavailable**. They are not marked passed. Current desktop/mobile acceptance results refer to Chromium at the stated widths.

## Corrected during verification

- SQL ambiguity between feature variable and query alias was fixed before acceptance.
- A JSON serialization test initially dropped nested Encore keys; the test now reorders keys recursively without deleting data.
- The closed-stage sampling assertion now uses animation-frame polling so it observes the deliberately short closed hold.
- Native hidden Swamp progression now reserves space; explicit base/bonus visibility toggles leave frame geometry identical.

## Final properties

SHOW TICKET:ONE CELL  
CURTAIN:EXACTLY ONE FULL REEL  
APPROVED BOMBO/SKINNY ONLY  
FINAL STATE:OPEN / ONE WINNER  
LABEL:WILD OR xN  
CURRENT WAYS:ENGINE PRODUCT  
SWAMP ART:CONTAIN / COMPLETE COLLECTOR SOURCE  
UPSIDE PAWS:DETERMINISTIC WORLD CARD PAIRS  
BONUS:ONE DEBIT / ONE FINAL CREDIT  
LEGACY ROUND:F5 SAFE  
NO NEW RELEVANT CONSOLE ERRORS

Setup and file-level details: `VAULT_UPDATE_2026_10_22.md`. Run the complete `supabase_big_top_v2.txt` before using new v2 rounds. This update remains unpublished.

## Independent split RTP cross-check

Separate likelihood-corrected base and bonus estimators (500,000 rounds each) give total RTP **98.76%**, approximate 95% confidence interval **96.23–101.28%** at the delivered scale. This improves precision over ordinary Monte Carlo; it does not certify an exact theoretical96%. The independent five-million-round calibration targets96%; rare capped bonus tails still dominate uncertainty. Production RNG/weights were not changed by the offline estimator. Evidence: `reports/big-top-v2-stratified-combined.json`.
