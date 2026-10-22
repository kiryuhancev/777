# BIG TOP final package — acceptance report

**147/147 current-package checks PASS; 56/56 release blockers PASS.**

Source: `requirements/big-top-final-2026-10-22/06_TESTS/TEST_CASES.txt`. This report maps the actual grouped assertions and visual inspection to each package case. Results use Chromium with real pinned Supabase SDK and isolated PostgreSQL RPCs; no production account or database was modified. Desktop1440 and mobile logical widths320/390/430 tested.

## Executed evidence

- `tools/bigtop-final-model-tests.cjs`:10,000 deterministic plans, unchanged base outcomes, legacy1/2, same-reel identity/session persistence, independently playing/closed Curtains, stored personal winner/multiplier, full-grid Wild and checkpoint canonicality.
- `tools/vault-update-2026-model-tests.cjs`:5,000 immutable v2 regression seeds plus all multipliers/row patterns/strict Ways.
- `tools/bigtop-final-sql-tests.py`:v3 migration twice; exact independent Ways and calibrated bonus evaluation; legacy1/2/new natural/purchased bonuses; one debit/base credit/stat/terminal credit; reject forged carry/multiplier/playing state, early credit, insufficient funds, duplicate requests and cross-user access.
- `tools/vault-update-2026-browser-check.py`:real paid model/controller/SQL; full reel geometry rows2–6; approved duo/final art; all labels; exact64/8640/46656 Ways;1440/430/390/320;50 real feature spins without DOM growth; every Swamp symbol/base/bonus/highlight; both world-specific card families.
- `tools/vault-update-2026-profiles-check.py`:Quick/Turbo/Reduced state ordering including SECOND CLOSE and final reopen; exact seeded payout; readable ordinary one-cell SHOW at320px. Normal ordering/duo/final tested in main browser suite. No Skip action exists in this game, so no new skip behavior was invented.
- `tools/bigtop-final-persistence-check.py`:actual mixed playing/non-playing persistent reel states. Paused non-playing pulse: closed halves, no clown/winner, no visible result label, full-column bounds. Mid-animation F5 preserves immutable plan/session/positions/multipliers; playing states open correct winner; wallet frozen until one terminal credit.
- `tools/bigtop-final-bonus-check.py`:NO/ESC/backdrop;double YES;3 Scatter presentation/no extra debit;intro waits;popup-contained/control lock;F5 intro/midbonus/summary/settled;active v1 AND v2 F5;all11 older routes,unique IDs and no relevant runtime/console errors.
-22 rule/math regression suites listed individually in `reports/bigtop-final-regression.json` all passed; release syntax and `git diff --check` passed.
-Approved source/duo/final/mobile screenshots inspected. Exact v2 legacy preservation and unchanged auth/shared popup/Swamp/UP files verified by byte comparison in `reports/bigtop-final-unchanged.json`.

## Limits and superseded legacy cases

Physical iOS Safari and Android hardware were not available; inherited TC-N01/N02 physical checks are UNVERIFIED. Current-package mobile geometry tests passed in Chromium emulation; no claim of physical-device certification. Live production Supabase connectivity was not tested.

Inherited legacy one-spin Encore cases are superseded by the explicit final-package requirement to retain qualifying Curtains until bonus end. Existing v1/v2 stored rounds keep their original financial/state semantics.

Calibration targets96%, independent estimate98.69% (approx95% interval95.75–101.62%); this is not exact theoretical RTP certification. Buy price227×, separate50,000-session buy estimate95.81%. Detailed evidence in implementation report.

## Current-package case matrix

