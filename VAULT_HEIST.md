> Текущее обновление панели, покупок и Scatter Boost: [SLOT_FEATURES.md](SLOT_FEATURES.md). Новые функции требуют полного `supabase_slot_features.txt`; описанные ниже старые отчёты относятся к обычным режимам.

# VAULT HEIST

Новая самостоятельная игра `vault_heist` в категории SLOTS. Featured остаётся Digital Derby. Семь существующих игр, их математика, DOM, artwork и внутренний дизайн сохранены; проверка — `python tools/heist-isolation-check.py`.

## Интеграция и запуск

Frontend — существующий standalone HTML без новых npm-зависимостей. Новый код: `heist/config.js`, `model.js`, `assets.js`, `game.js`, `screen.html`, `presentation.css`. Общие ставки `BETS`, wallet `state.balance`, авторизация и навигация используются напрямую через существующий сервисный слой. Новый `VaultHeistBridge` находится рядом с общей outbox в `vault/runtime.js`; запросов Supabase внутри игры нет.

**Для существующей production БД выполнить целиком `supabase_heist.txt`** в [SQL Editor проекта](https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new). Это точная TXT-копия `supabase_heist.sql`. После публикации файл также доступен: https://raw.githubusercontent.com/kiryuhancev/777/main/supabase_heist.txt . Нужна уже установленная основа VAULT с admin/Mines/Swamp (как в текущем проекте). Не выполнять отдельные строки. Existing balances/accounts/history не удаляются. Миграция проверена повторным запуском.

Для новой пустой БД новая схема включена в конец `supabase_schema.sql`. Для обновления существующей БД использовать именно incremental TXT, а не переустановку старых миграций. Публичный Supabase URL/key остаются в `vault/config.js`; новые ключи не нужны. Без новой capability игра показывает понятный статус и не списывает ставки; остальные игры работают.

Локальная разработка: `python tools/embed-vault.py`, `python tools/build-site.py`, `node --check /tmp/digital-derby-release.js`. Открыть `index.html` через локальный HTTP server; для облачной авторизации используется существующий Supabase origin/redirect setup. Оригинал до новой игры сохранён отдельно как `VAULT_before_heist.html`; новая автономная версия — `VAULT_with_HEIST.html`.

## Правила

5×4, Ways слева направо с первого барабана, 3+ символа на последовательных барабанах, до 1024 ways. Платит самый длинный префикс каждого символа. Master Key заменяет regular symbols; Scatter исключён. Pure-Wild ways оплачиваются один раз по Vault Core, без 12-кратного дублирования.

3/4/5 Vault Seal дают Heist с начальной добычей 23×/35×/70×. В каждом из шести этапов три спина без новой ставки. Ставка зафиксирована при запуске. Модификаторы:

1. Blueprint — SCAN: marked winning positions ×1.25; взвешенный расчёт ways, а не произвольное увеличение итоговой выплаты.
2. Access — Master Key может превратить соседний low symbol в Wild.
3. Breach — landed Wild иногда расширяется на один барабан.
4. Vault Open — высокие winning positions могут дать дополнительные Loot Tokens.
5. Deep Chamber — Artifact иногда умножает spin win на ×2/×3/×5.
6. Grand Take — редкий golden diamond; после третьего спина автоматический cashout.

После этапов 1–5 игра ждёт решения, AUTO останавливается. COLLECT выплачивает добычу. GO DEEPER делает один Alarm Check по показанной вероятности. Alarm теряет весь bonus loot, сохраняя base win. Base win и bonus loot разделены; обе суммы выплачиваются единым settlement, base win до этого показан как secured. Он не входит в рискованную добычу. Max whole-round win = 10,000×; при достижении cap немедленный settlement.

Базовые риски переходов: 8%, 12%, 16%, 24%, 35%. Security beacon иногда добавляет +2%, редкий Override pulse снижает −3%; фактический риск ограничен 1–65%. Риск показывается текстом/числом, не только цветом. Стратегия зависит от уже накопленной добычи: высокая текущая добыча делает риск потери существеннее.

## RNG, wallet, recovery

Seed создаётся один раз для paid round; stage scenes и alarm checks получают независимые воспроизводимые потоки. Их входы не включают баланс, историю проигрышей и прошлые cashouts. Действие полностью рассчитывается и записывается в local checkpoint/outbox до анимации. F5 никогда не продолжает кадр/таймер: показывает готовую сцену и ту же STAGE/CHOICE. Проверка локального/remote checkpoint воспроизводит его полный action prefix; JSONB key order не имеет значения.

Один round UUID покрывает paid base spin и весь Heist. Shared wallet списывает одну ставку и кредитует только терминальный payout. `apply_heist_checkpoint` выполняет изменения wallet/round/recovery/stats/XP в транзакции с wallet row lock, ожидаемой revision, проверкой action prefix и журнала `(round_id,step)`. Повтор точного события возвращает acknowledgement; другая ветка той же позиции отвергается. Устаревшая ветка другого устройства сверяется с remote checkpoint, а не с максимальным балансом.

localStorage: существующие `vault:v1:user:<userId>`/guest namespaces, поле `recovery.heistRound`, bet `vault_heist`, события `type:heist` в существующей ограниченной очереди. Дополнительно `vault:v1:heist-schema` — capability cache, привязанный к Supabase project. Пароли и секреты не добавляются. UI-анимации/frames не сериализуются.

