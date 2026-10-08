# VAULT brand asset

`vault-mark.png` — прозрачный портал, подготовленный из предоставленного изображения. Бордовый фон не включён в отображаемый знак. Один и тот же asset используется в шапке и авторизации; wordmark VAULT сверстан отдельным текстом.

Чтобы заменить знак, замените `assets/vault-mark.png` и выполните `python3 tools/embed-vault.py`. HTML остаётся автономным: сборщик встраивает файл в оба места. Для будущего SVG измените формирование `mark` в сборщике; размеры и object-fit задаются CSS независимо от intrinsic dimensions.

Brand/header/auth CSS находится в `vault/auth.css`, форма — `vault/auth.html`. Логика Supabase в `vault/runtime.js` сохранена; изменены только подписи, loading state и меню профиля.
