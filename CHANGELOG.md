# VAULT — auth entry and shared game shell

- Стартовый экран — обязательный вход/регистрация; до входа баланс, каталог, навигация и начало раунда закрыты.
- Восстановление доступа происходит через сохранённую SDK-сессию; отдельный local cache профиля сам по себе не открывает игры.
- Игры остаются внутри оформления VAULT с общей шапкой, кошельком, identity и возвратом к каталогу.
- Digital Derby: новый фон стадиона, объёмная рамка, логотип поверх верхней грани и компактный раскрывающийся справочник.
- Более частые движения корпуса/переноса веса футболистов; одинаковая высота, симметричные зоны и отсутствие пересечения с символами сохранены. Reduced motion учитывается.
- Новый browser check для закрытого входа, общей оболочки, F5 и адаптации 320–1440px.

# VAULT — persistence/auth foundation

- Добавлены изолированные VaultStorage, VaultAuth, VaultProfileService, VaultWalletService, VaultStatsService, VaultRoundService и VaultRecovery.
- Один существующий `state.balance` сохраняется между reload; ставки, звук/музыка, FAST и последняя игра восстанавливаются из явного whitelist.
- Для раундов введены UUID, started/settled/cancelled, защита от повторного debit/payout/logging, checkpoints бонуса и отмена незавершённых визуальных/физических этапов без возврата ставки.
- Добавлены компактные SIGN IN / CREATE ACCOUNT / SIGN OUT, identity/initials, boot state и sync status в лобби. Его бордово-кремовое оформление сохранено; название хаба приведено к VAULT.
- Supabase подключается через единый public config; guest работает без подключения. Auth session persistence, owner-bound cache, bounded outbox, retry и конфликты wallet revision подготовлены и проверены с SDK/HTTP fixtures.
- `supabase_schema.sql`: профиль, кошелёк, настройки, rounds/stats/achievements, trigger, RLS, ограниченные grants и идемпотентные RPC.
- `.gitlab-ci.yml` публикует готовый HTML без npm/backend/build; `SUPABASE_SETUP.md` описывает подключение и ограничения.
- Внутренние CSS игр, RNG и rigid-body solver не изменены. Добавлены только wallet/round/save hooks.
