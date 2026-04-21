# Security Notes (MVP)

This file describes the current Hekoti MVP security baseline and recommended hardening.

## Included now

- HTTP-only session cookies
- TOTP setup + confirm flow
- Login rate-limiting (Redis or memory fallback)
- Incoming webhook signature verification (`x-hekoti-signature`)
- Internal Docker networking for Postgres and Redis

## Recommended for production

- Reverse proxy with TLS + HSTS
- Strict CSP via middleware or platform headers
- CSRF protection for state-changing requests
- Tight CORS allowlist
- Fail2Ban or WAF for brute-force and scanning protection
- Secrets management outside plaintext `.env`

## Reverse proxy headers

Recommended minimum headers:

- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Dependency and image hygiene

- Run `npm audit` regularly
- Pin base image versions
- Rebuild and redeploy after security updates
- Enable **Dependabot** in GitHub (this repository ships `.github/dependabot.yml`) so vulnerable dependencies get upgrade PRs automatically
- For sensitive deploys, store secrets in **GitHub Actions secrets** (or your host’s secret manager), not in the repository
