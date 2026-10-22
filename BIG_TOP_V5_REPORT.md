# BIG TOP — full-height scenes V5

Готово, не опубликовано. Новый SQL не нужен. V5 заменяет V2/V3 визуальную версию; старые отчёты относятся к предыдущим этапам.

## Подключение

Полностью прочитаны README_FIRST.txt, Codex_Prompt.txt и ASSET_DIMENSIONS.json; осмотрены FULL/MOBILE композиции и исторический identity reference. Все файлы пакета находятся в `assets/big-top/stage-v5/` и совпадают с ZIP побайтово (`reports/bigtop-v5-assets.json`).

- `03_STAGE_DUO`, `04_STAGE_BOMBO`, `05_STAGE_SKINNY`: responsive picture, MOBILE_FULLHEIGHT при max-width 760px, FULL на десктопе. Изображение height:100%, width:auto, без min-width, с горизонтальным центрированием и clip внутри одного reel. Пропорции сохраняются и при resize.
- Удалены маленькие центральные сцены, SVG caption crops V2 и размытый фон. V5 не содержит подписей, вмешательство в исходные изображения не требуется.
- Резкий факультативный `06_STAGE_BACKGROUND_FULL.png` закрывает только остающиеся боковые промежутки на широких reels; основной персонаж всегда занимает полную высоту. Нет размытия и полос сверху/снизу.
- Билет, плашки, две закрывающие панели взяты из V5. Панели используются только для close/open, не являются финальным фоном. Один winner и одна оригинальная плашка у нижней границы.
- Отдельного CURTAIN_OPEN_FRAME в V5 нет; готовые сцены уже содержат рамку, поэтому отсутствующего визуального состояния нет и вторая рамка не добавляется.
- V5 — новая поставленная пользователем художественная версия, отличающаяся деталями костюмов/реквизита от исторического identity sheet; использована без собственной генерации. Финальное художественное утверждение identity не подразумевается.

## Проверки

`python3 tools/bigtop-v5-check.py` — PASS:

1. Реальный spin с заданным seed: ticket → close → full-height duo → duel → close → final winner + plaque. Все изображения загружены.
2. Persistent active/idle остаются открытыми и используют тот же сохранённый result/DOM. F5 во время бонуса восстанавливает checkpoint; баланс заморожен до окончания; финальная выплата/статистика ровно один раз; повторный F5 не дублирует credit.
3. Viewport 320/375/390/430/1440: текущий src соответствует MOBILE/FULL, отношение ширины к высоте соответствует исходнику, изображение занимает полную высоту reel, соседние сцены независимы, плашки внутри reel, горизонтального overflow страницы нет.

Console errors: 0. Runtime errors: 0. Syntax встроенного JS/CurtainOverlay, Python compile, git diff --check: PASS.

Математические config/model всех поколений, wallet/auth runtime и SQL совпадают с опубликованным HEAD побайтово. Пройденные ранее 10 000 seeded model tests сохраняют применимость: модель не менялась. HUD, размер/количество reels и исходники остальных игр не изменены.

Физические iOS/Android не проверялись; mobile проверен в Chromium.

## Превью

Файлы в `/workspace/output/`:
- bigtop-v5-01-ticket.png
- bigtop-v5-02-closed.png
- bigtop-v5-03-duo.png
- bigtop-v5-04-final.png
- bigtop-v5-05-bonus-persisted.png
- bigtop-v5-bombo-wild.png
- bigtop-v5-skinny-x5.png
- bigtop-v5-adjacent-320.png / 375 / 390 / 430 / 1440

Соседние BOMBO/WILD и SKINNY/x5 — явные visual fixtures после проверки реального settlement, чтобы показать оба результата одновременно. Ticket/close/duo/final/persistent сняты в настоящем контроллере с тестовой локальной PostgreSQL, без production-запросов.