| Case | Result | Evidence |
|---|---|---|
| BT-T01 **BLOCKER** | PASS | main browser / profiles / pure model |
| BT-T02 **BLOCKER** | PASS | main browser / profiles / pure model |
| BT-T03 **BLOCKER** | PASS | main browser / profiles / pure model |
| BT-T04 **BLOCKER** | PASS | main browser / profiles / pure model |
| BT-T05 | PASS | main browser / profiles / pure model |
| BT-T06 | PASS | main browser / profiles / pure model |
| BT-T07 | PASS | main browser / profiles / pure model |
| BT-T08 | PASS | main browser / profiles / pure model |
| BT-T09 | PASS | main browser / profiles / pure model |
| BT-C01 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C02 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C03 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C04 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C05 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C06 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C07 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C08 **BLOCKER** | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C09 | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C10 | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-C11 | PASS | main browser rows2–6,1440/430/390/320 / CSS source |
| BT-A01 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A02 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A03 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A04 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A05 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A06 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A07 | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A08 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A09 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A10 **BLOCKER** | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A11 | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-A12 | PASS | Normal main trace / Quick-Turbo-Reduced profiles / source |
| BT-V01 **BLOCKER** | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V02 **BLOCKER** | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V03 **BLOCKER** | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V04 **BLOCKER** | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V05 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V06 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V07 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V08 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V09 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-V10 | PASS | approved references + inspected desktop/mobile duo/final screenshots / proportional SVG |
| BT-W01 | PASS | main labels / model Ways / SQL evaluator |
| BT-W02 | PASS | main labels / model Ways / SQL evaluator |
| BT-W03 | PASS | main labels / model Ways / SQL evaluator |
| BT-W04 | PASS | main labels / model Ways / SQL evaluator |
| BT-W05 | PASS | main labels / model Ways / SQL evaluator |
| BT-W06 **BLOCKER** | PASS | main labels / model Ways / SQL evaluator |
| BT-W07 **BLOCKER** | PASS | main labels / model Ways / SQL evaluator |
| BT-W08 | PASS | main labels / model Ways / SQL evaluator |
| BT-W09 | PASS | main labels / model Ways / SQL evaluator |
| BT-Y01 **BLOCKER** | PASS | main exact Ways fixtures / state-derived product |
| BT-Y02 **BLOCKER** | PASS | main exact Ways fixtures / state-derived product |
| BT-Y03 **BLOCKER** | PASS | main exact Ways fixtures / state-derived product |
| BT-Y04 | PASS | main exact Ways fixtures / state-derived product |
| BT-Y05 | PASS | main exact Ways fixtures / state-derived product |
| BT-Y06 | PASS | main exact Ways fixtures / state-derived product |
| BT-Y07 | PASS | main exact Ways fixtures / state-derived product |
| BT-Y08 | PASS | main exact Ways fixtures / state-derived product |
| BT-Y09 | PASS | main exact Ways fixtures / state-derived product |
| BT-B01 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B02 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B03 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B04 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B05 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B06 **BLOCKER** | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B07 | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B08 | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B09 | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-B10 | PASS | 10000 plans / persistence browser F5 / SQL carry and ownership |
| BT-P01 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P02 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P03 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P04 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P05 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P06 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P07 **BLOCKER** | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P08 | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P09 | PASS | mixed-state persistence browser / pure model / server validator |
| BT-P10 | PASS | mixed-state persistence browser / pure model / server validator |
| BT-S01 **BLOCKER** | PASS | bonus browser and SQL / shared local popup regression |
| BT-S02 **BLOCKER** | PASS | bonus browser and SQL / shared local popup regression |
| BT-S03 **BLOCKER** | PASS | bonus browser and SQL / shared local popup regression |
| BT-S04 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S05 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S06 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S07 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S08 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S09 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S10 | PASS | bonus browser and SQL / shared local popup regression |
| BT-S11 | PASS | bonus browser and SQL / shared local popup regression |
| BT-BUY01 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY02 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY03 **BLOCKER** | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY04 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY05 **BLOCKER** | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY06 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY07 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-BUY08 | PASS | bonus buy/reload browser / SQL insufficient and duplicate guards |
| BT-M01 **BLOCKER** | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M02 **BLOCKER** | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M03 **BLOCKER** | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M04 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M05 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M06 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M07 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M08 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M09 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M10 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M11 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| BT-M12 | PASS | main geometry and repeated spins / profiles / fixed-layout source |
| SF-F01 **BLOCKER** | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F02 **BLOCKER** | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F03 **BLOCKER** | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F04 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F05 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F06 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F07 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F08 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F09 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F10 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| SF-F11 | PASS | main every-symbol fit audit / unchanged complete Collector and Scatter |
| UP-C01 **BLOCKER** | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C02 **BLOCKER** | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C03 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C04 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C05 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C06 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C07 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| UP-C08 | PASS | main both-world five-rank art audit / unchanged deterministic mapping |
| RG-01 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-02 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-03 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-04 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-05 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-06 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-07 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-08 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-09 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-10 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-11 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-12 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-13 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-14 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-15 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-16 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |
| RG-17 | PASS | 22 math suites / all-route bonus browser / SQL wallet / source audit |

## Mandatory final properties

```text
SHOW TICKET IS ONE-CELL TRIGGER ONLY
CURTAIN WIDTH EQUALS ONE REEL
CURTAIN HEIGHT EQUALS FULL REEL
CURTAIN CLOSES FROM LEFT AND RIGHT
DUO SCENE USES ONLY BOMBO AND SKINNY
DUO SCENE FILLS FULL REEL WITH BACKGROUND
CURTAIN CLOSES AGAIN AFTER SHOWDOWN
FINAL REVEAL STAYS OPEN
FINAL REVEAL SHOWS ONE APPROVED CLOWN
MULTIPLIER REPLACES WILD LABEL
BIG TOP WAYS IS DYNAMIC
BONUS PLAYING CURTAINS PERSIST
NON-PLAYING PERSISTENT CURTAINS STAY CLOSED AND HIGHLIGHT
NO CURTAIN VORTEX OR RANDOM MOVEMENT
BONUS WALLET SETTLES ONCE AT END
POPUPS ARE GAME-CONTAINED
MOBILE REEL GEOMETRY IS STABLE
SWAMP SYMBOLS DO NOT CROP
UPSIDE PAWS CARD ART IS WORLD-SPECIFIC
NO RELEVANT CONSOLE ERRORS
EXISTING VAULT GAMES REGRESSION PASS
```

