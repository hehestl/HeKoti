# Hekoti — Heron Auth SSO

Опциональный вход в wiki (`wiki.hehestl.com`) через Heron Auth. Включение: `HEKOTI_HERON_AUTH_ENABLED=1`.

## Flow

1. Пользователь открывает wiki (кнопка в heron_bot или `/auth/login?auto=1&returnTo=/ru/admin`).
2. Wiki генерирует OAuth `state` → редирект на `{heron}/login?return_to={wiki}/auth/heron-callback?state&returnTo`.
3. Heron (если сессия есть — silent) → callback с `#access_token`.
4. Callback проверяет `state` → `POST /api/auth/heron/exchange` → cookie `hekoti_session`.
5. Редирект на `returnTo` (admin для `ADMIN`, иначе `/`).

### Heron-first (после включения SSO)

Без сессии wiki сразу отправляет на Heron, без промежуточной страницы `/ru/login`:

| URL | Поведение |
|-----|-----------|
| `/ru/admin` | → `/auth/login?auto=1&returnTo=/ru/admin` → Heron → admin |
| `/ru/a`, `/ru/l` | то же (алиасы админки) |
| `/ru/login` | auto-redirect на Heron |
| `/ru/login?local=1` | локальный email/password (escape hatch) |

Реализация: [`src/lib/auth-routes.ts`](../src/lib/auth-routes.ts) — `redirectToLogin()`, `isHeronSsoEnabled()`.

### Пример URL (бот → wiki)

```
https://wiki.hehestl.com/auth/login?auto=1&returnTo=/ru/admin
```

## Роли

| Heron grant | Локальная роль | Доступ |
|-------------|----------------|--------|
| нет grant | `READER` | Чтение wiki (будущие избранное/оценки) |
| `hekoti` + `admin` | `ADMIN` | Админка `/ru/admin` |

Grant хранится в Hedra: `heron.service_grants`.

```sql
INSERT INTO heron.service_grants (user_id, service_key, role, granted_by)
VALUES (
  'your-heron-user-uuid',
  'hekoti',
  'admin',
  'your-heron-user-uuid'
)
ON CONFLICT (user_id, service_key) DO UPDATE SET role = EXCLUDED.role;
```

Узнать `user_id`: `SELECT id, email FROM public.users WHERE email = 'you@example.com';`

Пример seed: [`hehestl-db-hedra/ops/heron-auth/seed-hekoti-wiki-admin.sql.example`](../../hehestl-db-hedra/ops/heron-auth/seed-hekoti-wiki-admin.sql.example)

## Environment (Hekoti)

| Variable | Description |
|----------|-------------|
| `HEKOTI_HERON_AUTH_ENABLED` | `1` — включить SSO |
| `APP_URL` | Публичный URL wiki (`https://wiki.hehestl.com`) — Secure cookie за прокси |
| `NEXT_PUBLIC_HERON_AUTH_URL` | Публичный UI Heron (default `https://heron.hehestl.com`) |
| `HERON_AUTH_API_URL` | API для `/api/auth/me` и `/api/auth/me/service-grants` |
| `HERON_JWT_ISSUER` | JWT issuer |
| `HERON_JWT_AUDIENCE` | JWT audience (e.g. `hehe-ecosystem`) |
| `HERON_JWT_PUBLIC_KEY_PATH` | Prod: bind mount EdDSA public PEM (preferred) |
| `HERON_JWT_PUBLIC_KEY_PEM` | Dev: inline PEM |
| `HEKOTI_HERON_DEFAULT_RETURN` | После входа admin (default `/ru/admin`) |
| `HEKOTI_HERON_EXCHANGE_RATE_LIMIT` | Exchange requests per minute per IP/sub (default 20) |

## Heron allowlist

В `HERON_OAUTH_RETURN_TO_ALLOWLIST` (ops/heron-auth):

- `https://wiki.hehestl.com/auth/heron-callback`
- `https://wiki.hehestl.com/auth/login`

## heron_bot

```env
HEKOTI_HERON_SSO_ENABLED=1
HEHESTL_WIKI_URL=https://wiki.hehestl.com
HEKOTI_HERON_DEFAULT_RETURN=/ru/admin
```

Кнопка wiki ведёт на `/auth/login?auto=1&returnTo=…` вместо голого домена.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Нет `#access_token` в callback | Проверить allowlist; завершить login в Heron |
| 401 Invalid token | `HERON_JWT_PUBLIC_KEY_PATH` / PEM, `HERON_JWT_ISSUER`, `HERON_JWT_AUDIENCE` — см. [`heron-jwt-public-key-consumers.md`](../../hehestl-db-hedra/ops/heron-auth/docs/heron-jwt-public-key-consumers.md) |
| 401 Heron profile unavailable | `HERON_AUTH_API_URL`, сеть до Heron |
| READER вместо ADMIN | Нет grant `hekoti:admin` в `heron.service_grants` |
| Cookie не ставится | `APP_URL` https или `X-Forwarded-Proto: https`; `SESSION_COOKIE_INSECURE=1` только для HTTP dev |
| Invalid OAuth state | Начать вход заново с `/auth/login?auto=1` (тот же браузер, без приватного режима) |

## Smoke checklist

- [ ] Миграция `0123_heron_service_grants` накатана на Hedra
- [ ] Grant `hekoti:admin` для вашего Heron user
- [ ] `HEKOTI_HERON_AUTH_ENABLED=1` + JWT env + `APP_URL=https://wiki.hehestl.com` на wiki
- [ ] Allowlist обновлён, heron-auth перезапущен
- [ ] `/ru/admin` без cookie → Heron → `/ru/admin` (admin grant)
- [ ] `/auth/login?auto=1&returnTo=/ru/admin` → то же
- [ ] Heron Hub → плитка Hekoti → `/ru/admin`
- [ ] Пользователь без grant → READER, `/ru/admin` редирект на главную
- [ ] `/ru/login?local=1` → форма email/password
- [ ] `HEKOTI_HERON_AUTH_ENABLED=0` → старый login email/password

## Отключение

`HEKOTI_HERON_AUTH_ENABLED=0` (default) — модуль не активен, локальный login без изменений.
