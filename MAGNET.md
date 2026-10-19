# MAGNET

Новая самостоятельная игра `magnet` в SLOTS. Источник требований и художественного направления: приложенный `MAGNET_COMPLETE_FOR_CODEX.zip`, включая полный `03_docs/MAGNET_CODEX_PROMPT.txt`. Исходный frontend сохранён в `/workspace/output/VAULT_before_MAGNET.html`; новая автономная версия — `/workspace/output/VAULT_with_MAGNET.html`.

## Второй визуальный проход: читаемость

Обновлены только `magnet/game.js`, `magnet/presentation.css` и `magnet/screen.html`, затем пересобран автономный HTML. Исходная версия до прохода: `/workspace/output/VAULT_before_MAGNET_clarity.html`; новая: `/workspace/output/VAULT_MAGNET_clarity.html`.

Каждый записанный effect показывает источник, цель, связь и стрелку, затем ровно записанный swap/sign change и settle. Короткие списки идут последовательно с паузой, длинные — со сдвигом начала; это ограничивает суммарное время магнитного воспроизведения примерно 2.4–2.7 секунды плюс короткие объявления дополнительных фаз. Один нормальный event длится 300 ms, FAST — 170 ms. Частично перекрывающиеся подсветки учитываются отдельно, порядок применения записанных изменений сохраняется. В конце каждой фазы проверяется точное совпадение presentation-grid с неизменённым `phase.finalGrid`.

Gravity использует золотые сходящиеся кольца, Repulsor — расходящуюся волну, Flip меняет и поворачивает знак, Chain предваряет следующую фазу статусом. Линии, призраки и служебные рамки удаляются. Белая рамка означает источник, янтарная — цель/обмен; выигрыш имеет отдельную светло-золотую рамку. В HELP добавлены диаграммы и пример `2 × 1 × 3 = 6 ways`. Никаких новых storage keys, RPC или SQL.

`tools/magnet-clarity-check.py` проверяет normal/FAST, реальные записанные effects, итоговый DOM-grid и checkpoint, отсутствие clutter, HELP, mobile и побайтовую неизменность model/config/assets/runtime/SQL относительно `b78eef5`. Превью: `/workspace/output/magnet-clarity-{idle,attract,repel,gravity,winning,mobile,help}.png`.

**GAME LOGIC UNCHANGED · MAGNETIC PLAN UNCHANGED · RNG UNCHANGED · PAYOUTS UNCHANGED.**

## Подключение

