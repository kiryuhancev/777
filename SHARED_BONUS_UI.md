> Release update2026-10-20: subsequent calibration and deployment instructions are in [RELEASE_NOTES.md](RELEASE_NOTES.md). The original implementation/test notes below are historical; use VAULT_RELEASE_SETUP.txt for the current database migration.

# Shared bonus UI and Critter square tiles

Presentation-only update. Existing wager/purchase handlers and prices, RNG, paytables, wallet/settlement unchanged.

`slot-hud/hud.js` owns the feature-dialog adapter, themed YES/NO purchase gate, read-only BalanceDisplay and formatter. Paid selections close the feature shop and require YES; all cancellations are free. YES synchronously locks, rechecks identity/current game/bet/price/affordability, then invokes the original handler once. Boost toggles use original handlers without extra confirmation and close the shop with a toast. MAGNET has no purchase offer; no new offer or game rule was invented.

Mobile formatter budgets9 numeric digits, gives integers priority, recalculates decimals on rounding carry; desktop defaults to4 decimals maximum. The renderer first shrinks overlong values then uses compact units if needed. Full original display is in title and HUD balance details. Only text/DOM changes; no rounded value is written to the wallet.

Critter premium art was rebuilt as native square tiles in `assets/critter/premium-tiles.png` (1536×1024,3×2 exact512px cells). Source references are retained. Cat/pigeon/possum/bulldog/Wild/Scatter use proportional square viewBoxes and100% cell size. Card symbols use their original atlas and uniform98% fit. No portrait is stretched to fill a square.

Checks: `tools/shared-bonus-check.py` (four shop adapters, cancel/ESC, boost closure, actual once-only Critter purchase,9-digit examples/carry,320–1440px, no wallet change), updated Critter v4 browser suite (full bonuses and mid-hop F5), rebuilt HTML syntax. Chromium with actual SDK/owned HTTP fixtures, not live Supabase.

Critter v4's previously reported RTP blocker remains unresolved; this UI change does not calibrate its math. No production deployment performed.
