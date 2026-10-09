# VAULT BREAKERS

The existing internal game ID, DOM IDs, `birdState`, `pig`/`bird` body kinds, persistence keys, statistics keys and shared wallet remain unchanged. Only the display identity and rendering are replaced, plus the explicitly requested timing of bonus generation.

## Release-time cores

`BIRD_MODEL.plan()` prepares the seed, route parameters and structure but returns an empty `bonusSpawns` list. A held round also has no live core objects. On the first successful `run.launch()` call, `flightBonuses()` uses the round seed once and freezes the resulting flight plan. Repeated launch attempts cannot regenerate it. Actual launch direction/power is never passed to the generator; objects do not follow the player's trajectory. Rendering additionally excludes cores in the held state.

The RNG draws, distributions, physics and payout formula are unchanged from `d64b0a7`. `tools/breakers-math-compatibility.cjs` compares 3,000 seeded plans and 30 complete physical results against that version.

## Approved assets

Source: the uploaded `Vault_Breakers_CORE_for_Codex.zip`, including its README. Original WebP files are retained under `assets/breakers/`:

| Asset | Use |
|---|---|
| `units/player_projectile_sideview.webp` | Side-view Breaker, pointing right; small visual tilt independent of the unchanged physical body |
| `units/enemy_spherical_guard_front.webp` | Basic/heavy/gold/royal Sentinel; gold/royal presentation has an amber ring |
| `units/enemy_eye_guard_front.webp` | Sensor/helmet Sentinel |
| `structures/industrial_beam.webp` | Wood-equivalent horizontal industrial beam |
| `structures/support_column.webp` | Wood-equivalent vertical support |
| `structures/energy_container.webp` | Glass-equivalent energy panel/container |
| `structures/armored_block.webp` | Stone-equivalent reinforced panel |
| `bonuses/split_core_bonus.webp` | Split core |
| `bonuses/ricochet_sphere_bonus.webp` | Ricochet core |
| `bonuses/bomb_core_bonus.webp` | Bomb core |
| `branding/logo_vault_breakers.webp` | Compact game heading |

The supplied pack has no alternate armored guard or hangar background; none is fabricated. Existing Sentinel variants reuse the supplied guards. The launcher, skyline, cables, platform, remaining core symbols, damage overlays, bounded sparks and trails are procedural industrial graphics.

`bird/assets.js` centralizes preload and image metadata. Alpha-based crop rectangles remove padding without changing the original images. Units preserve aspect ratio; block textures preserve aspect ratio through cover cropping inside their unchanged rectangular collider. Sprite dimensions never determine collision shapes. All images decode once, have geometric technology fallbacks, and are embedded as data URIs by `tools/embed-vault.py`. The standalone HTML needs no asset server. High-DPI canvas scaling changes only raster resolution, not world coordinates, launch power or physical timestep.

Replaced visuals: bird face/body, green pigs, wooden slingshot/rubber bands, farm landscape, wooden/glass/stone flat fills, old bonus circles for the three supplied core types, green primary actions and Bird Siege display text. The existing lobby card receives only the new name and neutral technology symbols; the lobby layout and VAULT header are untouched.

## RTP measurement

Run `node tools/breakers-rtp.cjs 10000 2000 4`. It simulates 10,000 standard launches and 2,000 launches for each of three sensitivity policies using the actual production rigid-body engine at `DT=1/120`. Every launch is paid once, and payout comes from the completed scene. No payout fitting or target RTP is applied.

Outputs: `reports/breakers-rtp.json` and per-round `reports/breakers-rtp.csv`. Run `python3 tools/breakers-rtp-summary.py` afterward to validate the raw rows and add empirical bootstrap intervals, paired policy comparisons and `reports/breakers-rtp.md`. The report records the model hash, seed protocol, strategies, confidence intervals, profitable/positive-payout rates, high-return tail and route/size breakdowns. `RTP = sum(payout) / sum(bet) × 100`.

Policies: standard action-button launch, mixed drag strengths/angles, continuous left correction and continuous right correction. Because the player controls the launch and steering, these are policy-dependent Monte Carlo estimates rather than one universal theoretical RTP. Approximate 95% normal intervals may underestimate uncertainty in rare multiplier chains; this measurement is an audit, not final calibration. Probabilities and score settings remain in `bird/config.js`.

## Verification

```
python3 tools/embed-vault.py
python3 tools/build-site.py
node --check /tmp/digital-derby-release.js
node tools/bird-physics-tests.cjs
node tools/bird-round-tests.cjs
node tools/breakers-math-compatibility.cjs
python3 tools/bird-v2-isolation-check.py
python3 tools/bird-v2-browser-check.py
```

Browser checks use the real Supabase SDK with isolated API fixtures. They verify no cores before release, fixed positions afterward, all eleven assets, touch drag, full target framing, one debit/settlement, F5 without replay, five viewport widths and navigation. Additional visual checks cover missing assets, circular Sentinel colliders and higher-DPI rendering. Physics, payout, wallet/auth services and both other games are checked independently.

Before-change HTML: `/workspace/output/VAULT_before_breakers.html`. Revised standalone HTML: `/workspace/output/VAULT_BREAKERS.html`.

Measured standard-launch RTP on 10,000 actual rounds: **377.13%**. See [the full RTP report](reports/breakers-rtp.md) for strategy sensitivity and confidence intervals. These parameters have not been calibrated to a slot-like return.
