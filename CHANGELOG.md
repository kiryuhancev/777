# VAULT HEIST — vault scene and instruments

- Новый фон сейфа и отдельная прозрачная металлическая рама по общему визуальному референсу; крупные оригинальные символы сохранены без обрезки.
- Шесть этапов с иконками и фактический ALARM наверху; металлическая нижняя панель с круглой SPIN, настройками, помощью, ставкой, MAX, AUTO и BONUS.
- Проверены семь размеров экрана, реальные раунды и F5 без повторных списаний/выплат; консоль без ошибок. Математика, wallet/auth и остальные игры сохранены, SQL не требуется.
- Подробности: [HEIST_SCENE.md](HEIST_SCENE.md).

# VAULT HEIST — approved original symbols

- Все 15 отдельных WebP подключены из пользовательского архива напрямую: без обрезки, перекодирования и перерисовки.
- Прозрачные поля учтены только масштабом отображения; целые предметы, исходные пропорции и свечение сохранены в reels, paytable и loot pile.
- Оригиналы и эталоны сохранены в `assets/heist/approved-symbols/`, SHA-256 зафиксированы в manifest. Подробности: [HEIST_SYMBOLS.md](HEIST_SYMBOLS.md).
- Текущий фон, RNG, выплаты, бонусы, wallet/auth, БД и остальные игры сохранены. Для этой замены символов SQL не нужен.

# Slot controls, visible HEIST wins, bonus purchases and Scatter Boost

- HEIST: более медленные strip reels с последовательными остановками; яркие выигрышные ячейки и Ways, фактическая выплата/loot, пауза даже в FAST.
- Общая панель Settings / BET / AUTO / MAX / SPIN / BONUS, выбор числа автоспинов, две покупки HEIST и переключатель Scatter Boost.
- HEIST за 31.5× ставки; SUPER HEIST за 79×, 70× initial loot и половинный базовый Alarm Risk; решения игрока сохранены.
- Boost в HEIST и Swamp: ×1.5 цена платного спина, базовые выплаты, без доплаты в бонусах/покупках. Общий preference с существующим Digital Derby.
- Version-1 checkpoints совместимы; новые режимы фиксируют цену и mode в version 2. SQL RPC проверяет цены/повторы/режим и сохраняет данные.
- Обычная математика HEIST/Swamp и остальные шесть игр не изменены. Проверки и результаты симуляций: [SLOT_FEATURES.md](SLOT_FEATURES.md).
- Для новых функций выполнить целиком `supabase_slot_features.txt`. Обычные режимы работают с прежней БД.

# VAULT HEIST — six-stage Ways slot

- Новый premium heist slot 5×4 / Ways, 12 regular symbols, Master Key, Vault Seal и редкий Grand Take.
- Шесть различных модификаторов; COLLECT / GO DEEPER, настоящий Alarm Check и unbanked bonus loot.
- Один shared-wallet round, checkpoints до анимации, idempotent SQL RPC, RLS, cross-device conflict recovery.
- Новая карточка SLOTS без смены Featured; исходные семь игр сохранены.
- Полная конфигурация и симуляции 10k/100k по трём стратегиям, THRESHOLD simulator, Help/Paytable.
- Для включения игры выполнить целиком `supabase_heist.txt`. Подробности: [VAULT_HEIST.md](VAULT_HEIST.md).

# Swamp Fishing — approved symbols and bonus-only Collector progression

- Новые прозрачные Scatter (рыба влево, встроенная надпись) и Collector из предоставленного архива; отдельный портрет для шкалы.
- Только во Free Spins: 12 рыбаков в группах по четыре, цели ×2/×3/×10, текущий multiplier и оставшиеся FS.
- Последовательные перелёты копий Collector, подсветка порогов, reduced motion, мобильные три ряда; F5 восстанавливает checkpoint без повторной анимации/выплаты.
- После 12 портреты остаются заполненными; действующие последующие ретриггеры на ×10 сохранены.
- RNG, математика, выплаты, общий wallet/auth, SQL, lobby и другие игры побайтово не изменены. Обновление БД не требуется.
- Проверки и пути: [SWAMP_VISUAL_UPDATE.md](SWAMP_VISUAL_UPDATE.md).

# VAULT BREAKERS — industrial identity and release-time cores

- Bird Siege визуально превращён в VAULT BREAKERS с 11 утверждёнными WebP-ассетами архива.
- Breaker сбоку, круглые Sentinel, промышленные блоки, энергетические ядра, Launch Gate, индустриальный parallax и amber HUD.
- Ядра генерируются один раз только после выпуска модуля; до выпуска список пуст и ничего не отображается.
- Вероятности, collider/physics, damage и payout сохранены; сравнение 3 000 seed и 30 физических выплат с предыдущей версией проходит.
- Wallet/Auth/persistence, Digital Derby и Poker Blitz не изменены; в лобби только новое название/символы существующей карточки.
- Добавлены preload/fallback ассетов, High DPI, ограниченные trails/sparks и безопасный cleanup.
- RTP измеряется на реальных физических раундах для четырёх стратегий; полный JSON/CSV и описание методики доступны в reports/breakers-rtp.*.

