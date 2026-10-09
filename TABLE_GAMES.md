# BLACKJACK and BACCARAT — adjacent VAULT tables

## Integration audit

- Lobby cards and filters: `LOBBY_GAMES` / `filterLobby` in `index.html`; featured Digital Derby stays unchanged.
- Navigation: existing body classes and shared header; new screens use the same shell and ALL GAMES action.
- Canonical balance: existing `state.balance` accessor / `VaultWalletService`; no per-table balance.
- Cards: existing `renderPlayingCard` from Poker Blitz; suits, faces and shadows are reused.
- Bets: existing `BETS` array; table indices default to 2.
- Business persistence: existing owner-bound `vault:v1:user:<id>` bucket and bounded RPC outbox. New IDs join the whitelist, not a second storage system.

## Source and presentation

`tables/rules.js`: pure, separately testable rules and Fisher–Yates shoes.
`tables/game.js`: independent Blackjack/Baccarat state machines and shared presentation adapter.
`tables/screens.html`: two screens with contextual actions and compact TABLE RULES.
`tables/presentation.css`: isolated table-specific placement.
`tools/embed-vault.py`: inherits the current Poker presentation stylesheet and approved `assets/poker-scene.webp`, then embeds both modules into standalone `index.html`.

Both tables reuse Poker's burgundy scene, dealer, Warm Ivory typography, card renderer, button treatment and bet selector. Card arrangement, actions and rules are game-specific. Lobby cards reuse the existing placeholder component; replace their `.art` content with local artwork when available. No external image URLs, new font or independent branding.

Original three games' code, DOM, embedded images and styles are unchanged; `tools/table-isolation-check.py` verifies this against release 53d28de. The source before this change is also retained at `/workspace/output/VAULT_before_table_games.html`.

## Rules

Blackjack: one freshly shuffled 52-card deck per hand; natural Blackjack 3:2 (100 returns 250), normal win 1:1, push returns stake, dealer stands on all 17s including soft 17. HIT / STAND / DOUBLE; double is allowed on the first two cards only, adds one original stake and draws exactly one card. No split, insurance, surrender or side bets. Dealer natural is checked immediately after the initial four-card deal. Config is centralized in `BLACKJACK_CONFIG`.

Baccarat: six freshly shuffled decks per round, Punto Banco. Player 1:1, Banker 0.95:1 after 5% commission, Tie 8:1. Ties push Player/Banker bets. Natural 8/9 prevents third cards; all Banker third-card combinations follow the standard matrix. Config is centralized in `BACCARAT_CONFIG`.

Returns include the original stake; result labels show profit. Fractional commission amounts are preserved to six decimal places and displayed without rounding to a whole credit.

## Wallet, cloud and F5

Flow: action → `VaultRoundService.begin` → one local debit/checkpoint → fast card animation → one payout through `VaultWalletService` → `VaultRoundService.finish` → existing idempotent cloud outbox.

DOUBLE adds stake through the same round service and preserves the hand's original UUID. The server atomically debits this additional stake with the final settlement, updates total wager and credits the return once. No wallet UPDATE grant is introduced. RNG/settlement remain client-authoritative demo logic, as before; this is not a server-authoritative real-money system.

An interrupted hand is cancelled without refund or replay. After F5, cards/animations reset to IDLE; wallet, selected bet, Baccarat selection, identity and last screen restore. DOUBLE's additional consumed stake survives this boundary. Retried settled UUIDs do not credit or count twice. Conflict recovery checks additional-stake funding; if the remote wallet cannot fund DOUBLE, it cancels that pending hand without issuing its proposed payout.

The existing mandatory sign-in policy is preserved. Attached generic guest-mode text does not override the earlier explicit requirement to require authorization.

New preferences extend `bets` inside the existing user bucket: `blackjack`, `baccarat`, `baccaratType`. One additional non-personal key, `vault:v1:table-schema`, caches `{version:1, project:<Supabase URL>}` after server capability confirmation; it enables already-configured tables during an offline reload. It contains no balance, identity or secrets.

Before the first new-table wager, the data layer probes `table_games_capabilities()`. An unconfigured database disables only the new tables' DEAL buttons; it does not debit money or poison the existing outbox. The next table opening retries automatically. Once configured, rounds never wait for an API before animating.

## Existing Supabase project: one setup step

1. Open https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new .
2. Open `supabase_table_games.sql`, copy the **entire** file into SQL Editor and click **Run**.
3. Expect `Success. No rows returned`. This migration can be repeated safely and preserves existing accounts/balances/history/RLS.
4. Open BLACKJACK or BACCARAT in VAULT again. Backend readiness is detected automatically.

For a brand-new database use the full updated `supabase_schema.sql` instead. No new frontend keys or authentication providers are needed. Frontend deployment cannot execute SQL in your Supabase project; live database installation is a separate step.

## Verification

- `node tools/table-rules-tests.cjs`: ace logic, naturals, payouts, full Banker third-card matrix, all nine Baccarat betting outcomes and shoe multiplicity.
- `python3 tools/table-browser-check.py`: actual Chromium and pinned Supabase SDK against the existing HTTP fixture; debits, naturals, S17, DOUBLE, losses, F5, sync, filters, five viewport sizes, DOM IDs and missing-migration guard.
- `python3 tools/table-conflict-check.py`: funded/offline and insufficient-funds DOUBLE replay without fabricated credit or a stuck queue.
- `python3 tools/table-sql-tests.py`: disposable PostgreSQL; repeat-safe migration, atomic additional stake, idempotent settlements, stats, interrupted rounds and RLS.
- Existing wallet/auth and original-game mathematics checks also run. Live Supabase credentials/email delivery are not exercised by the fixtures.

Build: `python3 tools/embed-vault.py`, `python3 tools/build-site.py`, `node --check /tmp/digital-derby-release.js`. Local guest entry/auth behavior remains unchanged. Published standalone frontend: https://kiryuhancev.github.io/777/ .
