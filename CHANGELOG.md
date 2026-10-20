# Release2026-10-20 — shared UI, Critter and Swamp

- Completed the accumulated UI/gameplay changes and versioned mathematical calibration targeting≈96%.
- Added one transaction/repeat-safe `VAULT_RELEASE_SETUP.txt` for production schema alignment; production SQL is not executed by Pages.
- Frozen legacy models preserve already-settled rounds and bonus recovery. Current paytables are explicit; collect values remain literal.
- Verification, statistical uncertainty and setup: `RELEASE_NOTES.md`. Earlier entries below describe historical review snapshots.

# Swamp Fishing —15-spins sequential levels

- One bonus from3+ Scatter; Intro/Level Up/Complete wait for Space/tap. Purchased entry uses shared confirmation and non-paying3Scatter analog presentation, with one77× debit.
- Levels play15 spins each at×1/×2/×3/×10; cumulative4/8/12 Collectors qualify future levels without immediate upgrade. Milestone icons and active multiplier separated.
- Stable phase checkpoints, old bonus compatibility, full TXT migration with narrow Swamp-only SQL guards. Model, four-level browser/F5 and duplicate-settlement SQL checks passed.
- **Not deployed:** new rules with existing coefficients estimate204.35% RTP (base) and287.26% (buy). Separate calibration required. Details:`SWAMP_LEVELS.md`.

# Shared BONUS / balance and Critter tiles

- Shared themed YES/NO gate, one-shot purchase dispatch, boost popup close/toast. Existing costs and financial handlers retained.
- Read-only9-digit mobile balance and compact fallback; native square Critter premium tiles with proportional art.
- Four-slot shop checks and Critter F5/browser checks passed. Details:`SHARED_BONUS_UI.md`.

# Critter Chaos v4 — одна сыгровка за спин

- Каскады полностью удалены из новой механики; base Wild стандартныйx1, без движения и сохранения.
- Bonus Wilds сохраняют ID/позицию/личный множитель, бегут до единственного расчёта Free Spin. В комбинации множители складываются; после выплаты участвующие Wild удваиваются для следующих спинов.
- Стабильные owner-scoped checkpoints восстанавливают оставшиеся Free Spins и Wild state без reroll/дублирования settlement. Финансовый протокол, Universal HUD и другие игры сохранены.
- Старые1/2/3 checkpoints поддерживаются; новая схема gameplayVersion4, полный TXT. Проверки: модель/изолированная SQL/реальный renderer+SDK fixtures/mobile/F5/auth/HUD.
- **Не опубликовано:** прежние коэффициенты с новыми правилами не сохраняют RTP. Симуляция показала17.78% в base и0.323% для обычной покупки по прежней цене. Нужна отдельная калибровка/решение по математике. Подробности:`CRITTER_NO_CASCADE.md`.

# Critter Chaos — визуал, Running Wild и Buy Features

- Исправлены деформированные SVG: xMidYMid meet, равномерный max-fit; исходные изображения сохранены.
- Wild полноценно бегают в бонусе, сохраняют новые позиции между спинами и удваиваются по прежнему каскадному правилу. Параллельные bonus jumps ждут одного animation barrier; закреплённые Wild не выпадают заново перед следующим спином.
- BONUS popup в общем HUD: Chance Boost (3× за SPIN), BONUS BUY (50×,10 спинов), SUPER BUY (500×,20 спинов). Цены зависят от ставки, изменяются сразу; подтверждение/Cancel и проверка полной стоимости.
- Boost: Scatter1.6%→2.4% на базовый draw; постоянный индикатор, отдельная настройка Critter сохраняется без переключения других слотов, бонусная RNG не усиливается и на покупку доплата не складывается.
- v1/v2 checkpoints сохранены; новый cost-aware v3 валидатор RPC, прежняя атомарная запись wallet/statistics. Features schema добавляется без отключения старого v2 клиента. Инструкция: `CRITTER_FEATURES.md`.

# Диагностика зависания запуска VAULT

- Ранний независимый startup guard: вместо вечного экрана VAULT после30 секунд появляется безопасное окно повторной загрузки с этапом запуска и кодом ошибки.
- Сохранения, сессия, wallet и readiness не изменяются; позднее успешное завершение boot автоматически закрывает окно. Повторная загрузка использует новый cache query без очистки localStorage.
- Проверены нормальный старт, зависший init, JS crash, позднее восстановление, mobile и существующая auth/session/outbox suite. Исходная причина конкретного зависания на production пока не установлена; прямой доступ к Pages из среды ограничен прокси.

