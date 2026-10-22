# BIG TOP WILDS — Curtain V2 + closing V3

Изменения не опубликованы. Новый SQL не нужен.

## Реализация

- `assets/big-top/curtain-v2/` — все 15 оригинальных PNG и README V2. `assets/big-top/closing-v3/` — две оригинальные створки, preview и README V3. Побайтовое совпадение с ZIP подтверждено: `reports/bigtop-v2-assets.json`.
- V2 01–06 полностью непрозрачны, содержат подписи; 07–09 — декорации, не закрывающие панели. В renderer нет подмены этих деталей полноразмерными створками.
- V3: каждая створка в отдельном 50%-контейнере, `object-fit: cover` с пропорциональным масштабированием и центральной обрезкой ткани согласно README V3. Только горизонтальное translate3d; нет растяжения, повторения ткани, изменения reels.
- V2: SHOW TICKET напрямую; DUO/BOMBO/SKINNY напрямую через SVG viewport, исключающий только нижние подписи y≥506. Вложенный viewport обрезает подписи даже в свободном пространстве `contain`. Персонажи не вырезаются, их пропорции сохраняются. PNG не изменены.
- Готовые сцены уже содержат рамку, поэтому вторую рамку поверх них не накладываем. `02` сохранён как reference/config; 07–09 не используются как полноразмерные панели. Пропорциональный фон-продолжение взят из центральной части `06_STAGE_EMPTY.png`, без подписи и персонажей.
- Ровно одна плашка WILD/x2/x3/x5/x10 внутри готовой композиции у ног, не на лице. Финальные створки полностью за пределами clipping viewport. Persistent результаты остаются открытыми; сохранённые winner/reel/multiplier/session используются без нового RNG.
- Перед первым открытием DUO уже находится за створками. Дальше: дуэт/свет → второе закрытие → финальный победитель → сохранение открытого результата.

## Проверки

`python3 tools/bigtop-v2-check.py` — PASS:

- Реальный seeded spin: чистый билет, две загруженные PNG-створки, дуэт, повторное закрытие, финальный winner и одна плашка.
- Реальный купленный бонус с PostgreSQL RPC: active/idle persistent остаются открытыми, сохраняется тот же DOM/result, F5 в анимации восстанавливает checkpoint, баланс не меняется до итогового settlement; повторный F5 не дублирует выплату/статистику.
- 320/375/390/430 px и 1440 px: независимые соседние BOMBO/WILD и SKINNY/x5; overlay совпадает с reel с учётом 1px border, нет page overflow, PNG/вложенные SVG изображения действительно загружены, плашки внутри reel.
- Console errors: 0. Runtime errors: 0.

`node tools/bigtop-final-model-tests.cjs` — PASS: 10 000 seeded plans, legacy1/2, persistence, deterministic decisions, capped deferred bonus.

Syntax `node --check` для итогового встроенного JS и CurtainOverlay, Python compile и `git diff --check` — PASS.

Математические config/model v1/v2/v3, wallet/auth runtime и SQL побайтово совпадают с опубликованным HEAD. Исходники остальных слотов не изменены. Universal HUD и размеры reels не менялись.

Физические iPhone/Android не тестировались: проверка выполнена в Chromium на заданных viewport.

## Семь мобильных превью

- [01. SHOW TICKET](/workspace/output/bigtop-v2-01-ticket.png)
- [02. Закрытые независимые створки V3](/workspace/output/bigtop-v2-02-closed.png)
- [03. Открытый дуэт](/workspace/output/bigtop-v2-03-duo.png)
- [04. BOMBO + WILD](/workspace/output/bigtop-v2-bombo-wild.png)
- [05. SKINNY + x5](/workspace/output/bigtop-v2-skinny-x5.png)
- [06. Независимые соседние сцены](/workspace/output/bigtop-v2-adjacent-390.png)
- [07. Persistent после следующего bonus spin](/workspace/output/bigtop-v2-05-bonus-persisted.png)

[Общая галерея](/workspace/output/BIG_TOP_V2_PREVIEW.html)
