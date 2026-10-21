# Critical UI fixes — 2026-10-21

Presentation-only update for all five VAULT slots. Not published.

## Changes

- Stable reel geometry during animation; cached image decode before controls become ready.
- Removed Swamp whole-column shake. Inner symbol animation remains intact.
- Stable mobile account header: changing balance length cannot wrap the header and displace the reels.
- Derby measures its field after the screen is visible, avoiding a first-spin size jump.
- Critter Wild uses one ornamental plaque: WILD at x1, replaced by x2/x4/etc. at higher values. Text fits dynamically, including x128+. Upgrade affects only the plaque.
- Bonus gates remain absolute children of each reel viewport. Local backdrop, compact themed card, tap/Space acknowledgement, input arming and held-Space protection. Spin/Auto/Bet/Max/Bonus are locked while a gate is open.

## Assets

Added `assets/critter/latest/empty_label_plaque.png`: image-tool edit of the existing Wild plaque, with lettering removed so one dynamic gold label can replace it. Transparent background. No Swamp assets were changed; its Scatter remains intact.

## Verification

- `python tools/reel-stability-check.py`: real-speed mobile Chromium RAF geometry sampling, all five slots; bonus open/close, control locks, held Space, viewport-height changes; Wild labels through x512.
- `python tools/bonus-update-browser-check.py`: actual Supabase SDK against isolated PostgreSQL fixtures, five paid/natural bonus flows, reload/offline recovery, one final settlement/stat entry, responsive widths320–1440, duplicate IDs and console checks.
- `node tools/critter-ways-check.cjs`, `node tools/swamp-v4-tests.cjs`.
- Standalone build and JavaScript syntax check.
- Model/config/SQL/wallet runtime remain unchanged. Derby math sections and all Swamp artwork are byte-identical to the previous release.

WebKit installation was attempted both normally and with elevated network access; download servers return403 Domain forbidden. Actual iOS Safari and Android hardware have not been tested. Mobile Chromium emulation is covered.

No database migration or configuration change is required. No push/deployment performed.
