> Текущее обновление панели, покупок и Scatter Boost: [SLOT_FEATURES.md](SLOT_FEATURES.md). Новые функции требуют полного `supabase_slot_features.txt`; описанные ниже старые отчёты относятся к обычным режимам.

# Swamp Fishing — обновление символов и Collector progression

Изменён только визуальный слой Swamp Fishing. `swamp/config.js`, `swamp/model.js`, общий wallet/auth/persistence, SQL, lobby и остальные игры не изменены. Обновлять БД не требуется.

## Assets

Оригиналы из предоставленного архива сохранены без изменений:

- `assets/swamp/updated_symbols/scatter_fish_updated.png`
- `assets/swamp/updated_symbols/collector_fisherman_updated.png`
- `assets/swamp/updated_symbols/README_FOR_CODEX.txt`

Runtime использует подготовленные прозрачные WebP:

- `assets/swamp/updated_symbols/scatter_fish_reel.webp` — полный левонаправленный Scatter со встроенной надписью; у исходного RGB PNG был чёрный фон, для игрового варианта он удалён редактором изображений.
- `assets/swamp/updated_symbols/collector_fisherman_reel.webp` — композиция буквальных фрагментов оригинала: лицо/шляпа, сеть/фонарь, оригинальная надпись COLLECTOR.
- `assets/swamp/updated_symbols/collector_progress_icon.webp` — портрет того же рыбака для шкалы.

Карта/preload: `swamp/assets.js`. Старые Scatter/Collector остаются в историческом asset pack, но не используются игровым runtime. Остальные символы и фон сохранены. Подготовка cropped Collector: `python tools/prepare-swamp-symbol-update.py`. Для экспорта прозрачного Scatter передать вторым аргументом путь к прозрачному PNG из редактора; команда сохраняет WebP без изменения направления и пропорций.

## Progression

В base game панель полностью скрыта через `display:none`, без зарезервированной высоты. Во Free Spins — 12 портретов, три группы по четыре, цели ×2/×3/×10, оставшиеся FS и текущий COLLECT multiplier. Сумма feature остаётся под барабанами.

После существующего сбора Money Fish копия Collector летит к следующему портрету: 560 мс, задержка между несколькими Collector 140 мс. Исходный reel DOM не перемещается. Призрачные портреты имеют opacity .22; активные — полный цвет. На мобильном три ряда по четыре. Reduced motion заполняет шкалу без перелётов.

Единственный источник счётчика — `bonus.collectors`. Визуальная копия checkpoint нужна только для последовательного раскрытия уже рассчитанного результата; не сохраняется. При F5 отображается окончательный checkpoint без повторного перелёта/награды. При уходе анимации и копии удаляются.

После 12 Collector все 12 портретов остаются активными. Действующая математика продолжает давать +10 FS за каждые последующие четыре Collector на ×10; такие Collector летят к текущему multiplier badge, не начинают новую пустую шкалу. Пороги, free spins, ставки, выплаты, частоты, RNG, cap и сохранения не менялись.

## Проверка

- `node tools/swamp-math-tests.cjs` — все 13 математических suites.
- `python tools/swamp-symbol-progression-check.py` — строгая побайтовая изоляция остальных игр, wallet/auth/SQL и math; пороги 4/8/12/16, overflow, фактические выплаты/FS против модели; F5 во время перелёта; reduced motion; пять разрешений, отсутствие console/page errors. Отчёт: `reports/swamp-symbol-progression.json`.
- `python tools/swamp-browser-check.py` — decoded assets, duplicate IDs, bet/wallet/bonus F5, remote recovery, account isolation, пять разрешений, bounded effects, console.
- `python tools/swamp-conflict-check.py` — конфликт устройств, однократный ретриггер последнего FS после F5, автоматическое продолжение/пауза.
- `python tools/build-site.py` и `node --check /tmp/digital-derby-release.js` — сборка и синтаксис.

Проверки авторизации/облака выполнены с реальным Supabase SDK и HTTP fixture, без изменения production БД. Большая RTP симуляция не повторялась: математика побайтово неизменна, предыдущий отчёт остаётся применимым.

Отдельный HTML: `VAULT_swamp_visual_update.html`. Исходная версия перед изменениями: `VAULT_before_swamp_visual_update.html`. PNG previews: base, FS 0/12, 6/12, 12/12 и mobile.
