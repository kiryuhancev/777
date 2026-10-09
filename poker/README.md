# Poker Blitz presentation

Визуальный слой: `presentation.css` + `assets/poker-scene.webp`. Дилер/стол/окружение — декоративный фон без игровых карт. Карты, рубашки и функциональные узлы используются из существующего HTML renderer. Если фон не загрузится, сцена сохраняет бордовую подложку и функциональный DOM.

Вёрстка: dealer → community → выбор (только когда текущая логика его показывает) → player → текущие bet/actions. HANDS перенесён в угол сцены; детали раздачи свёрнуты. Новых poker actions нет.

`python3 tools/embed-vault.py` встраивает CSS и фон в автономный index.html. `python3 tools/poker-scene-check.py` проверяет браузерные сценарии с изолированным Supabase SDK/API fixture и сравнивает игровые скрипты с исходной версией e531074.

До изменения сохранён `/workspace/output/VAULT_before_poker_visual.html`; новая самостоятельная версия — `/workspace/output/VAULT_Poker_Blitz_v2.html`.
