# BIG TOP — STRICT ASSET PACK

39/39 acceptance checks PASS (BT-01..29, SF-01..10). Status: implemented locally, NOT published.

Authority: `requirements/big-top-strict/00_READ_FIRST/MASTER_PROMPT.txt`, read first, followed by README/test file/manifest and every provided image. Actual LIGHT archive uses WebP and folders01_CURTAIN/02_CLOWNS/04_BADGES; the master mentions corresponding PNG/long-folder aliases. The actual provided WebP files are used unchanged. Missing05 reference collages were not invented.

## Direct supplied art — exact paths and rendering

| Asset | Production path | Use |
|---|---|---|
| frame | `assets/big-top/strict/OPEN_CURTAIN_FRAME.webp` | `frameArt()` real nine-slice frame around BOTH open states; `fabric()` masked velvet source viewports for left/right closing halves |
| duo | `assets/big-top/strict/DUO_SCENE_BOMBO_SKINNY.webp` | ONE complete `<img class="bigtop-duo-scene">` for the duel. Source-only non-character lighting/floor viewports extend stage background |
| identity | `assets/big-top/strict/APPROVED_CLOWN_IDENTITY_REFERENCE.webp` | Reference only, never displayed/preloaded as a stage (no third/fourth/fifth clown) |
| ticket | `assets/big-top/strict/SHOW_TICKET_REFERENCE.webp` | One normal `.bigtop-cell` image; never a curtain overlay |
| WILD | `assets/big-top/strict/WILD.webp` | x1 final plaque image |
| X2 | `assets/big-top/strict/X2.webp` | x2 final plaque image |
| X3 | `assets/big-top/strict/X3.webp` | x3 final plaque image |
| X5 | `assets/big-top/strict/X5.webp` | x5 final plaque image |
| X10 | `assets/big-top/strict/X10.webp` | x10 final plaque image |

All9 copied sources are byte-identical to archive. All8 actually rendered provided files are byte-identical again in `_site/assets/embedded/<sha256>.webp` and referenced by release HTML. Identity sheet is reference-only. Source URLs have correct image/webp MIME in standalone HTML; no PNG reinterpretation, re-encoding, recoloring or replacement. SHA256 evidence: `reports/bigtop-strict-assets.json`.

No replacement curtain, duo, ticket or badge was generated. No flat CSS velvet, CSS-drawn plaque, textual substitute badge or manually assembled clown cutouts remains in the feature. Nine-slice rendering uses viewports onto the SAME supplied frame image, keeping cap ornaments proportional while extending real side fabric; it does not create new artwork. Closing panels use clipped samples of that file's real velvet, as explicitly allowed by the master.

## Authorized missing final scenes

The archive contains NO standalone single-winner scenes and its approved clown family differs from the previous package. The user explicitly answered **«Подготовить только недостающие финальные сцены»**. Only these missing runtime scenes were prepared from the new approved identity/duo references:

- `assets/big-top/strict/BOMBO_FINAL.png` — one complete Bombo with stage. Retained generated original: `/workspace/generated_images/exec-079fa34b-4098-45f4-80e8-53bf572cf00d.png`.
- `assets/big-top/strict/SKINNY_FINAL.png` — one complete Skinny with stage. Retained original: `/workspace/generated_images/exec-ac66f72c-c054-4b43-a69d-7fca835617de.png`.

Both are native whole scenes, not manually assembled characters. All faces/bodies remain proportional; `object-fit:contain` retains the complete composition. No old orange-popcorn/suspenders clown or old unicycle scene is referenced in production feature assets. The identity sheet's three other characters are never rendered.

The user also explicitly selected **«Сохранить высоту и показывать сцену целиком с продолжением фона»** after seeing the aspect-ratio conflict between tall narrow mobile reels and the supplied scene. Accordingly existing fixed reel height is preserved; full proportional scene is centered, and unused vertical space is filled with real circus lighting/floor views from the supplied image. No stretching or face/body crop is used to force full-height character art.

## Behavior preserved

One-cell ticket → all reels settle → real textured halves close → direct supplied duo opens → short whole-scene light emphasis → halves close again → approved frame reopens with one winner and EXACT WILD/Xn plaque → remains open. Only transforms/opacity/light emphasis animate; no frame/grid layout dimensions animate.

Persistent Curtains stay assigned to the same bonus reel. Playing persistent Curtains reveal their stored winner and exact plaque; non-playing Curtains remain closed with glow only and no duo replay. Existing deterministic plan/checkpoint/one-terminal-credit implementation remains unchanged.

Math/config/RNG, wallet/runtime/auth, deferred bonus SQL, shared popup, Swamp assets/fit and UPSIDE PAWS source hashes are unchanged from the start of this task: `reports/bigtop-strict-unchanged.json`. NO additional database migration was created for this visual update. The already prepared v3 migration remains the requirement for the entire unpublished bundle.

## Executed checks

