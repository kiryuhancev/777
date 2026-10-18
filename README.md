# 777

Браузерный игровой хаб: **DIGITAL DERBY**, Poker Blitz и VAULT BREAKERS.

[Открыть игры](https://kiryuhancev.github.io/777/). Для локального запуска достаточно
открыть `index.html`: изображения и логотип DIGITAL DERBY встроены в файл.

VAULT BREAKERS: [ассеты и архитектура](VAULT_BREAKERS.md), [измерение RTP](reports/breakers-rtp.md).

### Swamp collect-slot — working title

Added a separate haunted-swamp 5×3 collect-slot, using the supplied art pack. Source/assets, exact rules, measured simulation, safe bonus restore, screenshots and setup: [SWAMP_SLOT.md](SWAMP_SLOT.md). For an existing database, run the complete [TXT migration](supabase_swamp_slot.txt) once in Supabase SQL Editor before playing the new slot. Existing games remain unchanged.

### MINES

The seventh game is **MINES**, an ARCADE vault extraction grid using the existing shared wallet. See [MINES.md](MINES.md) for rules, formula, config, recovery protocol, screenshots/tests and simulation. Existing installations enable it by executing **all** of [supabase_mines.txt](supabase_mines.txt) in Supabase SQL Editor; balances/accounts are preserved. Do not apply older game-registry migrations after this update.
