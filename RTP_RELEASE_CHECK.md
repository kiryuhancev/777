# Mathematical release check

Target: approximately96%. These are Monte Carlo estimates with approximate95% confidence intervals, not exact/certified RTP. No outcome targeting; configuration is fixed before gameplay.

| Game / mode | Sampled RTP | Approx95% interval |
|---|---:|---:|
| Critter5 / baseRtp | 96.09% | 95.13–97.04% |
| Critter5 / boostRtp | 95.95% | 94.74–97.16% |
| Critter5 / bonusRtp | 96.78% | 94.42–99.13% |
| Critter5 / superRtp | 95.32% | 93.62–97.02% |
| Swamp4 / baseRtp | 95.30% | 94.68–95.92% |
| Swamp4 / boostRtp | 95.57% | 94.88–96.25% |
| Swamp4 / buyRtp | 95.00% | 94.05–95.94% |

Critter:300,000 normal +300,000 Super fitting features; separate100,000 normal +100,000 Super holdout features and1,000,000 base +1,000,000 Boost base fields. First holdout retained in `reports/critter-v5-rtp-first-holdout.json`. Full500,000 ordinary +500,000 Boost paid-cycle cross-check in `reports/critter-v5-paid-cycles.json`; natural Super tails produce much wider intervals.

Swamp:150,000 fitting features; separate150,000 complete holdout features and750,000 base +750,000 Boost fields. Additional500,000 ordinary +500,000 Boost real paid cycles, including actual naturally triggered bonuses. JSON contains their wider confidence intervals.

Mode tables are visible in Critter paytable. Swamp collection remains the literal visible fish sum × Collector count × tier multiplier. Changing the timing of an animation cannot change a grid, destination or payout.

The tests establish deterministic plans, exact JS/SQL agreement, legacy recovery and duplicate protection. They do not make the existing client-authoritative demo a server-authoritative casino. Production DB migration is separate: `VAULT_RELEASE_SETUP.txt`.
