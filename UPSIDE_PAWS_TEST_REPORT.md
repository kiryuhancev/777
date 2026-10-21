# UPSIDE PAWS — acceptance report

Archive: `upside-paws/requirements/09_TESTS/TEST_CASES.txt` (**189 cases**).

Evidence: `reports/upside-paws-model.json`, `reports/upside-paws-sql.json`, `reports/upside-paws-browser.json`, `reports/upside-paws-extra.json`, `reports/upside-paws-regression.json`, `reports/upside-paws-simulation.json`, `reports/upside-paws-source-audit.json`. Shared regression also passed `reports/bonus-update-browser.json` (five existing slot bonuses, offline revision rebase) and `reports/big-top-final-smoke.json` (320px touch / single bonus settlement). Tests use Chromium, the actual Supabase SDK and an isolated local PostgreSQL instance. Production data is never modified.

Desktop1440px; portrait390px and320px touch; landscape844px. Physical iOS/Android hardware and Safari were not available, so this report does not claim hardware/browser certification. Performance checks establish fixed geometry, bounded DOM/effects and completed50-spin playback in this environment; they do not guarantee FPS on every device.

| Case | Result | Evidence |
|---|---|---|
| TC-A01 — New game route opens without runtime error. | PASS | browser A/U + unchanged-source hash audit |
| TC-A02 — Existing VAULT games still open. | PASS | browser A/U + unchanged-source hash audit |
| TC-A03 — Existing wallet value is read correctly. | PASS | browser A/U + unchanged-source hash audit |
| TC-A04 — Authentication/session behavior is unchanged. | PASS | browser A/U + unchanged-source hash audit |
| TC-A05 — Refreshing lobby does not break UPSIDE PAWS assets. | PASS | browser A/U + unchanged-source hash audit |
| TC-A06 — No relevant console errors on initial load. | PASS | browser A/U + unchanged-source hash audit |
| TC-B01 — Desktop shows two 4x4 grids simultaneously. | PASS | browser desktop geometry/payment checks |
| TC-B02 — Normal grid is visually distinct from Upside grid. | PASS | browser desktop geometry/payment checks |
| TC-B03 — Both grids have exactly 16 visible cell positions. | PASS | browser desktop geometry/payment checks |
| TC-B04 — Central rift/separator is visible. | PASS | browser desktop geometry/payment checks |
| TC-B05 — One paid spin operates both grids. | PASS | browser desktop geometry/payment checks |
| TC-B06 — Grid frame width/height does not change during spin. | PASS | browser desktop geometry/payment checks |
| TC-B07 — Win animation does not resize either grid. | PASS | browser desktop geometry/payment checks |
| TC-B08 — Opening popup does not resize grid container. | PASS | browser desktop geometry/payment checks |
| TC-C01 — Portrait mobile shows both worlds without horizontal page scrolling. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C02 — If grids stack, both remain visible within normal game flow. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C03 — Grid space is reserved before spin; no grid insertion jump. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C04 — Spin start creates no visible vertical jump. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C05 — Symbol settle creates no visible jump. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C06 — Echo animation creates no page/layout shift. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C07 — Portal animation creates no page/layout shift. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C08 — Resonance presentation creates no layout shift. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C09 — Popup open/close creates no HUD movement. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C10 — Rotation/responsive resize does not corrupt active game state. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C11 — Touch targets remain usable at supported smallest viewport. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-C12 — No symbol aspect-ratio distortion. | PASS | browser mobile50 rounds/orientation + extra320px touch |
| TC-D01 — Dog has Normal and Upside counterpart IDs. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D02 — Cat has Normal and Upside counterpart IDs. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D03 — Rabbit has Normal and Upside counterpart IDs. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D04 — Bird has Normal and Upside counterpart IDs. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D05 — Hamster/guinea-pig has Normal and Upside counterpart IDs. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D06 — Echo Normal Dog -> Upside produces Upside Dog art, not Normal Dog art. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D07 — Echo Upside Cat -> Normal produces Normal Cat art. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D08 — Low card symbols use correct world skin. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-D09 — No unapproved pet family appears. | PASS | model paired-family checks + original generated atlas visual inspection |
| TC-E01 — Round plan is created before visible spin. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E02 — Normal final symbols equal round plan. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E03 — Upside final symbols equal round plan. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E04 — Primary grid wins evaluate after both grids settle. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E05 — No payout occurs before deterministic result exists. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E06 — Input stays locked until round is safely complete. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-E07 — Rapid Spin taps cannot create overlapping paid rounds. | PASS | browser double-spin/F5/final-grid checks + deterministic model/bridge ordering |
| TC-F01 — Qualifying Normal event can Echo to Upside. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F02 — Qualifying Upside event can Echo to Normal. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F03 — Echo target coordinate matches round plan. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F04 — Echo target symbol family matches plan. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F05 — Echo may create a secondary win. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F06 — Secondary win is evaluated once. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F07 — Secondary win does NOT create another Echo. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F08 — No Normal->Upside->Normal recursive chain. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F09 — Multiple planned Echo events resolve deterministically. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-F10 — Visual Echo destination never differs from settlement data. | PASS | model forced bidirectional Echo + browser Echo plan playback |
| TC-G01 — Portal Wild renders as special portal visual. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G02 — Portal Wild substitute behavior follows configured evaluator. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G03 — Linked coordinate matches roundPlan. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G04 — Copied/transferred pet uses correct world counterpart. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G05 — Portal animation begins only after grid settle. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G06 — Portal animation cannot change RNG result. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G07 — Portal-caused secondary result evaluates at most once. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-G08 — Portal cannot trigger infinite inter-world reactions. | PASS | model forced Portal/counterpart checks + independent SQL validation + browser Portal playback |
| TC-H01 — Same coordinate winning in both worlds counts as one resonant position. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H02 — Different coordinates do not falsely count as Resonance. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H03 — 1 resonant position resolves configured x2. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H04 — 2 resonant positions resolves configured x3. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H05 — 3 resonant positions resolves configured x5. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H06 — 4+ resonant positions resolves configured x10. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H07 — Resonance values are config-driven. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H08 — Corresponding cells highlight together. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H09 — Resonance popup/effect stays inside game area. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-H10 — Resonance multiplier is applied once, not once per animation frame/cell. | PASS | model forced0–5 position Resonance ladder + browser resonant final positions |
| TC-I01 — 3 Scatter all on Normal triggers bonus. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I02 — 3 Scatter all on Upside triggers bonus. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I03 — 2 Normal + 1 Upside Scatter triggers bonus. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I04 — 1 Normal + 2 Upside Scatter triggers bonus. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I05 — Fewer than 3 total Scatter does not trigger bonus. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I06 — Scatter is visually distinct from ordinary square pet symbols. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I07 — Scatter count uses both grids exactly once. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-I08 — Trigger presentation does not duplicate base payout. | PASS | model forced all-world/split Scatter counts + browser natural/bought entry |
| TC-J01 — 3 Scatter awards configured 10 free spins. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J02 — 4 Scatter awards configured 12 free spins. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J03 — 5 Scatter awards configured 15 free spins. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J04 — 6+ Scatter awards configured 20 free spins. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J05 — Both grids remain visible throughout bonus. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J06 — FREE SPINS counter decrements exactly once per free spin. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J07 — Bonus uses enhanced feature configuration. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-J08 — Bonus does not silently change base paytable unless configured. | PASS | model Scatter10/12/15/20 mapping + browser/extra real bonus lifecycle |
| TC-K01 — Meter starts with correct configured value. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K02 — Qualifying event increases meter exactly once. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K03 — Nonqualifying event does not increase meter. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K04 — Meter cannot visually diverge from persisted state. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K05 — At 100%, Full Breach is queued for next eligible spin. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K06 — Full Breach is not consumed before that spin. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K07 — Full Breach consumption resets/updates meter according to config. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K08 — Reload preserves meter. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-K09 — Reload preserves queued Full Breach. | PASS | model meter/reset/queue/no-event checks + extra Full Breach checkpoint F5 |
| TC-L01 — Full Breach uses predetermined round plan. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-L02 — Enhanced visuals do not alter settlement. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-L03 — Increased mirrored/portal activity follows configured plan. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-L04 — Secondary evaluation cap remains one. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-L05 — Full Breach cannot recursively retrigger itself from presentation only. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-L06 — After Full Breach the bonus returns to ordinary bonus mode. | PASS | model deterministic Full Breach + extra real queued-step playback |
| TC-M01 — Bonus spin 1 win increases BONUS WIN only, not wallet. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M02 — Bonus spin 2 win accumulates into same bonus total. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M03 — Wallet remains unchanged throughout active free spins. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M04 — Final bonus total equals sum of bonus spin results. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M05 — Final bonus total credits wallet exactly once. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M06 — Bonus Complete presentation cannot pay a second time. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M07 — Reopening/dismissing popup cannot pay again. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M08 — settlement flag persists. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M09 — No floating-point display artifact appears in visible wallet values. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-M10 — Real wallet precision is not changed by display formatting. | PASS | SQL duplicate/escrow tests + browser/extra frozen wallet and final one-credit assertions |
| TC-N01 — Reload after first free spin restores remaining spins. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N02 — Reload restores accumulated BONUS WIN. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N03 — Reload restores Breach Meter. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N04 — Reload restores Full Breach queue. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N05 — Reload after final spin before settlement completes safely. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N06 — Reload after settlement does not settle again. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-N07 — Repeated reloads cannot duplicate bonus winnings. | PASS | browser intro/mid/terminal/settled reloads + extra meter/queue equality |
| TC-O01 — BONUS button opens shared feature menu. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O02 — Selecting DIMENSION BREACH opens custom confirmation. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O03 — NO closes with no debit. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O04 — backdrop/escape cancel causes no debit when supported. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O05 — YES validates balance. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O06 — Insufficient balance does not start bonus. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O07 — Valid purchase debits cost exactly once. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O08 — Double tap YES cannot double debit. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O09 — Purchase starts trigger presentation spin. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O10 — Trigger presentation spin charges no normal extra wager. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O11 — Trigger spin visibly lands required Scatter. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O12 — Trigger spin leads to Bonus Intro, not directly to free spin 1. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O13 — SPACE/tap starts bonus once. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-O14 — Trigger spin cannot accidentally settle a second normal wager result. | PASS | browser purchase cancellation/duplicateYES/trigger + extra insufficient funds |
| TC-P01 — Bonus Buy confirmation is inside game/grid area. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P02 — Bonus Intro is inside game/grid area. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P03 — Full Breach notification is inside game/grid area. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P04 — Big Win is inside game/grid area. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P05 — Bonus Complete is inside game/grid area. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P06 — Popup backdrop dims game only, not whole web page. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P07 — HUD remains positioned and does not jump. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P08 — Popup opening does not alter game height. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P09 — Popup closing does not alter game height. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P10 — SPACE produces one transition. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P11 — click/tap produces one transition. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P12 — underlying Spin cannot click-through while blocking popup is active. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-P13 — rapid tap does not skip two states. | PASS | shared local popup implementation + browser keyboard/click/geometry checks + extra Full Breach gate |
| TC-Q01 — Normal-grid winning cells remain bright. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q02 — Nonwinning Normal cells dim during presentation. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q03 — Upside-grid winning cells remain bright. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q04 — Nonwinning Upside cells dim. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q05 — Resonant coordinates receive paired visual treatment. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q06 — WIN shows current paid round. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q07 — LAST WIN updates only after completed round. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q08 — BONUS WIN represents bonus-session accumulation. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q09 — Big Win presentation does not modify payout amount. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-Q10 — First skip input completes counter rather than causing duplicate settlement. | PASS | browser final winning cells/amount/count-up + model eligible positions + visual screenshot review |
| TC-R01 — Normal profile completes correctly. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R02 — Quick profile preserves exact same result. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R03 — Turbo profile preserves exact same result. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R04 — Reduced Motion preserves all gameplay information. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R05 — Changing speed profile cannot change result. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R06 — Portal/Echo animations wait until base grids settle. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R07 — Resonance waits for finalized eligible positions. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-R08 — Animation cancellation/skip still lands exact planned final state. | PASS | browser actual profile timings and same results + F5 deterministic recovery |
| TC-S01 — Repeated 50 spins do not cause progressive DOM node growth. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-S02 — Repeated 50 spins do not materially leak animation timers. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-S03 — Mobile animation remains usable without major frame stalls. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-S04 — Images are preloaded/cached enough to prevent first-win layout jumps. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-S05 — Hidden/offscreen effects are cleaned after round. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-S06 — No uncontrolled recursive promises/events from Echo. | PASS | browser50 rounds fixed DOM count/clean effects + asset preload and finite event-loop source review |
| TC-T01 — One base wager debited per normal paid spin. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-T02 — Round payout settles once. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-T03 — Rapid refresh around settlement does not duplicate base win. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-T04 — Bonus Buy purchase has unique transaction/round identity if project supports it. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-T05 — Bonus session settlement has unique idempotent identity. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-T06 — No visual callback directly performs an independent wallet credit. | PASS | independent SQL idempotency/owner locks + browser reload/double-input/offline tests |
| TC-U01 — Digital Derby works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U02 — Poker Blitz works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U03 — Vault Breakers works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U04 — Blackjack works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U05 — Baccarat works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U06 — Mines works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U07 — Swamp Fishing works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U08 — Vault Heist works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U09 — MAGNET works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U10 — Critter Chaos works. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U11 — Universal HUD behavior unchanged for other slots. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U12 — Common wallet formatting unchanged except intended shared bug fixes. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U13 — No new global CSS collision. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |
| TC-U14 — No relevant console errors after navigating among games. | PASS | browser eleven old routes + 20 CI math/rules suites plus release syntax + unchanged-source hash audit |

