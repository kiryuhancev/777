# Critter Chaos

Новая отдельная игра `critter` в VAULT / SLOTS. Source of truth: `Critter_Chaos_for_Codex_light.zip`, полный `CRITTER_CHAOS_prompt_for_Codex.txt` и пять оригинальных WebP. Остальные девять игр, Featured, auth и канонические денежные методы WalletService не меняются.

## Подключение

Frontend — прежний GitHub Pages workflow. Выполнить **целиком** [supabase_critter.txt](supabase_critter.txt) в [SQL Editor](https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new), затем F5. TXT побайтово равен `supabase_critter.sql`; это одна дополнительная миграция, без сброса пользователей, балансов и истории. Она не заменяет отдельное подключение MAGNET v2.

Production-БД автоматически не изменялась. Пока `critter_capabilities()` не вернёт version1, только новый Critter SPIN недоступен и не может списать ставку. Остальные игры продолжают работать. Ключи/URL Supabase, auth и профиль остаются прежними.

## Правила

- Поле **5×5**, платят ортогонально соединённые кластеры из **5+ одинаковых символов**, включая Wild; диагонали и paylines не используются.
- Low: 10/J/K/A. High: Street Cat/Cool Pigeon/Possum/Bulldog. Regular weights24/20/16/12/10/8/6/4. Wild chance.018, Scatter.016 на новую фишку; остаток — weighted regular.
- Pay buckets5/6/7/8/9/10–14/15–25. Все исходные таблицы и явный общий коэффициент `payScale:3.7256` лежат в `critter/config.js`. Значение таблицы — × всей ставки за один кластер.
- Выигрышные обычные фишки удаляются. Wild остаются якорями во время падения; Scatter не удаляются и сохраняют uid, но могут падать вместе с обычными фишками. Пустые места пополняются RNG.
- **Running Wild:** каждый Wild, участвовавший в выигрыше, после refill меняется местами со случайной обычной фишкой. Wild/Scatter не выбираются целью. Каждый активный uid перемещается один раз за шаг, по порядку uid; цели не подбираются под выигрыш. Затем идёт новая проверка кластеров.
- Неактивный Wild остаётся на месте до конца раунда. Между платными раундами липких Wild нет.
- Один Wild может участвовать в разных оплачиваемых типах кластеров. Изолированная группа5+ Wild платит как Bulldog один раз; если группа вошла в обычный выигрышный кластер, отдельной выплаты за неё нет.
- Максимум12 оплачиваемых каскадов на поле. Если достигнут предел, последний выигрыш оплачивается, но новых фишек/прыжков после него нет. Это явный ограничитель завершения, а не подбор требуемой выплаты.

## Dumpster Dash

3+ Scatter на окончательном поле учитываются **один раз после каскадов**. Открывается короткая отдельная сцена: енот по очереди раскрывает **все три** мусорных бака. Выбора, который якобы влияет на заранее рассчитанный результат, нет.

| Награда | Значения | Веса |
|---|---|---|
| Cash | +2/+5/+10/+25× | 60/30/9/1 |
| Extra Wilds | +3/+4/+5 | 70/25/5 |
| Multiplier | ×2/×3/×5 | 80/18/2 |

Затем разыгрывается **одно бонусное поле** с этими дополнительными Wild и обычными каскадами. Scatter в нём нет, новая ставка не списывается. Running Wild работает и здесь.

`Bonus win = (cash award + bonus field cluster wins) × multiplier × original bet`

Основной выигрыш прибавляется отдельно. Общий cap — **10 000× ставки**. Это полноценный облегчённый бонус, не пустой stub и не серия free spins. Награды и позиции Wild независимы от истории/баланса пользователя; окончательная сумма возникает из рассчитанных кластеров, не из целевой выплаты.

## Данные, деньги, восстановление

Чистая модель `critter/model.js`: seeded generation → complete base cascade plan → awards/bonus cascade plan → terminal result. В seed/расчёт не передаются аккаунт, баланс, история либо желаемый выигрыш. Анимация не вызывает RNG и лишь воспроизводит готовые swaps/refill/wins.

Весь paid round — **одна атомарная бизнес-транзакция** до анимации, с одним UUID/seed/bet, включая заработанный бонус. `VaultCritterBridge` использует существующие канонический balance, revision, ограниченный owner-bound outbox, rollback при ошибке localStorage и серверный shared wallet. Presentation hold показывает balance после ставки до завершения анимации, не выдаёт итог заранее.

`settle_critter_round` использует `auth.uid()`, wallet row lock, expected revision, уникальный round_id, структурные/числовые/платёжные проверки и прежний RLS `game_rounds`/wallet/stats. Повтор идентичного UUID/плана возвращает duplicate без повторной ставки, выплаты, stats или XP. Чужой UUID не даёт доступа к данным или деньгам другого аккаунта. Прямого `wallets.update` из новой игры нет.

