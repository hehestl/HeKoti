# Документация Hekoti (RU)

## Обзор

Hekoti — open-source self-hosted вики, ориентированная на скорость, простую эксплуатацию и удобство админа.

Основные сценарии:

- Публичные страницы знаний с чистыми slug
- Редактирование и управление только админом
- Встроенный AI-чат для перевода, орфографии и поиска информации

## Архитектура

- Frontend + API: Next.js App Router
- База данных: PostgreSQL
- ORM: Prisma
- Опциональный кэш и rate-limit: Redis
- Авторизация: cookie-сессии + TOTP 2FA

## Режимы работы

- Публичное чтение + редактирование админом (по умолчанию)
- Полностью приватный режим (`PUBLIC_READ_MODE=false`)

## Настройка через ENV

Ключевые переменные:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (дефолты в Compose; из них собирается `DATABASE_URL` в контейнере приложения)
- `DATABASE_URL` (в Docker Compose необязателен: собирается из `POSTGRES_*` в `docker-entrypoint.sh`, если не задан явно)
- `REDIS_URL` (опционально)
- `PUBLIC_READ_MODE`
- `ENABLED_LANGUAGES`
- `HEKOTI_ADMIN_EMAIL`
- `HEKOTI_ADMIN_PASSWORD` — bootstrap-админ при пустой таблице `User` (дефолты `admin` / `hehe` из `.env.example`; в production задайте свои значения). Смена пароля после входа: **Админка → Аккаунт**.
- `AI_AGENTS_JSON`
- `DONATE_LINKS_JSON`
- `CRYPTO_DONATION_JSON`
- `LANGUAGETOOL_URL` (опционально, контейнер `hekoti-languagetool` в Docker Compose)

### Медиа (S3-compatible)

- `MEDIA_STORAGE=local` — dev: файлы в `public/uploads` (том `hekoti_uploads` в Compose)
- `MEDIA_STORAGE=s3` — prod: бинарники в bucket, в PostgreSQL только метаданные (`MediaAsset`)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- `ASSETS_BASE_URL` — CDN для локального режима

Пример MinIO: задайте `S3_ENDPOINT=https://minio.example.com`, `S3_PUBLIC_URL=https://cdn.example.com`, `forcePathStyle` включён автоматически при наличии endpoint.

## AI-агенты

Можно сразу подключать несколько провайдеров через `AI_AGENTS_JSON`.

Встроенные дефолты: OpenAI, Gemini, Claude, Grok, DeepSeek, Qwen, Copilot.

### Команды в админ-чате

- `/agent list`
- `/agent set <id>`
- `/agent on <id>`
- `/ask <текст>`

История чата сохраняется в БД (`AgentChannel` / `AgentMessage`) и отображается в админке.

## Основные API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/confirm`
- `GET|POST /api/agent/chat`
- `GET|POST /api/pages`
- `PATCH /api/pages/:id`
- `POST /api/media/upload`
- `POST /api/media/presign` — presigned PUT для видео (требует `MEDIA_STORAGE=s3`)
- `POST /api/media/complete` — регистрация видео после прямой загрузки в S3
- `GET /api/admin/media` — галерея медиа (метаданные в БД, файлы в S3 или `LOCAL_UPLOAD_DIR`)
- `DELETE /api/admin/media/:id` — удаление файла и soft-delete записи
- `POST /api/webhooks/incoming`
- `GET /api/health` — сводная проверка (БД обязательна для `200`)
- `GET /api/health/live`
- `GET /api/health/ready`
- `POST /api/spellcheck` — прокси к LanguageTool (только админ, нужен `LANGUAGETOOL_URL`)

## Чек-лист эксплуатации

1. Скопируйте `.env.example` в `.env` и смените секреты.
2. Перед первым запуском примените миграции.
3. Вынесите HTTPS на reverse proxy.
4. Мониторьте всплески 401/403 и ошибки вебхуков.
5. Делайте регулярный backup PostgreSQL.
