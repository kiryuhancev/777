# MAGNET v2 — WHEEL + MAGNET CHAMBER

Source of truth: `MAGNET_complete_package_for_Codex_light.zip` / `MAGNET_updated_prompt_for_Codex.txt`. Этот промпт **меняет** прежнюю игровую механику; это не только визуальный проход. Другие восемь игр, общий канонический wallet и auth сохранены.

## Подключение

Frontend публикуется прежним GitHub Pages workflow. Для новых раундов выполнить **целиком** [supabase_magnet_v2.txt](supabase_magnet_v2.txt) в [Supabase SQL Editor](https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new), затем F5. TXT включает старую prerequisite-миграцию и новый upgrade, поэтому не нужно собирать фрагменты SQL. Данные не удаляются. `supabase_magnet_v2.sql` — только дополнительная часть для уже установленной v1.

Production-БД автоматически не изменялась. Без `featuresVersion:2` новые ставки MAGNET выключены, баланс не списывается; другие игры доступны. Старый заработанный Overdrive завершается по прежним правилам через прежний RPC. Ключи/URL Supabase и auth не меняются.

## Основная игра

- Сохранено поле 5×5 и 243 ways: платят три центральные строки, совпадения в 3–5 соседних колонках от левой. Две внешние строки — буферы для Wheel Pull; Scatter учитываются во всех 25 позициях.
- Обычные символы и Wild, без постоянной Magnetic Phase. На обычном спине initialGrid = finalGrid.
- Один WHEEL может появиться только в центре, вероятность 11%. Он запускает ровно один заранее выбранный эффект. После него оценивается окончательная сетка. Scatter колесом не удаляются.
- Секторы: Boost (вес30, ×2 или ×3 только к основному спину), Upgrade (20, все Copper → Energy), Extra Wilds (15, до2), Pull (15, премиальные символы из буферов в первые3 оплачиваемые колонки), Respin (10, один бесплатный респин обычных фишек без нового колеса/Scatter), Mystery (10, до4 обычных фишек → Plasma либо Crystal).
- Pull без подходящих премиальных фишек честно сообщает, что поле не изменилось. Boost без выигрышных ways не создаёт искусственную выплату.
- Scatter chance .016 на позицию до установки центрального WHEEL, Wild .008. Regular weights: 28/24/18/14/10/6. Таблица исходных pays прежняя, единый явный коэффициент v2 `waysPayScale=.202`. Стратегия/баланс/история игрока не влияют на RNG.

## MAGNET CHAMBER BONUS

3+ Scatter после Wheel запускают отдельный режим. Одно событие за другим: Wheel → результат → intro камеры. Основная ставка фиксируется на весь раунд.

Старт: **6 бесплатных спинов**, максимум12 с продлениями. Неподобранные value-фишки удерживаются в своих клетках; остальные позиции генерируются заново. Поле камеры не оценивается по ways.

| Тип | Вероятность на свободную позицию | Эффект |
|---|---:|---|
| Value | .055 | 2×/5×/10×/15×/25×/50×, веса60/25/10/3/1.5/.5 |
| Charge | .004 | +1 заряд |
| Magnet | .025 | Собирает values в Manhattan radius2 |
| Super Magnet | .003 | Собирает все values |
| Flip | .002 | Удваивает видимые values; несколько Flip действуют последовательно |
| Overload | .001 | +2 заряда |
| Empty | остаток | Спокойная пустая клетка |

Зарядка за спин может дать **один** дополнительный спин, не более6 продлений. Коллекторы собирают каждую value-фишку только один раз. Заряд0/2/5/9 соответствует множителю ×1/×2/×5/×10. Максимум отдельного value и накопленного raw pool —10 000×.

Последний спин делает **FINAL MAGNET SWEEP**, убирает оставшиеся values и выплачивает:

`min(10 000×, base spin win + collected values × final reactor multiplier)`

Wheel Boost на бонус не действует. Итог в кредитах = эта сумма × исходная ставка. В UI есть промежуточные collected/charge/remaining и финальная формула.

## Совместимость, сохранение, деньги