## Exact changed/created file manifest

`tools/vault-auth-check.py` already contained uncommitted diagnostic-fixture improvements before this task; these were preserved. Remaining task files:

- `.github/workflows/pages.yml`
- `BIG_TOP_FINAL_IMPLEMENTATION.md`
- `BIG_TOP_FINAL_TEST_REPORT.md`
- `CHANGELOG.md`
- `SUPABASE_SETUP.md`
- `assets/big-top/update-2026-10-22/stage-background.png`
- `assets/big-top/update-2026-10-22/winner-scenes.png`
- `big-top/assets.js`
- `big-top/config-v2.js`
- `big-top/config.js`
- `big-top/game.js`
- `big-top/model-v2.js`
- `big-top/model.js`
- `big-top/presentation.css`
- `big-top/screen.html`
- `index.html`
- `reports/big-top-v3-calibration-60000000.json`
- `reports/big-top-v3-calibration-70000000.json`
- `reports/bigtop-final-acceptance.json`
- `reports/bigtop-final-bonus.json`
- `reports/bigtop-final-buy-calibration.json`
- `reports/bigtop-final-model.json`
- `reports/bigtop-final-persistence.json`
- `reports/bigtop-final-regression.json`
- `reports/bigtop-final-sql.json`
- `reports/bigtop-final-unchanged.json`
- `reports/vault-update-2026-profiles.json`
- `requirements/big-top-final-2026-10-22/00_READ_FIRST/MASTER_IMPLEMENTATION_SPEC.txt`
- `requirements/big-top-final-2026-10-22/00_READ_FIRST/README_FIRST.txt`
- `requirements/big-top-final-2026-10-22/00_READ_FIRST/VISUAL_REFERENCE_POLICY.txt`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/APPROVED_BOMBO_SKINNY_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/BASELINE_PRODUCTION_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/BONUS_PERSISTENT_CURTAINS_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/CURRENT_IMPLEMENTATION_BEFORE_FIX.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/CURTAIN_COLUMN_FLOW_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/CURTAIN_SHOWDOWN_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/DEPRECATED_DO_NOT_USE_SPOTLIGHT_AS_TRIGGER.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/FULL_REEL_DUO_SCENE_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/01_AUTHORITATIVE_VISUALS/UNIVERSAL_VAULT_HUD_REFERENCE.webp`
- `requirements/big-top-final-2026-10-22/02_CURTAIN_AND_TICKET/CURTAIN_FLOW_QUICK_REFERENCE.txt`
- `requirements/big-top-final-2026-10-22/03_BONUS/PERSISTENT_CURTAINS_QUICK_REFERENCE.txt`
- `requirements/big-top-final-2026-10-22/04_SHARED_FIXES/SWAMP_FISHING_SYMBOL_FIT.txt`
- `requirements/big-top-final-2026-10-22/05_UPSIDE_PAWS/CARD_SYMBOL_MAPPING.txt`
- `requirements/big-top-final-2026-10-22/05_UPSIDE_PAWS/UPSIDE_PAWS_CARD_SYMBOLS_NORMAL.webp`
- `requirements/big-top-final-2026-10-22/05_UPSIDE_PAWS/UPSIDE_PAWS_CARD_SYMBOLS_UPSIDE.webp`
- `requirements/big-top-final-2026-10-22/06_TESTS/TEST_CASES.txt`
- `requirements/big-top-final-2026-10-22/90_LEGACY_BASELINE/BIG_TOP_WILDS_for_Codex_BASELINE.zip`
- `requirements/big-top-final-2026-10-22/MANIFEST.txt`
- `supabase_big_top_v3.txt`
- `tools/big-top-simulation.cjs`
- `tools/big-top-v2-calibrate.cjs`
- `tools/big-top-v2-importance-simulation.cjs`
- `tools/big-top-v2-stratified-simulation.cjs`
- `tools/big-top-v3-calibrate.cjs`
- `tools/bigtop-final-bonus-check.py`
- `tools/bigtop-final-model-tests.cjs`
- `tools/bigtop-final-persistence-check.py`
- `tools/bigtop-final-sql-tests.py`
- `tools/build-bigtop-v2-migration.py`
- `tools/build-bigtop-v3-migration.py`
- `tools/build-site.py`
- `tools/embed-vault.py`
- `tools/vault-update-2026-browser-check.py`
- `tools/vault-update-2026-model-tests.cjs`
- `tools/vault-update-2026-profiles-check.py`
- `tools/vault-update-2026-sql-tests.py`
- `vault/runtime.js`