# Bird Siege — seeded flight and physical destruction

- Один оплаченный запуск и одна итоговая выплата; три попытки и выплаты за каждую свинью удалены.
- Явный цикл состояний, длинный полёт с камерой и тремя слоями parallax, плавный подлёт и авто-сброс после результата.
- Неизменяемый seeded flight/building plan; бонусы не перемещаются на траекторию игрока. Нет заранее выбранной выплаты.
- 10 архетипов, 4 размера, Glass/Wood/Stone с собственными массой/HP/порогами; 9 физических/множительных бонусов.
- Сохранён rigid-body solver; разрушения, частичный урон и цепочки формируют destruction score, затем выплату.
- Общие Auth/wallet/Supabase сохранены; F5 прерывает бросок без возврата ставки и повторной выплаты.
- Проверены физика, seeded generation, idempotent settle, mobile drag, 5 размеров экрана, F5 и неизменность остальных игр.
- Подробности и config: BIRD_SIEGE_V2.md.

# VAULT — automatic wallet recovery

- Убрано требование вручную обновлять облачные данные; согласование revision/очереди выполняется автоматически после стабильного завершения раздачи.
- Незавершённые серверные раунды без локального checkpoint безопасно закрываются без возврата ставки/повторной выплаты.
- Загрузка профиля больше не перезаписывает актуальный кошелёк; поздние ответы защищены счётчиком изменений и epoch владельца.
- Быстрые раздачи продолжают выполняться локально без await Supabase перед игровыми анимациями.
- Проверены быстрые последовательные раздачи, offline/reconnect, смена revision, F5 с зависшим раундом, повтор RPC и отсутствие двойных выплат.

# Poker Blitz — table presentation

- Единый бордовый стол с реалистичным дилером и приглушённым lounge окружением; карты остаются текущими DOM-элементами.
- Убраны визуальные рамки/заголовки зон, HANDS перенесён наверх, рука игрока расположена ниже общих карт.
- Компактные ставка и контекстные действия, подробности раздачи в раскрывающемся блоке.
- Сохранены все игровые скрипты, рубашки, handlers/IDs, Auth/wallet/persistence и markup остальных игр.
- Проверены скрытая карта, выбор с клавиатуры, Flop/Turn/River/Showdown, FOLD, все четыре варианта тактического меню, HANDS и F5 на desktop/mobile. Фон не является условием работы игры.

# VAULT — portal identity

- Прозрачный портал + отдельный HTML-wordmark VAULT в шапке; квадратная подложка не используется.
- Единый знак и typography в Sign In / Create Account, новая компактная burgundy/ivory панель и CTA ENTER с состоянием ENTERING….
- Короткое меню профиля с выходом, доступное с клавиатуры; на мобильных сохраняются avatar/initials и баланс.
- Карточки лобби, внутренние стили игр, Supabase Auth/session/wallet методы сохранены.
- Проверены 1920×1080, 1440×900, 1366×768, 390×844, 360×800 и 320×640; тестовые login/register/logout/F5 и переходы трёх игр проходят без console errors.

# VAULT — auth entry and shared game shell

- Стартовый экран — обязательный вход/регистрация; до входа баланс, каталог, навигация и начало раунда закрыты.
- Восстановление доступа происходит через сохранённую SDK-сессию; отдельный local cache профиля сам по себе не открывает игры.
- Игры остаются внутри оформления VAULT с общей шапкой, кошельком, identity и возвратом к каталогу.
- Digital Derby: новый фон стадиона, объёмная рамка, логотип поверх верхней грани и компактный раскрывающийся справочник.
- Более частые движения корпуса/переноса веса футболистов; одинаковая высота, симметричные зоны и отсутствие пересечения с символами сохранены. Reduced motion учитывается.
- Новый browser check для закрытого входа, общей оболочки, F5 и адаптации 320–1440px.

# VAULT — persistence/auth foundation

- Добавлены изолированные VaultStorage, VaultAuth, VaultProfileService, VaultWalletService, VaultStatsService, VaultRoundService и VaultRecovery.
- Один существующий `state.balance` сохраняется между reload; ставки, звук/музыка, FAST и последняя игра восстанавливаются из явного whitelist.
- Для раундов введены UUID, started/settled/cancelled, защита от повторного debit/payout/logging, checkpoints бонуса и отмена незавершённых визуальных/физических этапов без возврата ставки.
- Добавлены компактные SIGN IN / CREATE ACCOUNT / SIGN OUT, identity/initials, boot state и sync status в лобби. Его бордово-кремовое оформление сохранено; название хаба приведено к VAULT.
- Supabase подключается через единый public config; guest работает без подключения. Auth session persistence, owner-bound cache, bounded outbox, retry и конфликты wallet revision подготовлены и проверены с SDK/HTTP fixtures.
- `supabase_schema.sql`: профиль, кошелёк, настройки, rounds/stats/achievements, trigger, RLS, ограниченные grants и идемпотентные RPC.
- `.gitlab-ci.yml` публикует готовый HTML без npm/backend/build; `SUPABASE_SETUP.md` описывает подключение и ограничения.
- Внутренние CSS игр, RNG и rigid-body solver не изменены. Добавлены только wallet/round/save hooks.