Frontend публикуется существующим GitHub Pages workflow. Для подключения новой игры к существующему общему кошельку выполнить **целиком** [supabase_magnet.txt](supabase_magnet.txt) в [SQL Editor текущего проекта](https://supabase.com/dashboard/project/umccpdbopcgluwsnhlwj/sql/new), затем обновить страницу. TXT побайтово соответствует `supabase_magnet.sql`. Новые URL/ключи не нужны. Пока миграция не установлена, MAGNET не принимает ставки; остальные игры доступны.

Это дополнительная регистрация `magnet`, owned checkpoint RPC и журнал повторов; существующие игровые RPC, аккаунты и балансы не переустанавливаются. Нет прямого `wallets.update` из игры. Backend остаётся прежним Supabase, auth остаётся прежним. Production SQL не выполнялся автоматически; публичный ключ клиента не даёт доступа к SQL Editor.

## Поле и правила

Поле 5×5 содержит 25 уникальных pieces. **243 ways = три центральных оплачиваемых ряда × пять колонок**; верхний и нижний ряды — магнитные буферы. Все 25 ячеек участвуют в магнитных взаимодействиях и Scatter trigger. Оплачивать все пять рядов означало бы 3125 ways; это другой режим, который здесь не используется. Зоны подписаны на экране и описаны в справочнике.

Порядок: генерация начальной сетки → готовый magneticPlan → анимация этого плана → показ выплаты по finalGrid. Символы не исчезают; каскадов нет. Движение и выплата никогда не подгоняются друг под друга. План и RNG не используют баланс, историю игрока или желаемую сумму выигрыша.

Порядок каждой фазы: Gravity Core → Magnet Wild → Repulsor → обычное притяжение → обычное отталкивание → Polarity Flip → Chain Magnet. Источники и кандидаты сортируются по distance, затем uid; при равных направлениях выбирается горизонталь. Каждый обычный кусок может переместиться максимум на одну клетку за фазу, включая вынужденное перемещение при swap. Занятое место обменивается с другим подвижным и ещё не перемещавшимся куском. Граница, неподвижный special или уже перемещавшийся blocker отменяют движение. Сосед вплотную к притягивающему источнику дальше не втягивается: занять одну ячейку вдвоём нельзя.

Gravity притягивает regular независимо от заряда. Wild остаётся на месте, заменяет paying regular и притягивает противоположный заряд в радиусе. Repulsor отталкивает regular. Flip меняет + ↔ − в своей области, нейтраль не меняет. Chain добавляет фазу, максимум 3. Нейтраль не создаёт обычных магнитных сил; её может физически сдвинуть swap. Specials остаются неподвижными. + / − / ○ написаны на каждом куске и присутствуют в доступном описании; цвет не единственный признак. Цвет материала исходного предмета не определяет заряд — его показывает отдельный знак.

3+ Scatters на итоговом поле включают **OVERDRIVE**, 5 заработанных спинов. FIELD POWER: ×1, ×1, ×2, ×3, ×5. Сила меняет частоту/активацию specials, радиусы и число фаз. Это **не множитель выплаты**. В этой версии нет повторных запусков Overdrive внутри бонуса. Весь цикл — один roundId и одна исходная ставка; бонусные спины ничего не списывают. Выигрыши накапливаются и зачисляются один раз при окончании родительского раунда. Общий cap: 10 000× ставки.

## Конфигурация

Полные фактические значения: `magnet/config.js`, также включены в `reports/magnet-simulation.json`.

| Параметр | Значение |
| --- | --- |
| Grid / ways / pay rows | 5×5 / 243 / индексы строк 1, 2, 3 |
| Positive / negative / neutral | 40% / 40% / 20% |
| Wild / Flip / Gravity / Repulsor / Chain / Scatter на cell | 0.8% / 0.6% / 0.6% / 0.6% / 0.4% / 1.8% |
| Regular weights: Copper, Steel, Energy, Plasma, Crystal, Reactor | 28 / 24 / 18 / 14 / 10 / 6 |
| Normal / Gravity / Wild / Repulsor radius | 2 / 2 / 2 / 2 Manhattan cells |
| Flip radius | 1 |
| Normal interaction / special activation / chain activation | 32% / 85% / 65% |
| Maximum swaps per phase / phases | 10 / 3 |
| Bonus special frequency factor | 1 + 0.1 × (power − 1) |
| Bonus special activation | min(1, 0.85 + 0.04 × (power − 1)) |
| Bonus Chain activation | min(1, 0.65 + 0.05 × (power − 1)) |
| Radius upgrade | +1 при power ≥2 |
| Initial phase budget | 2 при bonus power ≥3, иначе 1; Chain может увеличить до 3 |
| Bonus Scatter probability | 0; повторных запусков нет |
| Общий коэффициент paytable | 0.39 |

Заданные в prompt стартовые pays сохранены как базовая таблица, умноженная на открытый общий `waysPayScale=0.39`. Первичный scale 0.5 давал 123.76% на 100k и был откалиброван до реализации итогового отчёта; вероятности и магнитные правила при этом не менялись. Никакой компенсации отдельному игроку нет. Эффективные выплаты **на winning way**, в долях total bet:

| Symbol | 3 | 4 | 5 |
| --- | ---: | ---: | ---: |
| Copper | 0.117 | 0.312 | 0.78 |
| Steel | 0.156 | 0.39 | 1.17 |
| Energy | 0.234 | 0.585 | 1.95 |
| Plasma | 0.312 | 0.975 | 3.12 |
| Crystal | 0.468 | 1.56 | 5.85 |
| Reactor | 0.78 | 3.12 | 11.7 |

Wild-only ways учитываются один раз по Reactor values; normal ways требуют regular в оплачиваемом совпадении. Scatter не заменяет paying symbol.

## Симуляция без DOM

`node tools/simulate-magnet.cjs` запускает 10k и 100k. Экспортированный `simulateMagnetSpins(count, seed)` можно вызывать из Node. Seed: 87431. Знаменатель — платные родительские раунды; в payout включены все заработанные Overdrive spins.

| Метрика | 10 000 | 100 000 |
| --- | ---: | ---: |
| RTP | 97.02069% | 96.532761% |
| Приблизительный 95% интервал RTP | 92.335–101.706% | 95.095–97.970% |
| Hit rate целого раунда | 50.75% | 51.231% |
| Average win | 0.970207× | 0.965328× |
| Платные spins с магнитным перемещением | 100% | 99.996% |
| Средние swaps на resolved spin | 6.4936 | 6.4999 |
| Spins с special activation | 43.7316% | 43.9852% |
| Overdrive count | 101 | 1033 |
| Overdrive frequency | 1.01% | 1.033% |
| Средний интервал Overdrive | 99.01 spins | 96.81 spins |
| Average Overdrive payout без base win | 5.41405× | 5.10919× |
| Maximum observed whole-round win | 56.16× | 56.16× |

Это конечные выборки, не сертифицированный долгосрочный RTP. Полные числа, счётчики отдельных specials, config и методика находятся в `reports/magnet-simulation.json`.

Пример настоящего magneticPlan: `reports/magnet-example-plan.json`, round seed **92**, три фазы. В первой фазе Gravity uid12 притягивает uid2 из cell2 в cell7, меняя его с uid7; затем uid10 из cell10 в cell11 и uid14 из cell14 в cell13. Координаты в JSON нулевые, порядок row-major. Файл содержит initialGrid, orderedEffects, фазы и finalGrid без сокращения.

## Artwork и интерфейс

Все 16 исходных файлов архива сохранены побайтово в `assets/magnet/`, включая оба reference и исходный prompt; контрольные суммы — `reports/magnet-isolation.json`. Дизайн предметов не перерисовывался. В supplied small crops некоторые предметы обрезаны и видны соседи/подписи; для игры используются отдельные SVG sprite viewports на полном исходном symbol sheet. Области заданы в `MAGNET_ART` в `magnet/assets.js`; один общий decoded image используется всеми 25 кусками. В ячейке виден один предмет, не весь sheet. Пропорции сохраняются. Области: copper, steel, energy, plasma, crystal, reactor, wild, flip, gravity, repulsor, chain, scatter.

`assets/magnet/environment.webp` — самостоятельный фон, подготовленный по главному reference без запечённых reels, текста или контролов. Он же используется в карточке 16:9 без заголовка внутри artwork. Циановые и красные реакторы, frame, field, force arcs, charge badges, Overdrive track и контролы — HTML/CSS/SVG. При малой ширине боковые приборы скрываются, поле остаётся 5×5. Предзагрузка однократная; во время движения меняются transform 25 DOM nodes и ограниченное число SVG paths. Нет full-screen shader, бесконечных частиц и new Image на frame. `prefers-reduced-motion` поддержан.

## Сохранение и границы доступа

Новый `VaultMagnetBridge` находится в существующем data layer. Денежные методы canonical `VaultWalletService`, auth/session code и восемь прежних игр сохранены. Существующая задержка визуального показа баланса расширена с Swamp на MAGNET: результат не раскрывается до окончания магнитной фазы. Сам canonical balance и checkpoint фиксируются до анимации. Расширены регистрация игры, preferences, whitelist checkpoint, owned bounded outbox и обработка конфликтов MAGNET. Нет второго баланса. Local namespace прежний: `vault:v1:user:<uid>`, внутри `recovery.magnetRound`, `bets.magnet`; добавлен cache capability `vault:v1:magnet-schema`.

Checkpoint сохраняется **до первого await анимации**. Он содержит seed, initialGrid, весь magneticPlan, finalGrid, историю уже заработанных spins, bonus substate и settled status. F5 показывает устойчивое finalGrid без продолжения с середины анимации; следующая бонусная сцена выводится только из сохранённого seed и индекса. Неудавшаяся запись localStorage откатывает локальное списание/очередь MAGNET и блокирует новые действия до восстановления хранилища.

RPC использует auth.uid(), wallet row lock, ожидаемую revision, неизменяемый prefix планов и журнал (roundId, step). Проверяет stake/cap/сумму выигрышей/счётчики/уникальные pieces/одношаговые движения. Только последняя стадия зачисляет payout и statistics один раз. RLS разрешает чтение своих events; прямые записи клиенту запрещены. Заработанный Overdrive можно закончить после admin-block, новые ставки блокируются. При stale device действует серверный checkpoint; Math.max(balance) не используется.

Как и остальной текущий хаб, генерация результатов остаётся client-authoritative demo. RPC не пересчитывает RNG и всю магнитную физику: это не server-authoritative real-money backend.

## Проверки и результаты

- `node tools/magnet-math-tests.cjs`: 12 suites, включая притяжение/отталкивание, neutral, все specials, Wild, final-grid scoring, цепочки, 2000 seeded plans с проверкой occupancy/one-cell/anchors, Overdrive и восстановление JSONB.
- `python tools/magnet-sql-tests.py`: реальный изолированный PostgreSQL; повторная миграция и каждый запрос дважды, один wager/payout/statistics, точный checkpoint, RLS, чужой owner, неверная выплата, earned bonus после admin block. Существующие Heist/begin RPC definitions остались прежними.
- `python tools/magnet-browser-check.py`: настоящий standalone HTML и pinned auth SDK с HTTP fixture; пять размеров, реальные force arcs, точный F5, пять бонусных spins, два устройства, offline/reconnect, shared wallet, account isolation, missing migration guard, уникальные IDs. Ошибок страницы нет; намеренно вызванные offline network errors выделены в отчёте.
- `python tools/heist-scene-check.py`: прежний слот и его реальные раунды/F5/menus проходят после расширения data layer.
- `python tools/magnet-isolation-check.py`, `reports/magnet-isolation.json`: HTML, math, art восьми прежних игр и lobby сохранены, добавлена только новая card/registration; auth и денежные методы canonical WalletService побайтово прежние. Визуальное удержание результата расширено отдельно от денежных операций.
- Static build и извлечённый JavaScript проходят syntax check. Новый математический тест включён в существующий GitHub Pages CI.

Screenshots: `/workspace/output/magnet-base.png`, `magnet-magnetic-phase.png`, `magnet-overdrive.png`, `magnet-mobile.png`.
