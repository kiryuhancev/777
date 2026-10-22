# BIG TOP — Base reveal gate + idle

Не опубликовано. Новый SQL не нужен.

## Изменения

`big-top/game.js`: после ожидания остановки всех барабанов Base Game показывает только те запланированные Curtain Features, для которых есть SHOW TICKET (legacy curtain также поддерживается) и положительная сыгровка в существующем plan.wins. В проигрышном раунде остаётся initialGrid с билетом, не скрытый набор Wild. То же правило применяется при восстановлении завершённого раунда.

Важно: существующая математика BIG TOP вычисляет финансовый результат по finalGrid с Curtain Wild. Для соблюдения запрета на изменение выплат условие проверяет этот уже рассчитанный результат. Отдельная оценка initialGrid без Curtain Wild не вводилась: она изменила бы смысл активации и могла бы скрыть причину положительной выплаты.

Bonus планы передаются без фильтрации: активация, persistence, winner/multiplier, checkpoints и settlement не менялись. В `BASE_FEATURE_CHECK` можно проверить порядок остановка → условие → раскрытие.

`big-top/presentation.css`: 6.8/8.2-секундные мягкие циклы света BOMBO/SKINNY с пиком brightness 1.045. Только в финальной открытой сцене и активной игре. Ни transform сцены, ни движение цельного фона не добавлены. Отключаются через prefers-reduced-motion и shared slot-reduced-motion.

Математические модели/config, ассеты, CurtainOverlay, wallet/auth и SQL побайтово совпадают с опубликованным HEAD. Исходники других игр и HUD не менялись.

## Проверки

`python3 tools/bigtop-base-gate-check.py` — PASS:

- losePlain / winTicket / loseTicket / winPlain;
- условие позже всех шести SETTLED, раскрытие позже условия;
- точная выплата без изменения плана;
- проигрышный билет после F5 остаётся билетом, без шторы и повторной выплаты;
- оба idle-эффекта реально меняют только яркость ≤1.05, не координаты/размеры/transform;
- reduced motion выключает эффект;
- runtime/console errors: 0.

Сводка: `reports/bigtop-base-gate.json`. Дополнительно прогнана существующая V5 regression suite с реальным bonus/persistent/reload/terminal settlement и мобильными viewport; результат в `reports/bigtop-v5.json`.
