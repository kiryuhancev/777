> Новая review-версия v4 без каскадов: [CRITTER_NO_CASCADE.md](CRITTER_NO_CASCADE.md). Ниже — история предыдущих правил, не спецификация v4.

# Critter Chaos — Running Wild + Buy Features

Ветка `feature/critter-buy-running-wilds`, база40c014c. Обновлена существующая игра, source assets и остальные игры сохранены. В production эта ветка автоматически не публикуется.

## Визуал

Причина деформации — `preserveAspectRatio="none"` в sprite SVG. Теперь `xMidYMid meet`: одинаковый scale по обеим осям, центрирование и максимально возможный размер внутри клетки. Высокие животные сохраняют исходные пропорции; для их увеличения не используется растягивание или обрезка. Существующие thin borders, neon/gold palette и highlight самого art сохранены. Бегущий Wild теперь несёт собственный читаемый multiplier badge. Его картинка использует cached img.src, без повторного разбора большого data URL через innerHTML.

## Running Wild в бонусе

После выигрыша участвовавшие Wild получают следующий множитель и перемещаются в обычные символы по тому же алгоритму, что и в base game. Каждый UID двигается не более одного раза за каскад. Gravity сохраняет Wild-якоря; затем исполняются рассчитанные swaps.

В bonus renderer прыжки одного каскада показываются параллельно и ожидают Promise.all(animation.finished), после чего поле точно соответствует nextGrid модели. Перемещения рассчитаны последовательно в математике; renderer не выбирает цели и не вызывает RNG. Так сотни прыжков не растягивают Super на десятки минут. Reduced Motion сокращает показ, сохраняя результат.

В конце бонусного спина новые позиции всех Wild переносятся в следующий. Сохранённые Wild не участвуют в повторном начальном drop. Каждый новый спин сбрасывает их множители до x1; участие в следующих выигрышах снова даёт x2/x4/x8… Несколько Wild в кластере используют самый высокий множитель, без сложения/перемножения — правило v2 сохранено. Если все клетки Wild и обычной цели нет, искусственный прыжок не создаётся.

## Покупки

| Режим | Полная стоимость | Что происходит |
|---|---:|---|
| CHANCE BOOST |3× base bet за оплаченный SPIN|Scatter probability1.6%→2.4% на каждый base draw|
| BONUS BUY |50× base bet, один раз|Сразу10 обычных bonus spins|
| SUPER BONUS BUY |500× base bet, один раз|Сразу20 Super bonus spins|

Включение/отключение Boost бесплатно. Указанная повышенная стоимость применяется к следующим платным SPIN, а не списывается при переключении. Это отдельная настройка Critter: `bets.critterBoost`, в прежнем owner-bound bucket и cloud selected_bets JSONB. Она не переключает режимы и цены других слотов; новые localStorage keys/SQL columns не нужны. Индикатор есть в HUD и над рамкой. При покупке BONUS/SUPER boost не накладывается и не меняет bonus RNG. Состояние режима фиксируется в checkpoint и не пересчитывается при восстановлении.

BONUS открывает компактный themed dialog общего HUD. Radio choices, current bet, −/+, все цены, confirmation и Cancel. Изменение ставки обновляет цены сразу. Если средств недостаточно для полной цены, покупка отключена. Buy не запускается во время autoplay или текущего раунда; AUTO/SPIN/cascade порядок остаётся прежним.

Покупки пропускают paid base scene; подставные Scatter не рисуются. Одна цена за весь раунд, без доплаты за bonus spins. Планы BONUS/SUPER используют ту же bonus-механику, что соответствующие естественные бонусы, без скрытых гарантий выигрыша.

## Математика

Unboosted base на3000 seed побайтово совпадает с v2 base plan: PRNG, weights, scatter/wild chances, raw paytable, payScale, payout formula и max win10000× base bet сохранены. Running Wild изменяет развитие БОНУСА, поэтому общий RTP нового слота не заявляется равным старым96.05%.

