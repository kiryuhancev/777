# VAULT — 2026-10-22 update

This update implements `requirements/2026-10-22/00_READ_FIRST/MASTER_UPDATE_SPEC.txt`. Its written requirements supersede old conflicting Curtain visuals. All archive files, including baseline requirements and references, are preserved under `requirements/2026-10-22/`.

## BIG TOP WILDS

Route remains `big_top`. Six fixed-width reels, independently2–6 rows; viewport height stays480px desktop /360px mobile /320px small mobile. Existing Universal HUD/control semantics remain unchanged.

- SHOW TICKET is a non-paying, non-substituting one-cell trigger. No Spotlight trigger is added. A ticket does not become a tall curtain image.
- A separate full-column stage is created only after **all** ordinary reels settle. Feature order is deterministic, left to right.
- Focus220ms, left/right curtain close400ms, closed hold160ms, opening300ms. Approved BOMBO/SKINNY enter from opposite vertical zones and perform an860ms comic reveal followed by140ms uniform winner expansion in Normal. Quick70%, Turbo40%; Reduced Motion uses short semantic stages.
- Each stage is absolute and clipped to its own reel. It never resizes the grid/HUD or paints into a neighbor. Final state is OPEN, with exactly one winning approved character. A portrait viewport of the same approved sprite recomposes the final winner without stretching; full silhouettes are used in the duel.
- One decorative plaque says WILD for x1, otherwise x2/x3/x5/x10. No second badge or black label.
- `bigTopWays` displays the exact product of engine `reelHeights`, independent of DOM sizes.64,8640 and46656 cases are covered.

### Authorized mathematics change

The prior implementation had both single-cell and full-reel outcomes. The new package requires every ticket to create a genuine full-reel Wild. The user explicitly authorized this change and recalibration toward96% RTP.

`big-top/config-v1.js` and `model-v1.js` preserve the exact shipped v1 rules. New rounds use `config.js` / `model.js`, version2. Restored v1 rounds validate and settle with their original plan, cost and payout.

The v1 seeded sampler still determines initial ordinary symbols, row counts and feature events. For a new v2 round, all events on the same reel collapse deterministically to the first predetermined event; the remaining RNG draws are still consumed. A ticket appears in that event's cell. Base feature-reel frequency, row distribution and initial Scatter distribution match v1 for the same seed. Trigger frequency is **not** increased for new artwork. Scatter entitlement is counted independently from the initially landed tent symbols, even if a later full-reel stage visually covers them. Maxone Scatter per column and3/4/5/6→10/12/15/20FS remain.

Every resolved v2 feature covers all visible cells of its reel. The left-to-right evaluator is unchanged except its authorized payout scale; a multiplier is applied once per chosen reel/way. Different participating reels multiply. Encore lasts exactly one extra spin as before, now carrying a full-reel state; new full-reel arrivals add3Applause, carried Encore adds0. Threshold12/next-spin guarantee remain explicit in plans.

New payout scale: `0.11025308`. New buy price: `244×` current bet. Cap remains10,000×. Initial5,000,000-round calibration targets96%; the100,000 purchased-bonus calibration sample has mean234.0059×, equivalent to≈95.90% at244× price.

**Statistical limits:** these are high-volatility Monte Carlo estimates, not a certified theoretical RTP. Calibration95% interval≈90.13–101.87%. Independent2,000,000-seed validation estimated102.73% with95% interval92.69–112.76%, which includes the target. An additional1,000,000-round importance-sampling diagnostic estimated106.26%, interval93.48–119.04%; it did not improve overall precision because rare base-game high wins still dominate variance. These results do **not** establish that the true RTP is exactly96%. No reference to a guaranteed/certified96% is added to player UI. See the raw reports for reproducibility; the diagnostic changes proposal sampling only in its own offline process, never production config/RNG.

### Implementation paths

- `big-top/config.js`: current math version, payout scale/buy price; v1 config supplies unchanged row weights and trigger probabilities.
- `big-top/model.js`: v2 full-reel plan and single final Ways result; `curtainTriggers` explicitly records reel, trigger cell, winner and result before animation.
- `big-top/game.js`: consumes plans; curtain stage lifecycle and current Ways. No result selection in animation.
- `big-top/assets.js`: approved sprite URLs and aspect-preserving viewports.
- `big-top/presentation.css`: reel-contained red curtain halves, open stage, character/plaque profiles.
- `big-top/validate-v2.sql`, `supabase_big_top_v2.txt`: independent SQL geometry/transformation/payout validation and version-dispatched settlement.
- `tools/build-bigtop-v2-migration.py`: produces the single complete TXT migration from preserved v1 definitions plus the new validator and current config.