# Critter Chaos v2

- 3 Scatter →10 бонусных спинов,4+ → SUPER20. Wild закрепляются и накапливаются, без внутренних уровней.
- Каждый Wild начинает x1 и удваивается после участия в выигрыше; новый спин сбрасывает множитель, сохраняя бонусные позиции.
- Крупные full-cell символы, тонкие borders, glow/pulse по symbol art, dim невыигравших, читаемые mobile badges.
- По отдельному согласованию изменён коэффициент выплат для RTP около96%; PRNG, веса и raw paytable прежние. Подробный расчёт и ограничения — `CRITTER_UPDATE.md`.
- Заморожена v1 recovery-модель. RPC поддерживает обе версии, денежные операции прежние. Перед выпуском выполнить полный `supabase_critter_v2.txt`.

# Медленнее NORMAL и физические ленты Swamp

- NORMAL: длительность остановки фиксированного поля увеличена на41–46%; последовательные остановки и паузы перед выигрышем.
- Swamp: непрерывные вертикальные ленты с ускорением, равномерным ходом, торможением и точным выравниванием рассчитанных символов. QUICK/TURBO, Reduced Motion, Scatter anticipation и Free Spins используют тот же renderer.
- Подсветка, collect и существующий BIG WIN ждут все остановки. F5 восстанавливает визуальное поле по seed уже сохранённого раунда, без повторной выплаты.
- Общий HUD, RNG, модели, финансовые операции и другие игры сохранены. Новая ветка от672dd07; SQL не нужен. Проверки и предпросмотры: `SWAMP_ANALOG_REELS.md`.

# Плавность выпадения символов

- Падение без повторного запуска easing внутри траектории; увеличены длительности, уменьшены bounce и убраны короткие shake/squash. Дистанция входа зависит от фактического ряда.
- Устранён конфликт CSS transition с WAAPI, особенно в MAGNET: анимация использует конечную позицию клетки и не прыгает при завершении.
- Убраны служебные WAAPI-анимации на каждую посадку. Hooks остаются однократными, progression по-прежнему ждёт animation.finished.
- HUD получает компактный read-only state вместо регулярного structuredClone полного раунда. Математика/финансовые операции сохранены.

# Symbol Drop Animation System

- Общий promise-based animation engine: Classic, Premium Smooth, Impact, NORMAL/QUICK/TURBO, sequential/staggered, reduced motion, landing overrides, Scatter suspense и audio hooks без SFX в core.
- Пять слотов подключены к рассчитанным полям; gravity/refill Derby, refill Critter и Respin MAGNET ожидают animation.finished. Финансовые операции, RNG и модели сохранены.
- Проверены фиксированные результаты/баланс всех5 игр, hooks, double click, F5, AUTO/STOP, бонус Critter и Respin MAGNET. Отдельная ветка, резервный HTML и интерактивный предпросмотр. Подробнее: `SYMBOL_DROP.md`.

# Universal Slot HUD

- Единый модуль для Digital Derby, Swamp Fishing, VAULT Heist, MAGNET и Critter Chaos: одинаковый control order, верхняя панель, settings/auto/bet/info окна и mobile layout. Пять скинов на CSS variables.
- Исходные обработчики SPIN/ставок/MAX/bonus purchase сохранены. BONUS скрыт у MAGNET/Critter, где покупки нет. Общий wallet и settings; дополнительная локальная preference Reduced Motion.
- Математика, RNG, выплаты, settlement/auth и table games не изменены; полное совпадение прежнего embedded source после исключения только двух новых HUD-блоков. Ветка и резервная предыдущая версия сохранены. Подробнее: `SLOT_HUD.md`.

# Critter Chaos — подключение после обновления БД

- Проверка функций различает отсутствующую миграцию, недостаточные права и сбой сети. Временные сбои повторяются до3 попыток; повтор подключения доступен без F5, при возвращении сети запускается автоматически.
- Миграция явно обновляет PostgREST schema cache. `critter_db_check.txt` проверяет наличие обеих RPC, права authenticated и ограничения game_id без изменения пользовательских данных.
- Проверены HTTP503/404/403 и восстановление подключения без списания, повторная SQL-миграция и однократное сохранение раундов.

# Устойчивость входа при сетевых сбоях

