# VAULT HEIST — approved separate symbols

Все 15 игровых символов подключены напрямую из предоставленного пользователем `VAULT_HEIST_symbols_separate_for_Codex.zip`. Исходные WebP скопированы побайтово: без обрезки, перекодирования, удаления фона и перерисовки. Прозрачность и пропорции сохранены.

Оригиналы находятся в `assets/heist/approved-symbols/isolated_webp/`:

| Game ID | Original WebP |
| --- | --- |
| mask | mask.webp |
| gloves | tactical_glove.webp |
| flashlight | flashlight.webp |
| card | access_card.webp |
| tablet | hacker_tablet.webp |
| bag | duffel_bag.webp |
| cutter | laser_cutter.webp |
| override | override_module.webp |
| gold | gold_bar.webp |
| diamond | diamond.webp |
| artifact | artifact_capsule.webp |
| core | vault_core.webp |
| wild | wild_master_key.webp |
| scatter | scatter_vault_seal.webp |
| grand | grand_take.webp |

Весь архив также сохранён: `reference_crops/` содержит предоставленные автором растровые эталоны; `README_FOR_CODEX.txt` — его описание. Эти эталоны не используются вместо отдельных спрайтов в ячейках. `manifest.json` фиксирует SHA-256 оригинального архива, SHA-256 каждого игрового файла, размеры и границы прозрачности.

В исходниках много прозрачного пространства вокруг предметов. `VAULT_HEIST_SYMBOL_SCALE` в `heist/assets.js` увеличивает только отображение полного изображения. `object-fit: contain` сохраняет пропорции, а видимые края остаются внутри ячейки даже во время пульсации выигрыша. Дополнительный цветовой фильтр/тень к новым символам не применяется. Те же оригиналы используются в таблице выплат и стопке добычи.

`tools/prepare-heist-assets.py` относится к старому сгенерированному sheet и **не применяется** к этому архиву. Прежние файлы сохранены; отдельный старый Alarm остаётся служебным fallback, потому что в новом наборе его нет. Окружение и карточка лобби пока прежние, до получения следующих материалов. Надписи на визуальном референсе не меняют правила игры.

Игровая математика, RNG, ставки, выплаты, этапы, бонусные покупки, общий wallet, авторизация, БД и остальные игры не изменены. Миграция БД для этого визуального обновления не нужна.

Сборка: `python tools/embed-vault.py`, затем `python tools/build-site.py` и `node --check /tmp/digital-derby-release.js`. Встраивание сохраняет оригинальные байты WebP в data URL, поэтому HTML по-прежнему автономен.

Проверка `python tools/heist-symbols-check.py` прошла в Chromium: реальные HTML/Auth SDK через HTTP fixture, 15 оригиналов, paytable, desktop/mobile, пять размеров экрана 320–1440 px, геометрия видимых краёв при максимальной пульсации ×1.075, unique IDs и пустая консоль ошибок. Превью всех 15 создаётся только подменой DOM в тесте: фиктивный раунд не сохраняется и баланс не меняется. Отчёт: `reports/heist-approved-symbols-browser.json`.

Дополнительно прошли 12 существующих математических suites и `tools/heist-auto-check.py` (AUTO/выбор/STOP). Побайтовое сравнение с предыдущей версией подтвердило неизменность всего HTML вне HEIST STYLES/MODULE, включая остальные игры, общий runtime, lobby/auth, и неизменность `heist/model.js`, `config.js`, `screen.html`.