RLS включён для нового `vault_heist_events`: только собственный SELECT, никаких прямых клиентских INSERT/UPDATE/DELETE. RPC использует `auth.uid()`, публичные/anon вызовы запрещены. Блокировка администратора запрещает новый paid round; заработанный Heist можно закончить. Общие wallets не получили новых прямых UPDATE grants.

Это по-прежнему client-authoritative demo math, как остальные текущие игры: RPC проверяет права, последовательность, cap и идемпотентность, но не пересчитывает всю RNG-математику на сервере. Для денежных ставок нужен отдельный server-authoritative этап. Seed доступен клиенту; он не является защитой от анализа будущих исходов.

## Art

Четыре reference PNG в сообщении отсутствовали. Использован явно разрешённый fallback из второй спецификации. Созданы оригинальные rendered assets: холодный gunmetal, сталь/стекло, cyan security, золотая добыча, красная тревога.

- `assets/heist/environment.webp` — окружение, не flattened UI.
- `assets/heist/lobby-card.webp` — отдельная 16:9 key art с открытой дверью, без надписей/UI.
- `assets/heist/approved-symbols/isolated_webp/` — 15 утверждённых пользовательских оригиналов, подключённых без обрезки/перерисовки. Пути, соответствия и отображение: [HEIST_SYMBOLS.md](HEIST_SYMBOLS.md).
- `assets/heist/approved-symbols/reference_crops/` — предоставленные эталоны; `manifest.json` — контрольные суммы и размеры.
- `assets/heist/sources/symbols.png` и `assets/heist/symbols/` — сохранённый прежний сгенерированный набор; из него остаётся только служебный Alarm.
- `tools/prepare-heist-assets.py` — историческая подготовка прежнего sheet, не используется для новых оригиналов.

Настоящий HTML/CSS UI: reels, stage nodes, probability HUD, choice panel, loot pile, controls/help. Изображение не содержит кнопок/правил. Stage lighting/background shift, SCAN marks, winning frames, mechanical reel motion, короткие access/alarm/collect transitions. Учитывается reduced motion, mobile choice stack и клавиатура. Preload однократно. Аудио — короткие собственные WebAudio tones; event hooks `vault-heist:<event>` для будущих оригинальных звуков.

## Симуляции и конфигурация

Полный итоговый config сохранён в `heist/config.js` и в `reports/heist-simulation.json`. `node tools/simulate-heist.cjs` запускает одинаковый seed 80391 для 10k/100k paid rounds каждой стратегии. `simulateVaultHeist({spins,strategy,seed,threshold})` работает без DOM, поддерживает SAFE, BALANCED, AGGRESSIVE, THRESHOLD.

В стартовом прототипе ways scale 1.0 и initial loot 12/25/60 давали на 100k SAFE/BALANCED/AGGRESSIVE 76.17%/82.28%/80.76%. Scale 1.25 поднял рискованные стратегии примерно до/выше 100%. В итоговом config открыто установлены: ways scale **1.15**, initial loot **23/35/70**, первые Alarm Checks **8%/12%** вместо стартовых 5%/10%. Остальные значения доступны в полном config. Никаких скрытых компенсаций/подгонки результата конкретного игрока нет.

Результаты:

| Paid rounds | SAFE: collect Stage 1 | BALANCED: collect Stage 3 | AGGRESSIVE: always deeper |
| --- | ---: | ---: | ---: |
| 10,000 | 98.596% | 101.549% | 93.984% |
| 100,000 | 95.328% | 99.398% | 94.606% |

Это конечная выборка high-volatility игры, **не сертифицированный/точный долгосрочный RTP**; 10k содержит только 90 Heists, 100k — 855. Разница стратегий реальна; конфигурацию не следует называть «RTP 96%». Для финальной калибровки нужны существенно большие независимые выборки и оценка дисперсии. Аналитический trigger при 10% на reel: P(>=3 из 5)=0.00856, около 1/116.82 paid spins. В отчёте есть base hit rate, частота/средний размер Heist, bust rate, reach каждого stage, average cashout/max и расстояние между Heists. CSV рядом.

## Validation

- `node tools/heist-math-tests.cjs`: 12 meaningful suites — ways/Wild/Scatter/seed/modifiers/choice/alarm/success/Grand Take/cap/recovery validation.
- `python tools/heist-sql-tests.py`: isolated PostgreSQL, миграция дважды, полные collect/alarm/grand paths, повтор КАЖДОГО действия, owner isolation, once-only stats, blocked-start/earned-continuation.
- `python tools/heist-browser-check.py`: Chromium + реальный Supabase SDK с HTTP fixture, wallet/F5/choice/Alarm/два устройства/offline/lost reply/mobile/account isolation/unique IDs/missing migration. Production БД этими тестами не изменяется.
- `python tools/heist-auto-check.py`: AUTO останавливается на выборе без автоматического решения; STOP отменяет следующий платный спин.
- `python tools/vault-auth-check.py`: существующие Auth/session/offline/recovery проверки.
- `python tools/heist-isolation-check.py`: прежние семь игр и их оформление побайтово прежние, Featured прежний.
- Static build, extracted JavaScript syntax, scoped CSS и browser console/page errors проверяются отдельно.

Перед production применить TXT migration. GitHub Pages публикует только frontend; автоматического доступа к SQL Editor или выполнения production migration у сборки нет.
