# Hekoti — Heron Auth SSO (OIDC PKCE)

Опциональный вход в wiki через Heron Auth. Включение: `HEKOTI_HERON_AUTH_ENABLED=1`.

Домены **только из `.env`** — в исходниках и Docker-образе нет fallback на legacy домены.

## Flow (Authorization Code + PKCE)

1. Пользователь открывает `/auth/login?auto=1&returnTo=/ru/admin` (Hub, bot, или admin redirect).
2. Wiki генерирует PKCE (`code_verifier` в `sessionStorage`) + `state` → redirect на `{heron}/oauth2/authorize?prompt=none` (silent) или без prompt (interactive).
3. Heron (сессия + MFA) → `302` на `{wiki}/auth/heron-callback?code=&state=`.
4. Callback → `POST /api/auth/heron/exchange` (BFF → internal `HERON_AUTH_API_URL/oauth2/token`) → cookie `hekoti_session`.
5. Редирект на `returnTo`.

При `error=login_required|interaction_required` на callback — автоматический retry без `prompt=none`.

Legacy fragment: `NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=1` (deprecated).

### Heron-first

| URL | Поведение |
|-----|-----------|
| `/ru/admin` | → `/auth/login?auto=1&returnTo=/ru/admin` → OIDC → admin |
| `/ru/login?local=1` | локальный email/password |

Deploy: [`ops-wiki-pkce-deploy.md`](ops-wiki-pkce-deploy.md).

## Environment

| Variable | Contour | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_HERON_AUTH_URL` | Browser | `https://id.hehestl.su` — bake at build |
| `NEXT_PUBLIC_APP_URL` | Browser | `https://wiki.hehestl.su` — bake at build |
| `NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID` | Browser | `hekoti-wiki` — bake at build |
| `HERON_AUTH_API_URL` | BFF | Internal: `http://heron-auth:8080` or WG IP |
| `HERON_JWT_ISSUER` | BFF verify | `https://id.hehestl.su` (JWT `iss` claim) |
| `HERON_JWT_AUDIENCE` | BFF verify | `hekoti-wiki` (OIDC `aud` = client_id) |
| `HERON_JWT_PUBLIC_KEY_PATH` | BFF verify | `/run/secrets/heron_jwt_public.pem` |

**Never** use `NEXT_PUBLIC_*` in server exchange routes.

Redirect URI (per host): `https://{host}/auth/heron-callback` — см. [`ops-world-hemonea-deploy.md`](ops-world-hemonea-deploy.md).

## JWT audience (OIDC)

Access token из `/oauth2/token` (PKCE) несёт `aud` = **OAuth `client_id`** (`hekoti-wiki`), не `hehe-ecosystem`.

```env
HERON_JWT_AUDIENCE=hekoti-wiki
HERON_OAUTH_CLIENT_ID=hekoti-wiki
```

Отдельного клиента `hekoti-world` в Hedra нет — `wiki` / `world` / `lore` на hemonea используют **`hekoti-wiki`** + свои redirect URI.

## preVerified / jti replay

`POST /api/auth/heron/exchange` верифицирует JWT один раз в route, затем передаёт результат в `resolveOrCreateUserFromHeron(accessToken, verified)`.

Без второго аргумента в **исходнике** `route.ts` второй `verifyHeronAccessToken` падает на `jti_replay` → UI: `Invalid Heron access token` при логе `jwt_verify ok`.

Проверка перед build:

```bash
grep resolveOrCreateUserFromHeron src/app/api/auth/heron/exchange/route.ts
# → resolveOrCreateUserFromHeron(resolved.accessToken, verified)
```

Deploy: `scripts/deploy-heron-preverified-fix.sh`. Runbook world: [`ops-world-hemonea-deploy.md`](ops-world-hemonea-deploy.md).

## Роль ADMIN

Роль из Heron service grant `hekoti` + `admin`. Пустые grants → `READER` → `/en/admin` редиректит на `/en`.

При `profile endpoints unavailable` в логах grants не подтянулись — выдать grant на Hedra или `UPDATE "User" SET role='ADMIN'` (см. runbook).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| PKCE session expired | Same tab, top-level redirects (not popup) |
| Exchange timeout | `HERON_AUTH_API_URL` internal, not public URL |
| Invalid OAuth state | Restart login from `/auth/login` |
| Old Heron domain in UI | Rebuild with `--no-cache` after `.env` change |
| `jwt_verify ok` + Invalid token | `route.ts` без `verified` 2nd arg → patch + `NO_CACHE` rebuild |
| `jwt_verify fail` | `HERON_JWT_AUDIENCE`, PEM mount, `HERON_JWT_ISSUER` |
| SSO OK, no admin | Grant `hekoti/admin` or DB role; avoid re-login until grant set |
| PEM is directory | Remove dir, copy file from `hh-heron-auth/secrets/` |