- Auth-запросы ожидают ответ до20 секунд вместо общего лимита8 секунд. Вход автоматически повторяется один раз при обрыве соединения или HTTP502/503/504.
- Неверный пароль, неподтверждённый email и rate limit не повторяются. Регистрация и денежные RPC не получают автоматических повторов. Сигнал отмены SDK сохраняется.
- Проверки реальным Supabase SDK через HTTP fixture: ответ за9 секунд, разовый обрыв, временный503, сохранение полей при ошибке и восстановление сессии после F5. Проверка live Supabase из облачной среды ограничена HTTP-прокси.

# Critter Chaos — новый неоновый cluster slot

- Новая самостоятельная игра5×5 из приложенного light ZIP: все8 исходных символов, оригинальные енот-WILD и мусорный SCATTER, отдельный neon-alley background и карточка SLOTS.
- Кластеры5+, каскады и Running Wild: выигравший енот после refill последовательно перебегает в случайную обычную клетку. 3+ Scatter → полноценный короткий Dumpster Dash с cash, Wild drop и множителем.
- Общий personal wallet, одно атомарное settle на весь paid round/бонус, safe F5, bounded offline outbox, automatic revision rebase. Дополнительный `supabase_critter.txt`, без сброса данных.
- 100k paid cycles: sampled RTP96.4994%, bonus.84% (~1/119), hit26.524%. Проверены чистая модель, PostgreSQL/RLS, Chromium normal/FAST/F5/два устройства/мобильные размеры. Подробности: [CRITTER_CHAOS.md](CRITTER_CHAOS.md).
- Девять существующих игр, Featured, auth, MAGNET bridge и канонические денежные методы сохранены.

# MAGNET v2 — WHEEL + MAGNET CHAMBER

- Новый source of truth: light ZIP с updated prompt. Обычная игра больше не запускает постоянные магнитные цепочки; отдельный WHEEL с шестью эффектами, новые оригинальные Wheel/Scatter.
- 3+ Scatter → отдельная камера: 6 спинов, held values, локальный/глобальный collect, Flip, charge ladder ×1/×2/×5/×10, до12 спинов и final sweep.
- Version2 checkpoints/новый owned RPC, один bet/payout/statistics; прежний earned Overdrive и его RPC сохранены. Обновление БД одним `supabase_magnet_v2.txt`, без сброса аккаунтов/балансов.
- 100k paid cycles: sampled RTP96.5357%, WHEEL10.986%, Chamber.695% (~1/144). Проверены математика, PostgreSQL/RLS, Chromium/F5/две сессии/мобильные размеры. Подробности: [MAGNET_V2.md](MAGNET_V2.md).
- Остальные восемь игр, auth и канонические денежные методы WalletService сохранены.

# MAGNET — понятное магнитное поле

- Только presentation: спокойная матрица, крупные +/−, рамки источника/цели, направленные стрелки, след обмена и короткая фиксация.
- Записанные эффекты воспроизводятся последовательно либо со сдвигом для длинных цепочек; Gravity, Repel, Flip и Chain имеют разные сигналы. FAST сохранён.
- HELP с диаграммами полярности, примером 243 ways, всеми шестью specials и объяснением магнитных буферов. Финальные выигрышные символы и количество путей остаются видны.
- Model/config/RNG, magneticPlan, выплаты, Overdrive, wallet, persistence и остальные игры не изменены. SQL не требуется.
- Проверки: 12 math suites, Chromium normal/FAST/F5/Overdrive/offline, пять размеров, точный finalGrid, отсутствие остаточных эффектов и ошибок консоли. Отчёт: `reports/magnet-clarity.json`.

# MAGNET — deterministic magnetic slot

- Новая самостоятельная игра 5×5 с 243 ways в трёх центральных рядах, магнитными буферами и целыми символами из предоставленного пакета.
- Seeded initial/effects/final plan, одношаговые swaps, все шесть specials и пять Overdrive spins с Field Power 1/1/2/3/5; выигрыши остаются на поле.
- Общий wallet и owned checkpoints до анимации, once-only settlement/statistics, F5/offline/cross-device recovery; дополнительный `supabase_magnet.txt` без сброса данных.
- Проверены математическая модель, PostgreSQL/RLS и Chromium. 100k cycles: sampled RTP 96.532761%, Overdrive 1.033%. Подробные config/правила/отчёты: [MAGNET.md](MAGNET.md).
- Остальные восемь игр, Featured, auth и canonical WalletService сохранены.

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