## BLACKJACK + BACCARAT

- Added two TABLE cards and full games inside the existing VAULT header/navigation; current featured game and existing games remain unchanged.
- Reused Poker Blitz scene, dealer, card renderer, typography, bet selector and ivory/burgundy buttons.
- Blackjack: natural 3:2, S17, HIT/STAND/DOUBLE; Baccarat: six-deck Punto Banco, official third-card matrix, Banker commission and tie pushes.
- Extended existing shared wallet/round/persistence registry; one UUID per hand, one settle, safe interrupted-hand recovery, fractional balances and automatic schema-readiness guard.
- Added repeat-safe `supabase_table_games.sql` for the existing database and focused math/browser/PostgreSQL/RLS tests.

## Authorization feedback and retry

- Failed sign-in no longer clears the entered password; it clears only after success or closing the dialog.
- Authentication errors are visible above ENTER and distinguish invalid credentials, unconfirmed email, rate limits and connection/service failures.
- A failed initial Supabase SDK load can retry on the next submit without a page reload.
- An initialization fallback prevents native form navigation; auth failure and retry paths are covered in desktop/mobile browser tests.
- No database migration, wallet change or gameplay change is required.
- Embedded the same pinned Supabase JS SDK in the standalone HTML so a blocked CDN cannot prevent auth initialization; verified sign-in with CDN requests blocked.

## Swamp collect-slot (working title)

- Added an isolated 5×3, ten-line swamp slot using the supplied WebP pack; prepared 18 alpha sprites, separate 16:9 lobby art and a weathered wood material strip.
- Added Money Fish, Scatter FS, multiple Collector Wild collections, cumulative four-Collector retriggers and x1/x2/x3/x10 progression with next-spin upgrades; overall max win is configurable.
- Added night bonus lighting, anticipation, reel strips, short collect trails, bounded fireflies/fog, procedural low ambience and responsive shared-style controls.
- Extended the existing wallet/UUID/persistence adapter with stable bonus checkpoints and stale-device free-spin rejection; no independent wallet or authentication redesign.
- Added repeat-safe database activation as both `supabase_swamp_slot.sql` and `.txt`, pure math/simulation, browser and PostgreSQL/RLS checks. Five-million-paid-spin validation measured 97.0776% (approximate 95% interval 95.7487%–98.4066%).
- Existing five games, their art/styles/logic and the lobby/auth design are unchanged; original frontend retained separately. See `SWAMP_SLOT.md`.

## MINES · VAULT Extraction Grid

- Added independent `mines` ARCADE card and 5×5 extraction screen; existing featured game, six games, art and lobby/auth design stay unchanged.
- Fixed pre-generated seeded boards, 1–24 mines, shared bet controls, 3% probability-based house edge, once-only cashout/bust and configurable 50,000× automatic cashout cap.
- Resumable owned business checkpoint preserves exact board/opened cells/stake after F5 and across devices; no mid-animation restoration or duplicate payout. Offline outbox uses existing namespaces and queue limit.
- Extended current SQL RPC registry with owned prefix checkpoints, mathematical payout validation and repeat-safe `supabase_mines.txt`; existing wallet/auth/RLS model retained.
- Fixed empty-active-round sync promise cleanup so subsequent safe-pick events cannot stall behind an already-completed flush.
- Added simulation (six strategies × 1,000,000 paid rounds), nine mathematical suites, PostgreSQL/RLS tests, Chromium reload/offline/conflict/mobile tests and strict six-game source isolation.

## Swamp controls, bonus frequency and VAULT administration

- Swamp bottom toolbar now follows Digital Derby: AUTO selection 10/25/50/100/∞ with STOP, MAX, settings and a priced BONUS shop. Mobile uses a fixed safe-area toolbar.
- Normal no-anticipation spin is ~1.14s, FAST ~0.445s. Timing never changes RNG.
- Scatter chance per reel 7.5% → 9% gives exact mean bonus spacing 266.07 → 157.70 paid spins. Line scale 1.34 → 0.97 keeps sampled total return near target: 96.3046% over 5m paid cycles, approximate 95% interval 94.5826–98.0266%. No forced trigger after a drought.
- Purchases: 10 FS at 77×, 20 FS at 350×; paid/owner-bound entitlement persists before animation and cannot duplicate on reload/retry. Pricing simulation is separate from paid base-cycle RTP.
- Server-protected admin panel for confirmed `al.kiryuhancev@yandex.ru`: search, credit/debit/set balance, pause/resume fresh bets, last sign-ins/heartbeat, rounds and audit reasons. RLS, role checks, request UUIDs, wallet locks and revision protect critical operations.
- Accepted rounds/earned FS remain finishable when new bets are blocked. Pending unaccepted stakes recover automatically. Private admin UI clears on identity change.
- One complete `supabase_admin_swamp.txt` enables this update and includes pending MINES registration without resetting user data. Other six games, their art and lobby/auth design are unchanged.
