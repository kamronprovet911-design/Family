# Моя семья — Telegram Mini App

Мобильное семейное приложение на Next.js + Supabase: защищённый вход через Telegram, карта Leaflet/OpenStreetMap, передача геолокации, личные realtime-чаты, голос, изображения, стикеры, уведомления и роли администратора.

## Быстрый запуск

1. В [Supabase Dashboard](https://supabase.com/dashboard) создайте проект. Откройте **SQL Editor**, вставьте и выполните содержимое `supabase/migrations/202608200001_initial.sql`.
2. В **Authentication → Providers** оставьте Email включённым. В **Authentication → URL Configuration** добавьте URL локальной среды и домен Vercel в Redirect URLs.
3. Скопируйте `.env.example` в `.env.local` и заполните URL проекта, publishable/anon key, service role key и токен бота. `SUPABASE_SERVICE_ROLE_KEY` и `TELEGRAM_BOT_TOKEN` задаются только в серверных переменных Vercel, они никогда не попадают в браузер.
4. Установите зависимости и запустите:

```bash
npm install
npm run dev
```

Обычный браузер не может безопасно сгенерировать Telegram `initData`; для end-to-end теста откройте приложение через бота. Для локальной проверки Mini App нужен HTTPS-туннель (например, Vercel preview).

## Telegram

1. В `@BotFather` создайте бота командой `/newbot`, сохраните токен в `TELEGRAM_BOT_TOKEN`.
2. Задайте кнопку меню: `/setmenubutton` → ваш бот → **Web App** → URL Vercel (только HTTPS).
3. В `@BotFather` при необходимости укажите тот же домен в настройках Web App.
4. Откройте кнопку меню в мобильном Telegram. Сервер проверяет HMAC `initData`, срок действия ограничен 24 часами, затем создаёт/находит Supabase Auth-пользователя и выдаёт короткий magic-link обмен только после проверки.

## Деплой Vercel

Импортируйте Git-репозиторий в Vercel, добавьте все переменные из `.env.example` в **Settings → Environment Variables** и сделайте deploy. PostgreSQL, Realtime и Storage находятся в Supabase, поэтому данные не зависят от Vercel redeploy.

## Безопасность и данные

- Включён RLS для всех прикладных таблиц; запросы ограничены `family_id` текущего пользователя.
- `family-media` — приватный bucket; доступ Storage ограничен семьёй.
- Голос и изображения загружаются в Storage, а не в PostgreSQL.
- `messages`, `locations`, `users`, `notifications` добавлены в `supabase_realtime` publication.
- Геолокация отправляется только при включённом переключателе и максимум один раз в 30 секунд.

## Медиа

Bucket остаётся приватным. После загрузки клиент получает signed URL из Supabase Storage и сохраняет его в сообщении; файл не публикуется напрямую. Для особенно строгих требований можно заменить годовой signed URL серверным endpoint, который обновляет URL при каждом открытии после проверки сессии.
