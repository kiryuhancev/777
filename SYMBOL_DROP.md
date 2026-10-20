# VAULT Symbol Drop Animation System

Ветка `feature/symbol-drop-system`, база — `cf40899` с Universal Slot HUD. Предыдущий HTML: `/workspace/output/VAULT_before_symbol_drop.html`. SQL не требуется, опубликованный main не заменяется этой веткой.

## Общие компоненты

- `slot-animation/engine.js`: SymbolDropEngine / timing planner / landing overrides / promise barrier / hook dispatcher / cancellation / developer debug.
- `slot-animation/presentation.css`: локальные glow и временная маска reels. Вся геометрия читается до запуска анимаций. Падение/bounce/shake используют Web Animations API transform/opacity; рамка и страница не трясутся.
- `slot-animation/derby.js`: presentation adapter существующего Derby render. Уже созданные клетки сопоставляются с enterCells/fallMap; Sticky исключены из нового выпадения.
- Остальные четыре контроллера передают уже рассчитанные grid/UID/symbol и ждут promise. Новый код не вызывает RNG, БД, wallet или settlement.

## Пресеты

| Mode | Fall | Symbol stagger | Column stagger | Landing | Overshoot | Games |
|---|---:|---:|---:|---:|---:|---|
| classic |120ms|18ms|45ms|60ms|4%|Digital Derby, Swamp Fishing|
| premium |185ms|25ms|60ms|100ms|1%|VAULT Heist, MAGNET|
| impact |95ms|12ms|35ms|85ms|8%|Critter Chaos|

NORMAL1.0 / QUICK0.65 / TURBO0.4. Существующий FAST переключает NORMAL↔QUICK. TURBO и смена пресета доступны через API/debug, без добавления постоянных кнопок в HUD. Скорость фиксируется для текущего play; следующая анимация получает новые настройки.

Конфигурация `VaultSymbolDrop.configure(gameId, {...})`: mode, speedProfile, columnMode, fallDuration, symbolStagger, columnStagger, bounceDuration, overshoot, winSettleDelay100, noWinSettleDelay450, featureSettleDelay170, cascadeSpeedMultiplier0.85, anticipation, reducedMotion. `reset(gameId)` возвращает стандартный пресет. `getConfig(gameId)` показывает действующие параметры.

`STAGGERED_COLUMNS` — стандарт. `SEQUENTIAL_COLUMNS` дожидается предыдущей колонки. При двух уже представленных Scatter последняя подходящая колонка получает420ms suspense; колонка с уже лежащим Scatter исключается. Итоговые символы не меняются. Reduced Motion берётся из OS media query, общей настройки HUD или config: fade/slide8px за90ms, без shake/bounce/hero glow.

Scatter/Wild/Collector получают один landing pulse. MAGNET specials — cyan Magnetic Lock-In с коротким локальным snap; енот Wild — дополнительный squash/stretch hop. В Turbo эффекты уменьшены. Running Wild, магнитные swaps, collect, выбор Heist и bonus transitions остаются собственными последующими этапами игры.

## API / события

```js
await VaultSymbolDrop.play('swamp', {
  root: reels,
  cells: [{node, column: 0, row: 2, symbol: 'scatter'}],
  rows: 3,
  roundId,
  hasWin: true,
  speedProfile: 'normal'
});
```

`wait(gameId)` — текущий barrier, `cancel(gameId)` — отмена визуальных эффектов без изменения результата, `isBusy(gameId)` — только визуальное состояние. `inspect()` содержит активные round IDs, elapsed, gridSettled и ограниченную историю до500 событий, без DOM/финансового state. Анимации, маски и hooks очищаются при завершении/отмене, смене игры и pagehide. Ничего не записывается в localStorage/Supabase.

Hooks: onSymbolEnter, onSymbolLand, onColumnLand, onGridSettled, onSpecialSymbolLand. Подписка `VaultSymbolDrop.on(hook, callback)` возвращает unsubscribe. Также публикуются window events `vault-symbol-drop:<hook>`. Payload: game, roundId, phase, column/row/symbol, mode, speedProfile, reducedMotion, time. Enter timers используются только для hook notification; progression зависит от animation.finished promises. SFX в core отсутствуют: Swamp сохраняет свои column tones и ambient collector/anticipation через listeners.

`onGridSettled` следует после всех посадок и landing effects. Возвращаемый promise дополнительно ждёт win/no-win/feature settle pause; только затем контроллер показывает собственные wins/features и в конце снимает busy. AUTO scheduling и settlement остались у исходных контроллеров. Начальный drop, Derby gravity/refill, Critter refill и MAGNET Respin используют этот barrier вместо фиксированного reel timeout. Существующие тайминги bonus/collect/Running Wild не переписаны.

Derby по-прежнему генерирует результат по каскадам: каждый animation play получает только уже сгенерированный текущий этап. Для полной предварительной генерации всего paid round понадобилась бы отдельная переработка исходного controller/math flow; в этой задаче она не выполняется.

## Debug

Только при `window.SLOT_ANIMATION_DEBUG === true` до инициализации модуля создаётся developer panel: mode, speed, column mode, elapsed, round ID, gridSettled. В обычной сборке панель не создаётся. Нет специальных admin privileges, запросов или постоянных debug settings.

## Проверки и артефакты

- `python tools/symbol-drop-isolation-check.py`:57 исходных config/model/schema/auth/wallet/table файлов побайтово сохранены; весь Derby math и существующие финансовые statements совпадают с базой.
- `python tools/symbol-drop-engine-check.py`: реальный Chromium WAAPI,3×3 mode/speed, события строго однократны на drop, unchanged cells, запрет RNG в тесте, cancellation, sequential/staggered, Scatter suspense, reduced motion и mobile390px. Debug скрыт по умолчанию.
- `python tools/symbol-drop-games-check.py`: реальный Supabase SDK с owned HTTP fixtures, все5 слотов, seeded payout/shared balance совпадают с моделями, duplicate click, cascade refill, MAGNET Respin, Critter bonus, F5 mid-animation и STOP. Это не проверка живой Supabase БД.
- `python tools/slot-hud-check.py`: одинаковое управление/HUD, ставки/настройки/F5, пять responsive widths, отсутствие duplicate IDs/JS errors.
- Математические suites Derby/Swamp/Heist/MAGNETv2/Critter проходят; моделей и финансовой архитектуры изменения не касаются. FPS на физическом телефоне не измерялся.

`python tools/symbol-drop-preview.py` создаёт `/workspace/output/VAULT_Symbol_Drop_Preview.html`: переносимый интерактивный preview всех3 modes, QUICK/TURBO, двух column modes и Scatter anticipation на фиксированных исходных WebP Swamp. У preview нет ставок, RNG, авторизации или выплат; он использует тот же engine. Скриншот: `symbol-drop-mobile.png`. Реальные settled screens пяти игр: `symbol-drop-<gameId>-settled.png`.

Экспорт WebM — дополнительная опция `symbol-drop-engine-check.py --record`, требующая Playwright FFmpeg. В этой среде CDN кодека отвечает403; видео не экспортированы. Интерактивный HTML и browser verification работают без кодека.

GAME MATH UNCHANGED · RNG UNCHANGED · PAYOUT UNCHANGED · ANIMATION LAYER ONLY · UNIVERSAL SLOT HUD COMPATIBLE.
