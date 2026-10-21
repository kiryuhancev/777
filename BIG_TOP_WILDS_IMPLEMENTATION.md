# BIG TOP WILDS — итог реализации

Новая игра добавлена в существующий VAULT; публикация не выполнялась. Архив прочитан полностью, включая README, MASTER_IMPLEMENTATION_SPEC, все дополнительные инструкции, четыре визуальных референса и TEST_CASES. Оригинальный пакет сохранён в `big-top/requirements/`.

## Файлы и точки входа

- Route/game ID: **`big_top`**, карточка `openBigTopGame`, контроллер `window.VaultBigTop`.
- `big-top/config.js`: 6 барабанов, 2–6 рядов, веса высот/символов, paytable, Curtain probabilities, multiplier outcomes, Applause threshold/contributions, стоимость покупки, max win, времена остановки/профили.
- `big-top/model.js`: seeded RNG, `makePlan`, `evaluate`, `start`, валидаторы раунда и стабильного прогресса. `reelHeights` выбираются до анимации; потенциальные ways — произведение высот.
- `big-top/game.js`: проигрывание плана, постоянный viewport, Curtain state machine, BOMBO/SKINNY, Encore/Applause, win highlight/count-up, управление и локальные popup flows.
- `big-top/screen.html`, `big-top/presentation.css`, `big-top/assets.js`: экран, circus skin и координаты атласов. Foreground artwork масштабируется равномерно; variable cell background — отдельно.
- `assets/big-top/symbols.png`, `clowns.png`, `background.png`: подготовленные по референсам игровые материалы. SVG выбирает отдельный фрагмент атласа с отдельным clipping viewport: целый sheet никогда не отображается в одной клетке. Исходные пропорции сохранены.
- `supabase_big_top.txt`: одна повторно выполняемая транзакция настройки БД; расширение допустимых game IDs, SQL Ways validation, RPC, progress checkpoints, расширение общего bonus escrow и settings. Старые game RPC не заменяются.
- `tools/big-top-model-tests.cjs`, `big-top-sql-tests.py`, `big-top-browser-check.py`, `big-top-final-smoke.py`, `big-top-simulation.cjs`: проверки и симуляция. Результаты — `reports/big-top-*.json`.

Изменены общие точки расширения: `vault/runtime.js`, `slot-hud/hud.js`, `slot-hud/bonus-popup.js`, `slot-animation/layout.js`, `tools/embed-vault.py`, `tools/build-site.py`, `.github/workflows/pages.yml`, `index.html`, `CHANGELOG.md`; добавлены отчёты `reports/big-top-*.json`. Предыдущие неопубликованные исправления сохранены. Математика и арт всех существующих игр, включая Scatter рыбалки, не менялись в этой задаче.

## Детерминированный round plan

`BIG_TOP_MODEL.start({seed,bet,roundId,purchase})` заранее создаёт базовый результат и полную последовательность бонуса. Каждый план содержит `reelHeights`, `initialGrid`, `featurePlan`, `finalGrid`, `wins`, `winX`, Encore до/после и Applause до/после.

`featurePlan` фиксирует позицию, full-reel flag, победителя BOMBO/SKINNY, множитель и Encore. Renderer только проигрывает: reels settle → showdown → winner → final Wild state → win presentation. Повторного RNG или поиска нового результата в animation callbacks нет. Cascade отсутствует.

Ways начинаются с Reel1, идут по соседним барабанам и платят от3 до6. Количество ways — произведение matching counts; weighted ways учитывают множители выбранных Wild. Full Reel x3 даёт x3 на конкретный way, а не x3 за каждую клетку барабана. Разные multiplier reels перемножаются. Чистые all-Wild paths оплачиваются один раз по старшему fish symbol, исключая дубли по каждому paying symbol.

## Бонус и кошелёк

`VaultBigTopBridge` расположен отдельным блоком в `vault/runtime.js`, рядом с другими game bridges. Он использует существующий canonical wallet, owner-scoped storage и outbox. Второго баланса нет.

До визуального проигрывания сохраняется неизменяемый результат и списывается только ставка/цена покупки. После base win presentation отдельный `credit_big_top_base` зачисляет базовый выигрыш один раз и атомарно отмечает `baseDone`. Бонусная часть находится в общем escrow и **не попадает в баланс** во время Free Spins. После последнего Free Spin и подтверждения Bonus Complete `VaultBonusSession.complete('big_top')` вызывает однократное зачисление. Презентация сама ничего не начисляет: денежные операции выполняет data layer, а очередность вызовов следует flow из спецификации.