Экспериментальная выборка:100000 естественных/boosted раундов,5000 покупок каждого вида. После округления цен: base79% (широкий95% интервал67.5–90.4%), boost88.5%, BONUS BUY89.9%, SUPER BUY92.1%. Эти числа — предварительные Monte Carlo оценки, а не сертифицированный теоретический RTP. Редкая высоковолатильная математика требует большей выборки перед точной калибровкой. PayScale не подгонялся заново, чтобы не менять базовые выплаты.

Естественный bonus trigger:0.897% ordinary против2.587% boosted на той же последовательности seed. Следовательно boost заметен, но не гарантирует бонус или Scatter на каждом спине. На initial draws независимый3000-seed тест измерил увеличение Scatter примерно в1.45 раза, ожидаемое значение1.5. Подробности: `reports/critter-v3-pricing.json`.

`CRITTER_MODEL.cost(round)` — единственный расчёт полной стоимости. commit, presentation hold, round logging и cross-device rebase используют его. Общий WalletService, owner-bound outbox, expected revision, idempotency и wallet/statistics SQL statements прежние. База для payout остаётся base bet, для wager/debit — cost. История содержит purchaseType, scatterBoost, baseBet и cost. Версии1/2 валидируются замороженными config/model.

## Миграция перед выпуском

В [SQL Editor](https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new) выполнить **полностью** `supabase_critter_v3.txt`, от begin до commit. Файл идентичен `.sql`; canonical `supabase_critter.txt/.sql` также обновлены. Не выполнялось автоматически в живой БД.

Проверка: `select public.critter_capabilities();` возвращает `version:2`, `featuresVersion:3`, `roundVersions:[1,2,3]`. Legacy version2 оставлена для совместимости уже опубликованного клиента; новая версия проверяет featuresVersion3. Старая игра не отключается из-за одной лишь миграции. Cache key прежний `vault:v1:critter-schema`, внутренний version3 означает подтверждённую поддержку paid features. Старые balances/history/checkpoints не сбрасываются.

SQL валидирует цену/режим, запрет stacking, bonus kind/count, replay Running Wild swaps, сохранение multipliers и итог payout. Неверная цена отклоняется до денег. Auth/RLS/admin blocking/grants и атомарное списание+начисление+stats прежние; пользователь определяется auth.uid(). Старые v1/v2 queued events поддерживаются.

## Проверки

- `node tools/critter-v3-tests.cjs`:3000 unchanged base paths, естественные бонусы,3709 bonus moves, сохранение позиций/reset multipliers;200 paid feature paths, exact validate, boost ratio и invalid price/mode rejection.
- `python tools/critter-v3-browser-check.py`: реальный SDK с owned HTTP fixture, uniform SVG CTM, mobile320/390/430/768/1440, цены/ставка/Cancel, boost/F5, нормальная покупка, animated Wild badge, полный Super20, F5 без повторной оплаты, exact final field/model/wallet, console/IDs.
- `python tools/critter-v3-sql-tests.py`: изолированный PostgreSQL, повторная миграция, обе покупки/boost/natural/v1/v2, exact cost/payout/revision/stats, duplicate UUID, RLS, блокировки и tampering.
- Общие HUD5 игр, auth/session/offline/outbox и boot checks сохранены. CI дополнен v3 suite; v1/v2 suites используют замороженные модели.
- `python tools/critter-v3-isolation-check.py`:191 защищённый файл, остальные игры/assets/auth и embedded source вне разрешённых блоков неизменны; HUD расширен только Critter adapter и full-cost проверкой.

Тесты не используют production Supabase. Физический телефон/FPS не измерялся. Новые storage namespaces и private keys не добавлены.

Артефакты: `/workspace/output/VAULT_Critter_v3.html`, `/workspace/output/critter-v3-mobile-shop.png`, `/workspace/output/critter-v3-bonus-running.png`, `/workspace/output/supabase_critter_v3.txt`.
