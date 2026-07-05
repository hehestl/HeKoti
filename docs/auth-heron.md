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
| `HERON_OAUTH_CLIENT_ID` | BFF | `hekoti-wiki` |

**Never** use `NEXT_PUBLIC_*` in server exchange routes.

## OAuth client

Redirect URI: `https://wiki.hehestl.su/auth/heron-callback` (migration `0138`).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| PKCE session expired | Same tab, top-level redirects (not popup) |
| Exchange timeout | `HERON_AUTH_API_URL` internal, not public URL |
| Invalid OAuth state | Restart login from `/auth/login` |
| Old Heron domain in UI | Rebuild with `--no-cache` after `.env` change |