- `magnet/model.js`/`config.js` — неизменённая v1, для уже заработанного Overdrive.
- `magnet/features-model.js` — конфигурация и чистая deterministic v2; `MAGNET_ROUNDS` валидирует обе версии.
- `magnet/game.js` — общий controller и два presentation-пути. UI читает заранее готовый план, не перебрасывает результат во время анимации.
- Новый checkpoint `version:2`, `status:CHAMBER|SETTLED`, один UUID, seed и bet, steps0–12, immutable prefix `spins`, latest `magneticPlan`, held/charge/collected/remaining.
- `VaultMagnetBridge` использует прежние общий баланс, outbox, owner isolation, revision и защиту localStorage write failure. Канонические денежные методы WalletService не менялись.
- v1 события → `apply_magnet_checkpoint`; v2 → `apply_magnet_v2_checkpoint`. Новая функция использует `auth.uid()`, wallet row lock, revision, уникальный `(round_id,step)`, immutable prefix, лимиты/структурные проверки и прежний RLS журнала.
- Bet списывается только на step0. Выплата, статистика и XP — только при окончательном SETTLED. После F5 не повторяются Wheel/сбор/ставка/выплата, восстанавливается последнее стабильное поле и заработанные спины.
- Старые и новые события могут безопасно стоять в одной ограниченной очереди. Namespace прежний `vault:v1:user:<id>`; schema cache `vault:v1:magnet-schema` дополнен `featuresVersion:2`, новый namespace не создаётся.
- Как и раньше, это client-authoritative demo: SQL не пересчитывает RNG и не является полноценным real-money backend. Публичные ключи не дают права свободно редактировать кошельки.

## Ассеты

Все6 оригинальных файлов нового ZIP сохранены в `assets/magnet/v2/`, без перезаписи прежнего пакета:

- `MAGNET_updated_prompt_for_Codex.txt`
- `футуристическая_магнитная_лаборатория.webp` — style sheet regular/special, художественный ориентир
- `неоновый_магнитный_реактор_казино.webp` — ориентир premium lab/frame
- `неоновый_магнитный_механизм_wheel.webp` — напрямую reel-symbol и центр колеса
- `неоновый_магнитный_реактор_scatter.webp` — напрямую новый Scatter
- `магнитная_камера_бонусный_реактор.webp` — концепт отдельного chamber mode

Полные сцены/схемы не вставлены вместо игрового UI. Барабаны, колесо, значения и reactor HUD настоящие DOM-элементы. Прежние целые regular-символы используются в основной игре; бонус использует Crystal, Wild, Gravity и Flip из того же утверждённого sheet с крупными числами/функциональными подписями. Symbol images/preload централизованы; никаких новых Image каждый кадр.

## Математика и проверки

`node tools/simulate-magnet-v2.cjs 100000` считает **платные раунды с полным заработанным бонусом**. Seed87431, результаты в `reports/magnet-v2-simulation.json`:

| Показатель | Выборка100 000 |
|---|---:|
| RTP | 96.5356878% |
| Приблизительный95% интервал | 92.8632–100.2081% |
| WHEEL | 10.986% |
| Chamber | .695%, примерно1/143.88 |
| Средний bonus win | 52.8820× |
| Среднее количество bonus spins | 6.6676 |
| Hit rate по полному раунду | 52.493% |
| Максимум в этой выборке | 345× |

Это выборочная оценка высоковолатильной модели, не сертифицированный теоретический RTP. Первый открытый расчёт с scale.25 дал110.74%; единый pay scale изменён на.202. RNG и вероятности не подгоняются под отдельные результаты.

Проверены 3000 deterministic paths, все6 Wheel outcomes, конечность бонуса, уникальность сбора, charge ladder, sweep, corruption rejection; 12 старых math suites сохранены. PostgreSQL: миграция повторно, normal/Wheel/Chamber, duplicate каждогошага, одна ставка/выплата/статистика, RLS другого аккаунта, altered payout rejection, earned bonus после admin block, старые RPC неизменны.

Chromium + реальный SDK с HTTP fixture: normal/FAST, все секторы, Wheel+Scatter вместе, intro/collect/final summary, F5 во время Wheel и Chamber, два устройства, offline queue/reconnect, старый earned Overdrive, missing-schema failclosed, auth/signout/общий баланс, переходы в Poker/lobby, пять ширин320–1440, duplicate IDs/console. Это не тест live Supabase.

Прежний HTML: `/workspace/output/VAULT_before_MAGNET_v2.html`. Новая автономная версия: `/workspace/output/VAULT_MAGNET_v2.html`. Скриншоты: `/workspace/output/magnet-v2-{base,wheel,intro,chamber,collect,bonus-win,mobile}.png`.
