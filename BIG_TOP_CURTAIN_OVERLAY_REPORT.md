# BIG TOP — CurtainOverlay correction

Current request: `requirements/bigtop-curtain-overlay-fix.txt`. Implemented locally, not published. This request supersedes earlier instructions that idle persistent bonus curtains should close. Saved results now remain OPEN at all times between bonus steps; no repeated opening for active or idle saved results.

## Changes

- Clean trigger: `assets/big-top/update-2026-10-22/show-ticket.png`, an existing standalone transparent game asset with only ticket artwork/SHOW and no reference-board captions. Used directly, no regeneration or crop. The annotated `strict/SHOW_TICKET_REFERENCE.webp` is excluded from release HTML/preload.
- `big-top/curtain-overlay.js`:dedicated `CurtainOverlay` type, exposed as `VaultBigTopCurtainOverlay`. Explicit `curtainLeft`, `curtainRight`, `topValance`, `stageContent`, `bottomBadge` layers. Owning-reel absolute bounds and clipping unchanged.
- Both real velvet shutters move to center, open to the unchanged complete `strict/DUO_SCENE_BOMBO_SKINNY.webp`, close again and reopen to one approved final scene + exact badge. No final closed curtain.
- Real supplied `strict/OPEN_CURTAIN_FRAME.webp` supplies caps/side framing AND shutter fabric. Corner caps keep native proportions; SVG patterns repeat source fabric at ONE uniform scale instead of stretching a texture vertically. Resize/open refresh adjusts only pattern scale, not reel/grid dimensions.
- `strict/BOMBO_FINAL.png` / `strict/SKINNY_FINAL.png` remain the previously user-authorized native whole scenes. No new images were generated for this correction. Characters use contain fitting; existing mobile height and continuation background are retained per user instruction.
- Exact `strict/WILD.webp`,X2,X3,X5,X10 badge images; no substitute text plaque.
- Existing resolved Curtain DOM nodes are retained by feature id across draw/bonus spins; normal symbols animate beneath the saved overlay. Active stored results get a short light emphasis, idle stored results a gentle glow. Neither plays an opening/duel again.

## Persistent result data / financial safety

No second gameplay/wallet state or new SQL format was added. Existing canonical progress already persists `curtainId,reelIndex,winnerClownId,multiplier,persistent,bonusSessionId`. `CurtainOverlay.result()` and `VaultBigTop.getPersistentResults()` expose the requested names:

```text
reelIndex   <- stored reelIndex
winnerType  <- stored winnerClownId
rewardType  <- WILD if multiplier1, otherwise MULTIPLIER
rewardValue <- stored multiplier
isPersistent <- stored persistent
```

This adapter derives the same result after reload, using the existing owner/session checkpoint. Old `curtainStates` metadata is still canonical for server validation of previous plans; it is no longer interpreted as an instruction to CLOSE a saved result. Financial win/multiplier/participation values are unchanged.

`big-top/config.js`,all mathematical models,`vault/runtime.js`,wallet/bonus settlement/SQL,shared popup,Swamp/UP assets/styles were verified byte-identical to the published revision. Audit:`reports/bigtop-overlay-audit.json`. No new database update is required; the existing bundle still uses **mathVersion3**.

## Acceptance checks

- `tools/bigtop-overlay-check.py`:real Chromium + pinned SDK + isolated PostgreSQL. Clean ticket source inspection; explicit five layers; real uniform-scale fabric; staged closed/duo/final captures; unchanged whole duo; original plaque; one winner.
- Actual mixed bonus with winning AND idle saved Curtains:both remain OPEN,visible winner/plaque,unchanged stored id and SAME DOM node;no PERSISTENT_OPEN/closed replay events. Mid-animation reload preserves deterministic result;SQL/local wallet remain frozen until exactly one final credit/stat;second reload cannot duplicate it.
- `tools/bigtop-strict-browser-check.py`:main visual/math-contract regression, every2–6 rows at1440/430/390/320,exact five badge files,50 real paid feature spins,no DOM growth,stable reel/HUD frames,no neighbor overlap,dynamic Ways;full Swamp and UP art fit audits.
- Release JS and Python syntax;`git diff --check`;reference-ticket exclusion/source-byte verification passed. No relevant runtime/console errors.
- Physical iOS/Android hardware was not available. Mobile widths were exercised in Chromium/touch; live production Supabase was not changed during testing.

| Current acceptance criterion | Result |
|---|---|
| на барабане используется чистый отдельный ticket-symbol без поясняющего текста. | PASS |
| штора закрывается двумя створками; | PASS |
| раскрывается театрально; | PASS |
| внутри сначала показывается дуэтная сцена BOMBO + SKINNY; | PASS |
| потом показывается финальный победитель. | PASS |
| финальное состояние reel — это открытая сцена с победившим клоуном; | PASS |
| в сцене используется готовая плашка WILD или multiplier. | PASS |
| в бонусной игре curtain-results сохраняются; | PASS |
| curtain не теряется между spins; | PASS |
| curtain открывается только когда реально срабатывает feature; | PASS |
| если не срабатывает заново — просто сохраняется и при необходимости подсвечивается. | PASS |
| штора выглядит как в референсе по текстуре и стилю; | PASS |
| нет дешёвой вертикальной растяжки; | PASS |
| нет кривых вставок персонажей; | PASS |
| мобильная версия не ломает композицию. | PASS |

## Six requested screenshots

1. Clean base-game trigger: `/workspace/output/bigtop-overlay-01-ticket.png`
2. Closed two-panel curtain: `/workspace/output/bigtop-overlay-02-closed.png`
3. Open complete duo: `/workspace/output/bigtop-overlay-03-duo.png`
4. Final open winner + original plaque: `/workspace/output/bigtop-overlay-04-final.png`
5. Saved bonus results remain open between spins: `/workspace/output/bigtop-overlay-05-bonus-persisted.png`
6. Mobile whole-scene composition: `/workspace/output/bigtop-overlay-06-mobile.png`

## Files

Created:`big-top/curtain-overlay.js`,`tools/bigtop-overlay-check.py`,`requirements/bigtop-curtain-overlay-fix.txt`,`reports/bigtop-overlay.json`,`reports/bigtop-overlay-audit.json`,this report. Updated:`big-top/assets.js`,`big-top/game.js`,`big-top/screen.html`,`tools/embed-vault.py`,`tools/build-site.py`(v51),`index.html`,`CHANGELOG.md`. Existing textures/badges/duo/finals and financial configuration are unchanged. Build ready in `_site/`;not pushed/published.
