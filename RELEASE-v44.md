# Football Cascade v44

Cluster payouts now follow the paytable exactly. Small wins are no longer raised to 1x and large wins are no longer capped at 50x. Wild multipliers multiply without the previous 50x ceiling.

- Removed the hidden rare-session profile and the global six-Sticky-Wild restriction.
- Retuned fixed symbol-generation probabilities; outcomes do not depend on running winnings or balance.
- Preserved Sticky Wild bonus rules, Scatter progression, offline assets, Poker Duel and Bird Siege.
- Retained protections against duplicate payouts and nonterminating cascades.

Validation: 15 mathematical tests, JavaScript syntax check, offline browser checks, full Bonus/Super live-simulator parity and exact wallet payouts of 0.4x and 81.25x. All 23 embedded image occurrences and other-game source sections were preserved.

Simulation: 100,000 Bonus and 100,000 Super sessions, plus 200,000 base and 200,000 Scatter Boost spins; no guard hits or unfinished sessions. Observed RTP: base 95.84%, Bonus purchase 96.16%, Super purchase 95.47%, Scatter Boost 92.05%. These are sample estimates, not certified or guaranteed returns.

Open `index.html` directly to play. No dependency installation, build, CDN or server is required. Developer verification tools and detailed results are documented in [reports/README.md](reports/README.md).