Защита: unique round ID, identity через auth.uid(), wallet revision/row lock, duplicate guard, SQL пересчёт Ways, state-bound progress и terminal check для bonus settlement. Прямой вызов обычного round RPC не позволяет обойти escrow и забрать бонус заранее. Используются существующие RLS policies; доступ к чужому прогрессу отвергается.

Как и остальной текущий проект, генерация RNG остаётся клиентской. Новая задача не переносит RNG всех игр на сервер. SQL проверяет геометрию/feature transitions/ways/payout/ownership, но это не полная серверная генерация случайных исходов.

## Стабильные точки восстановления

Сохраняются seed/full round plan, baseDone, introDone, nextSpin, cumulative bonus win, Encore states, meter/armed state и complete. `big_top_progress` отправляет стабильные checkpoints в Supabase; owner-bound local cache восстанавливает более свежий подтверждаемый шаг при наличии outbox.

Reload во время spin/showdown повторяет ту же презентацию сохранённого шага, а не выбирает новые символы. Reload на intro снова ждёт ввод; reload на summary показывает summary без повторной выплаты. Порядок ключей PostgreSQL JSONB не влияет на проверку.

Encore существует ровно один следующий Free Spin. При сокращении ряда план заранее резервирует уникальные позиции. Full Reel Encore не смешивается с перекрывающими новыми full-reel features. Applause включает1/2/3 за новые ordinary/multiplier/full-reel Curtain. На12+ следующий spin гарантирует Curtain; после подготовки гарантированного spin старый meter сбрасывается перед новыми contributions. Сохранённый plan исключает повторное потребление гарантии.

Scatter mapping10/12/15/20 применяется к начальному входу в THE BIG SHOW. Отдельные retriggers в переданном MASTER_SPEC не определены и не добавлены.

## HUD / popup host

Все9 controls идут через существующий Universal HUD в прежнем semantic order. В Settings для новой игры доступны Normal/Quick/Turbo и общий Reduced Motion. Профиль хранится в preferences.

Popup host — **`#bigTopReels`**: локальный backdrop и absolute card. Меню, YES/NO, Intro, Big Win и Complete, а также общие Settings/Paytable/Bet/Auto dialogs, не занимают весь экран и не меняют document flow. Spin/Auto/Bet/Max/Bonus блокируются до безопасного ввода. NO/X/backdrop/ESC не списывают деньги; повторный YES не покупает второй бонус. Space repeat и click-through защищены общим popup layer.

Общий layout guard дополнен responsive remeasurement: смена ширины с открытым popup не оставляет старые настольные размеры до закрытия. Это представление, не изменение правил существующих игр.

## Настройка и запуск

1. В текущем Supabase проекте открыть SQL Editor.
2. Выполнить **весь `supabase_big_top.txt`**, один раз; повторный запуск безопасен.
3. Проверить `select public.big_top_capabilities();` — ожидается `{"version":1}`.
4. Для локального просмотра: `python tools/embed-vault.py`, `python tools/build-site.py`, затем статический HTTP server для `_site`.
5. После отдельного разрешения можно публиковать обычной существующей GitHub Pages pipeline. В текущем задании публикации нет.

Секретов и новых public keys не требуется. Production БД из среды разработки не изменялась: SQL-тесты работают только в `vault-postgres-test/vault_test`.

## Математическая оценка

MASTER_SPEC не задаёт weights/paytable/целевой RTP численно: они вынесены в новую версионируемую конфигурацию. Текущая покупка —110× ставки, max win —10,000×. Контрольный Monte Carlo:2,000,000 paid rounds; оценка base+bonus RTP≈93.98%, 95% interval≈89.99–97.97%; естественный бонус≈1/264 spins. Buy sample10,000:≈97.34% возврата от цены покупки. Высокая дисперсия: это оценка выборки, не сертифицированный точный RTP. Полный результат — `reports/big-top-simulation.json`. Существующие игры не перекалибровывались. Финансовые изменения новой конфигурации требуют согласованного изменения SQL и повторной проверки математики.

## Проверки и ограничения

Подробная матрица — `BIG_TOP_WILDS_TEST_REPORT.md`.

Реальные iOS Safari/Android устройства в этой среде недоступны. WebKit ранее пытались загрузить с повышенным доступом — серверы возвращают403 Domain forbidden. Мобильная проверка выполнена в Chromium с touch input и адаптивными viewport; это не выдаётся за реальный аппаратный тест Safari/Android.