После F5 показывается **окончательный результат уже рассчитанного раунда**. Незаконченные визуальные каскады, бег и bonus reveal не продолжаются. Поскольку бонус не содержит пользовательских выборов и его результат уже зафиксирован, это безопасное завершение, а не повтор бесплатных действий или потеря заработанного приза. Анимации/таймеры/DOM и animation frames в storage не сохраняются.

Namespace прежний: `vault:v1:user:<uid>`, whitelist дополнен `bets.critter`, `lastGame:'critter'`, `recovery.critterRound`. Новая schema-capability запись: `vault:v1:critter-schema`. Outbox остаётся прежним, тип события `critter`; размер/owner/revision ограничения сохранены. Offline события автоматически отправляются после восстановления сети. Конфликт двух устройств переигрывает очередь транзакций относительно remote wallet, без повторного RNG и `Math.max(balance)`.

Как и остальные игры текущего VAULT, это **client-authoritative demo**. SQL не доказывает подлинность browser RNG и не является полноценным server-authoritative real-money backend. Будущая серверная генерация заменяет RPC/bridge, а не интерфейс и кнопки.

## Арт и структура

Все6 файлов ZIP сохранены без изменения в `assets/critter/references/`:

- `01_main_concept.webp` — оригинальный логотип в шапке;
- `02_scene_alt.webp` — исходный scene reference и lobby card;
- `03_wild_symbol.webp` — оригинальный raccoon WILD, reel и jump/reveal;
- `04_scatter_symbol.webp` — оригинальный мусорный бак, reel и bonus scene;
- `05_symbol_set.webp` — индивидуальные SVG viewport+clipPath для восьми символов;
- `CRITTER_CHAOS_prompt_for_Codex.txt` — полный оригинальный промпт.

`critter/assets.js` централизует пути и точные координаты каждого sprite на sheet1200×900. В одной клетке отображается один символ, не весь sheet. Оригинальные животные/буквы не перерисованы. Отдельный `assets/critter/environment.webp` подготовлен по scene reference: неоновый ночной переулок без запечённых reels/controls/титра, спокойный центр и декор по краям. PNG-мастер оставлен в `generated_images/exec-0c2ffe8a-85d0-4137-a11c-63871f90abdd.png`.

`critter/config.js`, `model.js`, `assets.js`, `game.js`, `presentation.css`, `screen.html` — изолированные модули, builder встраивает их в автономный index.html. Для source запуска и разработки достаточно прежнего локального HTTP-сервера; новых npm/CDN зависимостей нет. Изменения runtime ограничены новым game ID, bridge/recovery/preferences/outbox и расширением presentation hold. Auth, существующий MAGNET bridge и денежные методы WalletService побайтово прежние.

## Проверки и математика

`node tools/simulate-critter.cjs 100000`, seed42917, **платные раунды с полным бонусом**:

| Метрика | Результат |
|---|---:|
| Выборочный RTP | 96.49937% |
| Приблизительный95% интервал | 90.4783–102.5204% |
| Hit rate | 26.524% |
| Dumpster Dash | .84%, примерно1/119.05 |
| Средний bonus win | 48.85769× |
| Running Wild movements | 30 464 |
| Средние выигрышные каскады на paid round, включая bonus | .36423 |
| Достигнутые cascade limits | 86 полей |
| Максимум в выборке | 1055.34424× |

Это оценка высоковолатильной модели, не точный сертифицированный RTP. Исходный общий scale1 дал31.3469%; открыто настроен один фиксированный payScale3.7256. Никакой динамической коррекции выигрышей/шансов для аккаунта нет.

- `tools/critter-math-tests.cjs`: известные кластеры/диагонали/Wild, 3000 deterministic paths, anchors/Scatter identity, уникальность всех фишек, одно перемещение активного Wild за шаг, точный swap replay, конечность/bonus/cap/corruption rejection.
- `tools/critter-sql-tests.py`: реальный изолированный PostgreSQL, повторная миграция, loss/win/running/bonus, повтор каждого UUID, одна ставка+выплата+stats, exact checkpoint, RLS другого пользователя, altered payout/admin block rejection, старые MAGNET/Heist/begin RPC прежние.
- `tools/critter-browser-check.py`: реальный Chromium и pinned SDK с HTTP fixture, normal/FAST, cluster highlight, последовательный Wild jump/source/target, bonus reveal/drop, точный финальный DOM, F5 во время бега и бонуса, два устройства/автоматический revision rebase, offline/reconnect, auth/signout/shared wallet, missing schema без списания, пять ширин320–1440, assets/console/duplicate IDs.
- `tools/critter-isolation-check.py`: девять старых игр/лобби побайтово прежние, кроме новой карточки/registry; auth/MAGNET bridge/canonical monetary methods прежние.

Отчёты — `reports/critter-*.json`. Live Supabase не изменялся и реальная почтовая авторизация этим fixture не проверялась.

Предыдущий HTML: `/workspace/output/VAULT_before_Critter_Chaos.html`. Новая версия: `/workspace/output/VAULT_with_Critter_Chaos.html`. Превью: `/workspace/output/critter-{base,mobile,winning,running-wild,bonus,bonus-result,paytable}.png`.