- `tools/bigtop-strict-browser-check.py`:actual Chromium/SDK/local PostgreSQL, real paid plans, every2–6 row state, all five exact badges, one complete supplied duo/no separate clown DOM, full-reel boundaries at1440/430/390/320, no neighboring overlap, exact wallet, dynamic Ways,50 feature rounds with no DOM growth/errors. Every Swamp symbol on desktop/390/320, base/bonus/highlight, complete Collector, unchanged Scatter, all Money Fish; also both UP card families.
- `tools/bigtop-strict-focused-check.py`:actual delayed DUO preload and Collector image request/decode; invariant frame/cell/HUD bounds; mobile430/390/320 direct-image source assertions, real supplied frame/fabric and proportional cap corners; second-close sequence and exact image plaque.
- `tools/bigtop-strict-persistence-check.py`:mixed playing/non-playing persistent states, full closed fabric/no winner/no duo for non-playing pulse; same-reel owner/winner/multiplier survives mid-animation F5; final one credit/stat; exact badge.
- `tools/bigtop-strict-profiles-check.py`:Quick/Turbo/Reduced complete semantic sequence, second close, exact same seeded payout; ordinary one-cell direct ticket at320. Normal sequence in main browser test.
- `tools/bigtop-final-bonus-check.py` rerun with strict art:purchase cancel/double YES/3Scatter trigger/no extra wager;local popup waits;intro/midbonus/summary/settled F5;frozen wallet;one final credit;active legacy versions1/2;all older routes,unique DOM IDs and no errors.
- Direct source-byte/release-byte/MIME audit;2880 Ways example; release JS syntax;Python test syntax;`git diff --check` passed.

Physical iOS Safari/Android devices and live production Supabase were not tested. Mobile checks use Chromium logical widths/touch.

## Acceptance matrix

| Case | Result | Evidence |
|---|---|---|
| BT-01 | PASS | 320 ticket fit/source audit + direct reference image inspection |
| BT-02 | PASS | 320 ticket fit/source audit + direct reference image inspection |
| BT-03 | PASS | all2–6 row geometry / actual frame+fabric source assertions / mobile cap proportions |
| BT-04 | PASS | all2–6 row geometry / actual frame+fabric source assertions / mobile cap proportions |
| BT-05 | PASS | all2–6 row geometry / actual frame+fabric source assertions / mobile cap proportions |
| BT-06 | PASS | all2–6 row geometry / actual frame+fabric source assertions / mobile cap proportions |
| BT-07 | PASS | one direct DUO img, no assembled clown DOM, source SHA audit + supplied identity inspection |
| BT-08 | PASS | one direct DUO img, no assembled clown DOM, source SHA audit + supplied identity inspection |
| BT-09 | PASS | one direct DUO img, no assembled clown DOM, source SHA audit + supplied identity inspection |
| BT-10 | PASS | one direct DUO img, no assembled clown DOM, source SHA audit + supplied identity inspection |
| BT-11 | PASS | Normal/Quick/Turbo/Reduced ordered trace + final one-clown/source inspection |
| BT-12 | PASS | Normal/Quick/Turbo/Reduced ordered trace + final one-clown/source inspection |
| BT-13 | PASS | Normal/Quick/Turbo/Reduced ordered trace + final one-clown/source inspection |
| BT-14 | PASS | Normal/Quick/Turbo/Reduced ordered trace + final one-clown/source inspection |
| BT-15 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-16 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-17 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-18 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-19 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-20 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-21 | PASS | all five exact source plaques at all widths / one badge per result / final OPEN state |
| BT-22 | PASS | mixed persistent state browser + actual bonus/reload/terminal wallet tests |
| BT-23 | PASS | mixed persistent state browser + actual bonus/reload/terminal wallet tests |
| BT-24 | PASS | mixed persistent state browser + actual bonus/reload/terminal wallet tests |
| BT-25 | PASS | mixed persistent state browser + actual bonus/reload/terminal wallet tests |
| BT-26 | PASS | actual state product,64/8640/46656 tests + current-spec2880 example |
| BT-27 | PASS | frame/HUD sampling,50-spin stress,strict source/geometry assertions,zero runtime/console errors |
| BT-28 | PASS | frame/HUD sampling,50-spin stress,strict source/geometry assertions,zero runtime/console errors |
| BT-29 | PASS | frame/HUD sampling,50-spin stress,strict source/geometry assertions,zero runtime/console errors |
| SF-01 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-02 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-03 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-04 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-05 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-06 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-07 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-08 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-09 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |
| SF-10 | PASS | every-symbol base/bonus/highlight browser audit + late Collector load/geometry |

## Screenshots

- Desktop first open: `/workspace/output/bigtop-strict-duo-desktop.png`
- Desktop final: `/workspace/output/bigtop-strict-final-1440.png`
- Mobile first open: `/workspace/output/bigtop-strict-duo-430.png`, `bigtop-strict-duo-390.png`, `bigtop-strict-duo-320.png`
- Mobile final: `/workspace/output/bigtop-strict-final-390.png`, `bigtop-strict-final-320.png`
- Non-playing persistent closed: `/workspace/output/bigtop-strict-closed-390.png`
- Direct ticket: `/workspace/output/bigtop-strict-ticket-320.png`
- Swamp: `/workspace/output/swamp-safe-fit-1440.png`, `swamp-safe-fit-390.png`, `swamp-safe-fit-320.png`

## Strict-update code/files

`big-top/assets.js`, `big-top/game.js`, `big-top/presentation.css`; correct WebP MIME in `tools/embed-vault.py`;build version50 in `tools/build-site.py`;regenerated`index.html`;`CHANGELOG.md`;`assets/big-top/strict/`;`requirements/big-top-strict/`;four strict browser check scripts and corresponding reports listed above. Earlier uncommitted model/SQL changes are preserved, not repeated/replaced by this asset task.

Build completed to `_site/`. This update has NOT been committed/pushed/published.
