# Universal Slot HUD

Ветка `feature/universal-slot-hud`, исходная версия `ef1a03f`. Предыдущий самостоятельный HTML сохранён в `/workspace/output/VAULT_before_universal_HUD.html`.

## Компоненты и границы

`slot-hud/hud.js` создаёт один и тот же SlotTopStatus, SlotBottomControls, BalanceDisplay, BetControl, AutoPlay, SettingsModal и PaytableModal для Digital Derby, Swamp Fishing, VAULT Heist, MAGNET и Critter Chaos. `configs` описывает только точки подключения к существующим контроллерам. Контроллеры table games, Mines и Bird не подключены.

Порядок DOM: Settings → Balance → Bet− → Bet → Bet+ → Auto → Max → Spin → Bonus. Mobile переносит Balance/Bet в первую строку, остальные действия во вторую. SPIN остаётся главным действием. У MAGNET и Critter отсутствует покупка бонусов, поэтому BONUS не создаётся.

Существующие SPIN, ±, MAX и BONUS **перемещаются**, сохраняя ID и обработчики. Старые контейнеры скрыты как совместимые controller targets: они нужны исходным render/querySelector, но не создают вторую видимую панель. AUTO использует исходные обработчики выбора количества/STOP; только Digital Derby получает выбор100 через существующий `setAutoMode`, который уже принимает произвольное положительное количество. Новых таймеров autoplay нет. Окна бонусных покупок сохраняют исходные цены, проверки и действия, получают общий chrome/backdrop/ESC; общие informational окна используют native dialog с фокусом, ESC и backdrop.

`VaultSlotHud.getState(gameId)` предоставляет presentation snapshot: balance, bet, betSteps, win, state, autoplayRemaining, canSpin, canChangeBet, canBuyBonus, statusText, featureInfo. `instances[].actions` содержит spin, setBet, startAutoplay, stopAutoplay, openSettings и openPaytable. HUD не вызывает settlement/RNG или прямые финансовые операции. Баланс читается только из `VaultWalletService.formatBalance()`; Quick Bet использует реальный BETS и действующий betIndex с сохранением через VaultStorage.

При неактивной игре окна закрываются; активный HUD обновляется раз в150мс, без записи в хранилище. Анимации/состояние раунда не сериализуются. LAST WIN удерживается при визуальном проигрывании текущего раунда, затем обновляется из существующего результата.

## Скины

`slot-hud/hud.css`: геометрия и responsive правила общие. `[data-slot-skin]` задаёт только токены `--sh-panel`, `--sh-secondary`, `--sh-border`, `--sh-text`, `--sh-muted`, `--sh-accent`, `--sh-light`, `--sh-glow`, `--sh-radius`, `--sh-trim`. Цвета stadium / wood / vault metal / reactor / alley различаются; порядок, размеры и поведение общие. Декоративное оформление макета воспроизведено CSS; его игровая сцена и чужие символы не используются.

При добавлении нового слота добавить adapter config и skin tokens; не копировать layout/окна. При наличии особой механики её текущий progress layer остаётся рядом с reels; математические счётчики не дублируются в HUD.

## Настройки и хранение

Sound, Music, Quick Spin и Quick Bonus используют существующий `toggleSetting` и текущий пользовательский VaultStorage. Новая локальная preference: `vault:v1:hud` → `{version:1,reducedMotion:boolean}`. Системный `prefers-reduced-motion` сохраняется; пользовательская настройка дополнительно выключает CSS motion во всех слотах. Пароли, wallet и checkpoint в этом ключе отсутствуют. Изменения БД не нужны.

## Проверка

`python tools/slot-hud-check.py`: actual pinned Supabase SDK + HTTP fixtures, пять скинов, порядок, реальные ±/quick bet, общие настройки/info tabs, существующие bonus dialogs, mobile320/390/430/768/1440, отсутствие overlap/overflow, AUTO/STOP и double click, общий wallet, уникальные IDs, console/page errors и изоляция Poker. Это не тест живой пользовательской Supabase БД.

`python tools/slot-hud-isolation-check.py`: весь предыдущий index.html после удаления только HUD-блоков совпадает с `ef1a03f`, исходные RNG/config/model/game/auth/wallet/table files не меняются.

Математические suites: math-tests, slot-features-tests --modes-only, swamp-math-tests, heist-math-tests, magnet-math-tests, magnet-v2-tests, critter-math-tests. Auth regression: vault-auth-check.py.

Предпросмотры: `/workspace/output/slot-hud-{slot,swamp,vault_heist,magnet,critter}-{390,1440}.png`. Счета Alice и кредиты на скриншотах — локальные HTTP fixtures.

GAME MATH UNCHANGED · RNG UNCHANGED · PAYOUT LOGIC UNCHANGED · GLOBAL WALLET PRESERVED · SHARED HUD IMPLEMENTED.
