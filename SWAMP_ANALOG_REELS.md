# Slower slots + Swamp analog reels

Новая версия: `feature/swamp-analog-reels`, база672dd07. Рабочий main не заменён. Резервный HTML: `/workspace/output/VAULT_before_analog_reels.html`. SQL, новые ключи localStorage и изменения Supabase не требуются.

## Темп

Реальный Chromium WAAPI, фиксированное поле15 символов, медиана двух запусков без settle pause:

| Пресет | Прежний NORMAL | Новый NORMAL | Длительность |
|---|---:|---:|---:|
| Classic |610ms|878ms|+44%|
| Premium |706ms|1029ms|+46%|
| Impact |542ms|767ms|+41%|

Общий QUICK0.70, TURBO0.40. Пауза после остановки: проигрыш550ms, выигрыш200ms, special270ms, масштабируется скоростью. Существующий FAST выбирает QUICK.

## Непрерывная лента Swamp

`slot-animation/analog.js` + `analog.css`, renderer зарегистрирован в общем `VaultSymbolDrop`. Пять лент содержат старые видимые клетки, ограниченный повторяемый поток обычных декоративных символов и заранее рассчитанные финальные клетки. Лента едет вниз одним WAAPI transform. Финальные DOM-узлы физически входят в окно и после остановки остаются теми же узлами: нет opacity swap, нового результата или подмены клетки. Геометрия проверена до/после commit с допуском1px.

Фазы: START → ACCELERATION → FULL_SPEED → DECELERATION → FINAL_ALIGNMENT → SETTLED.

| Параметр NORMAL | Значение |
|---|---:|
| Разгон |150ms|
| Равномерный ход первого барабана |490ms|
| Торможение |360ms|
| Интервал остановок |165ms|
| Финальный замок |110ms|
| Замок в пикселях |+5 → −2 →0|
| Скорость |15 символов/сек|
| Blur по умолчанию |0|
| Сжатие у краёв |до5%|

Измеренные остановки NORMAL:1153/1313/1492/1649/1792ms; QUICK:775/868/980/1074/1186ms; TURBO:488/552/616/680/743ms. QUICK0.65, TURBO0.40. При двух Scatter последний барабан тормозит900ms NORMAL после приземления второго Scatter. RNG и finalGrid не меняются; декоративная лента не создаёт фиктивных Scatter.

Постоянная маска затемняет края. RAF обрабатывает не более6 видимых клеток на барабан без layout reads. Mobile сохраняет вращение; Reduced Motion сокращает время, убирает компрессию/blur/замок/локальный сдвиг. Ограниченные буферы и event history очищаются при отмене/выходе.

## Выигрыш и восстановление

Все пять остановок и settle pause завершаются до подсветки, dim невыигравших клеток, collect и существующего общего BIG WIN. AUTO ждёт окончание presentation; STOP не создаёт новый раунд. Бонус использует тот же renderer.

При F5 Swamp может реконструировать только изображение последнего settled раунда по принадлежащему текущему пользователю сохранённому seed и версии модели. Никакие выплаты, списания и physics/animation frames не проигрываются повторно. Бизнес-восстановление бонуса остаётся прежним.

## Настройка и audio hooks

`VaultAnalogReels.configure({accelerationDuration, fullSpeedDuration, decelerationDuration, reelStagger, stopDuration, stopBounce, reelSpeed, blurStrength, perspectiveAmount})`. Все параметры ограничены; `reset()` возвращает defaults. `inspect()` содержит только диагностические события. Скорость задаётся через общий `VaultSymbolDrop.configure('swamp', {speedProfile:'quick'})` или текущий FAST.

Hooks: onReelStart, onReelFullSpeed, onReelDecelerate, onReelStop, onAllReelsStopped. `VaultAnalogReels.on(name, callback)` возвращает unsubscribe. События также доступны как `vault-analog-reels:<hook>`. Общие symbol/column/grid hooks сохранены. Core не содержит SFX paths.

Developer controls создаются только при `window.SLOT_ANIMATION_DEBUG === true` до загрузки модулей. В обычной версии панель отсутствует.

## Проверка

- `tools/slot-tempo-check.py`: измерение относительно672dd07, `reports/slot-tempo.json`.
- `tools/swamp-analog-engine-check.py`: реальные WAAPI, непрерывность хода, те же DOM-узлы и точное выравнивание, скорости, anticipation, все фазы/hooks, bonus, отмена,320/390/430/768px, Reduced Motion, отсутствие page errors.
- `tools/swamp-analog-games-check.py`: реальный SDK с изолированными HTTP fixtures, seeded finalGrid/payout/wallet, F5 во вращении, однократный settlement, AUTO/STOP, покупка бонуса/Free Spin, collect и общий BIG WIN после остановки.
- Общие engine/game/HUD/isolation проверки: пять слотов, shared balance, cascades, MAGNET Respin, Critter bonus, duplicate click,57 защищённых файлов и прежние финансовые statements.

HTTP fixtures проверяют клиентскую интеграцию, а не живую БД. FPS физического телефона не измерялся.

## Артефакты

- `/workspace/output/VAULT_Analog_Reels.html` — новая автономная версия сайта.
- `/workspace/output/VAULT_Swamp_Analog_Preview.html` — интерактивные NORMAL/QUICK/TURBO, anticipation, Free Spins, Reduced Motion, реальные assets.
- `/workspace/output/VAULT_Symbol_Drop_Preview.html` — три замедленных общих пресета.
- `/workspace/output/Swamp_Analog_Frame_Sequence.html` — автономная последовательность кадров всех фаз, anticipation и mobile.
- `/workspace/output/swamp-analog-bonus-mobile.png` — бонус в настоящем игровом интерфейсе.

GAME MATH UNCHANGED · RNG UNCHANGED · PAYOUT UNCHANGED · ANIMATION LAYER ONLY · TRUE VISUAL REEL ROTATION · UNIVERSAL HUD AND SHARED WIN PRESENTATION PRESERVED.
