> Обновление после ревью: облегчённая веб-сборка с кешируемыми изображениями, меньше layout-работы HUD, сон Bird вне игры и защита от устаревших ответов сессии. Подробности: [CODE_REVIEW.md](CODE_REVIEW.md). Математика и SQL сохранены; повторная миграция не нужна. Для размещения нужен весь `_site/`, включая изображения.

# VAULT release — 2026-10-20

## Included

- Shared BONUS purchase confirmation, consistent themed popups, mobile balance formatting, native full-cell Critter premium tiles.
- Critter: no cascades; one base result with ordinary x1 Wild; bonus persistent running Wilds, personal multiplier carry/doubling after the win, additive combination multipliers. Normal10/Super20 Free Spins. Explicit separate base/normal/super paytables in its existing paytable. Final mathematical constants and sampled confidence intervals are in `reports/critter-v5-rtp.json`.
- Swamp:15 spins per level, cumulative4/8/12 Collector qualifications, sequential x1/x2/x3/x10 levels. Intro/Level Up/Complete wait for player input. One77× purchase; purchased3Scatter presentation does not award another payout. Exact collect formula remains fish sum × Collector count × active tier multiplier. Constants and sampled confidence intervals: `reports/swamp-v4-rtp.json`.
- RNG plans are independent of animation and balance history. No outcome targeting. Critter symbol frequencies and movement rules unchanged by calibration. Swamp math calibration changes Collector frequency and line coefficients; base Scatter frequency stays≈1/158.
- Prior Critter1–4 checkpoints and Swamp1/2 bonus states finish under their frozen rules. New Critter rounds use version5; Swamp math4 uses bonus state3.
- Auth, canonical wallet and Universal HUD retained. No secret keys introduced.

## Database — required once

Frontend publication does **not** apply SQL to Supabase. This workspace has no production SQL access. Run **the whole `VAULT_RELEASE_SETUP.txt`**, once, in:

https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new

The file is one transaction, repeat-safe, with Critter5 validation, Swamp sequential levels and calibrated math4 validation. It requires the site's existing base schema/RPCs. Do not run only a selected fragment. On error, the transaction rolls back; provide the complete error rather than editing random lines.

Final capability results must include:

- Critter: `gameplayVersion:4`, `mathVersion:5`.
- Swamp: `bonusVersion:2`, `mathVersion:4`.

Then reload the site. New Critter/Swamp bets remain blocked if the backend is incompatible; no fabricated payout or stake is sent to an old validator. Other games keep their existing schema requirements.

## Verification

See `reports/`: isolated PostgreSQL validation/idempotency/RLS, actual Supabase SDK with owned HTTP fixtures, real Chromium render/mobile/F5 tests, auth/boot tests, all existing mathematical suites. These are not live production account tests. The CI Pages job additionally verifies the published HTML hash.

RTP is a Monte Carlo estimate, **not certification or an exact promise**. Confidence intervals and sample sizes are reported per mode. Calibration targets approximately96%; high volatility creates substantial sample variance.

## Publication

GitHub Pages: https://kiryuhancev.github.io/777/

Frontend deploy is handled by `.github/workflows/pages.yml`; Supabase migration is a separate operator step above.