## Release properties

DUAL GRID IMPLEMENTED  
NORMAL / UPSIDE COUNTERPARTS IMPLEMENTED  
ECHO DEPTH LIMITED TO ONE  
PORTAL WILD IMPLEMENTED  
RESONANCE IMPLEMENTED  
DIMENSION BREACH IMPLEMENTED  
BREACH METER / FULL BREACH IMPLEMENTED  
BONUS WALLET SETTLES ONCE AT END  
BONUS BUY USES TRIGGER SPIN  
POPUPS ARE GAME-CONTAINED  
MOBILE LAYOUT STABLE in tested Chromium viewports  
RELOAD / SETTLEMENT TESTS PASS  
EXISTING VAULT GAMES UNAFFECTED by this implementation: original game modules/art unchanged; shared adapters extended and regressed.

Initial browser checks caught and corrected a HUD adapter selector mismatch, a duplicate lobby registration, and the old Derby screen remaining mounted visibly. A strict nested-SVG assertion also caught a missing explicit aspect-ratio attribute; both viewports now explicitly preserve aspect ratio. SQL parser failures during development were fixed before database acceptance. No failed checks are treated as passes.

The complete additive setup is `supabase_upside_paws.txt` (after `supabase_big_top.txt` if not installed). Changes and production SQL are **not published/applied**.