## Swamp Fishing

No RNG, model, weights, paytable, purchase price or payout changes.

The old400px Collector sprite had already cropped the fishing rod/important props. It now uses the complete provided original `assets/swamp/updated_symbols/collector_fisherman_updated.png`. Existing Scatter artwork is preserved. Other source symbols keep their identity.

All production settled/analog-strip cell images use proportional contain inside a90% safe box. Money Fish reserve extra lower space for their dynamic amount. Scatter pulse is applied to its safe inner art, not the cell's outer box. Values remain readable and bounded. The bonus progression strip keeps all12 markers in a compact mobile row and reserves its geometry even while hidden so its appearance does not shift the reels.

The complete audit includes all base/premium symbols, four Money Fish variants, Scatter and Collector at1440/390/320px, base/bonus/highlight states, native analog strips and delayed decoding.

## UPSIDE PAWS

No math or mechanics changes. `upside-paws/assets.js` now maps the two approved card-world sheets through `assets/upside-paws/update-2026-10-22/card-pairs.png`:

Normal10/J/Q/K/A: bright blue/green/purple/gold/red pet accessories. Upside10/J/Q/K/A: same ranks/colors with cracks/rift energy. World selection is deterministic. Each atlas region uses nested clipped SVG viewports and uniform scaling; no sheet titles/checkerboards enter the cells.

## References and assets

- Character identity: `requirements/2026-10-22/06_REFERENCES/BIG_TOP_APPROVED_BOMBO_SKINNY_source.webp`.
- Generated production isolation: `assets/big-top/update-2026-10-22/approved-clowns.png`; only BOMBO/SKINNY, faithful to the approved source. Intermediate red/blue mockup clowns are not used.
- SHOW appearance: approved ticket crop; production `assets/big-top/update-2026-10-22/show-ticket.png`.
- Cards: both approved Normal/Upside rank sheets; production atlas path above.
- Original references and generated source images are preserved; no source boards are inserted as a ready-made interface.

## Wallet, persistence and popup safeguards

Existing canonical wallet, revisioned outbox, owner-specific local cache and shared bonus escrow are reused. No new wallet, secret or independent animation credit exists.

A paid action queues one round debit; after base presentation, one base credit event. Bonus progress stores stable next-spin/Encore/meter/total checkpoints. Free-spin wins accumulate in escrow; only the terminal Bonus Complete transition creates the one existing bonus settlement event. SQL uses `auth.uid()`, row locks, duplicate round identities and terminal progress checks. New v2 validation is server-side; v1 validation is retained privately for old snapshots.

Popup host remains `#bigTopReels`; existing shared local backdrop/controls lock/Space/tap safeguards are unchanged. Swamp and UPSIDE PAWS retain their own reel-contained hosts.

## Supabase setup

Apply **all of `supabase_big_top_v2.txt`**, from `begin` to `commit`, in the current Supabase project's SQL Editor. Prerequisites are the previously delivered BIG TOP and UPSIDE PAWS setup. Do not rerun an older migration afterward, since old `create or replace` definitions can downgrade dispatch.

Verify:

```sql
select public.big_top_capabilities();
```

Expected: `version:1`, **`mathVersion:2`**, `roundVersions:[1,2]`. `version:1` alone is not proof of this update.

The migration changes no existing user balances. The frontend requires mathVersion2 before starting new rounds; offline support caches the upgraded schema version. No production migration was executed during development.

## Validation and delivery

See `VAULT_UPDATE_2026_10_22_TEST_REPORT.md` for all120 current acceptance cases and evidence. Physical iOS Safari/Android device checks in the inherited baseline remain explicitly unverified; Chromium desktop/touch widths were exercised.

Build: `python tools/embed-vault.py`, `python tools/build-site.py`; syntax: `node --check /tmp/digital-derby-release.js`. Versionv48. Publish the complete `_site/` only when requested. This update is not published.

## Independent split RTP cross-check

Separate likelihood-corrected base and bonus estimators (500,000 rounds each) give total RTP **98.76%**, approximate 95% confidence interval **96.23–101.28%** at the delivered scale. This improves precision over ordinary Monte Carlo; it does not certify an exact theoretical96%. The independent five-million-round calibration targets96%; rare capped bonus tails still dominate uncertainty. Production RNG/weights were not changed by the offline estimator. Evidence: `reports/big-top-v2-stratified-combined.json`.
