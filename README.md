> Ревью и оптимизации производительности: [CODE_REVIEW.md](CODE_REVIEW.md). Веб-сборка `python3 tools/build-site.py` создаёт `_site/index.html` и `_site/assets/embedded/`; размещать нужно **весь `_site`**. Корневой `index.html` остаётся автономным файлом.

# 777

Браузерный игровой хаб VAULT: **DIGITAL DERBY**, Poker Blitz, VAULT BREAKERS, Blackjack, Baccarat, Swamp Fishing, Mines, VAULT Heist, MAGNET и Critter Chaos.

[Открыть игры](https://kiryuhancev.github.io/777/). Для локального запуска достаточно
открыть `index.html`: изображения и логотип DIGITAL DERBY встроены в файл.

VAULT BREAKERS: [ассеты и архитектура](VAULT_BREAKERS.md), [измерение RTP](reports/breakers-rtp.md).

### Swamp collect-slot — working title

Added a separate haunted-swamp 5×3 collect-slot, using the supplied art pack. Source/assets, exact rules, measured simulation, safe bonus restore, screenshots and setup: [SWAMP_SLOT.md](SWAMP_SLOT.md). For an existing database, run the complete [TXT migration](supabase_swamp_slot.txt) once in Supabase SQL Editor before playing the new slot. Existing games remain unchanged.

### MINES

The seventh game is **MINES**, an ARCADE vault extraction grid using the existing shared wallet. See [MINES.md](MINES.md) for rules, formula, config, recovery protocol, screenshots/tests and simulation. Existing installations enable it by executing **all** of [supabase_mines.txt](supabase_mines.txt) in Supabase SQL Editor; balances/accounts are preserved. Do not apply older game-registry migrations after this update.

### Latest database update: admin + Swamp controls

For existing installations, run the **entire [supabase_admin_swamp.txt](supabase_admin_swamp.txt)** file once in SQL Editor, then refresh VAULT. It includes MINES activation and new bonus purchases; preserves funds/accounts; and securely enables ADMIN in the account menu for confirmed `al.kiryuhancev@yandex.ru`. See [ADMIN_SETUP.md](ADMIN_SETUP.md). Do not apply older registry migrations afterward. [SWAMP_SLOT.md](SWAMP_SLOT.md) documents the revised ~1/158 natural bonus frequency, RTP sample, AUTO choices and bonus pricing.

## VAULT HEIST

Новый Ways slot с шестью этапами, COLLECT / GO DEEPER и shared wallet. Для существующей БД выполнить целиком [supabase_heist.txt](supabase_heist.txt). [Конфигурация, симуляции, assets и проверки](VAULT_HEIST.md).

Обновление управления слотами и покупок HEIST / Scatter Boost: [SLOT_FEATURES.md](SLOT_FEATURES.md). Incremental migration для уже установленного HEIST: [supabase_slot_features.txt](supabase_slot_features.txt).
