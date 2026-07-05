import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Set to "1" if production is served over HTTP (no TLS) so session cookies are not Secure-only. */
  SESSION_COOKIE_INSECURE: z.enum(["0", "1"]).optional(),
  DATABASE_URL: z.string().default("postgresql://hekoti:hekoti@localhost:5432/hekoti?schema=public"),
  APP_URL: z.string().default("http://localhost:3310"),
  PORT: z.string().default("3310"),
  SESSION_TTL_HOURS: z.coerce.number().default(720),
  SESSION_COOKIE_NAME: z.string().default("hekoti_session"),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  PUBLIC_READ_MODE: z.coerce.boolean().default(true),
  ENABLED_LANGUAGES: z.string().default("en,ru"),
  /** Site title (tab, og:title). Empty → GlobalSettings → default. */
  SITE_TITLE: z.string().default(""),
  /** Meta description. Empty → GlobalSettings → default. */
  SITE_DESCRIPTION: z.string().default(""),
  /** 1 = index site, 0 = noindex. Unset → GlobalSettings.robotsIndexSite. */
  SITE_ROBOTS_INDEX: z.enum(["0", "1"]).optional(),
  /** 1 = allow AI crawlers, 0 = block in robots.txt. Unset → GlobalSettings. */
  AI_CRAWLERS_ALLOW: z.enum(["0", "1"]).optional(),
  /** Extra markdown for /llms.txt. Empty → GlobalSettings.llmsTxtExtra. */
  LLMS_TXT_EXTRA: z.string().default(""),
  HEKOTI_ADMIN_EMAIL: z.string().default("admin"),
  HEKOTI_ADMIN_PASSWORD: z.string().default("hehe"),
  AUTH_PENDING_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().default("change-me"),
  OUTGOING_WEBHOOK_URLS: z.string().default(""),
  DONATE_LINKS_JSON: z.string().default("[]"),
  CRYPTO_DONATION_JSON: z.string().default("[]"),
  AI_LINKS_JSON: z.string().default("[]"),
  AI_AGENTS_JSON: z.string().default("[]"),
  ASSETS_BASE_URL: z.string().default(""),
  LOCAL_UPLOAD_DIR: z.string().default("public/uploads"),
  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  MEDIA_MAX_IMAGE_BYTES: z.coerce.number().default(10 * 1024 * 1024),
  MEDIA_MAX_VIDEO_BYTES: z.coerce.number().default(100 * 1024 * 1024),
  MEDIA_PRESIGN_TTL_SECONDS: z.coerce.number().default(900),
  /** Optional LanguageTool HTTP API (e.g. http://hekoti-languagetool:8010). */
  LANGUAGETOOL_URL: z.string().optional(),
  /**
   * 32-byte key for AES-256-GCM encryption of TOTP secrets at rest (hex 64 chars or base64).
   * If unset, a key is derived from WEBHOOK_SECRET (weaker if the webhook secret is guessable).
   */
  HEKOTI_TOTP_ENCRYPTION_KEY: z.string().optional(),
  HEKOTI_HERON_AUTH_ENABLED: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_HERON_AUTH_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  HERON_AUTH_API_URL: z.string().optional(),
  HERON_JWT_ISSUER: z.string().optional(),
  HERON_JWT_AUDIENCE: z.string().optional(),
  HERON_OAUTH_CLIENT_ID: z.string().optional(),
  HERON_JWT_PUBLIC_KEY_PEM: z.string().optional(),
  HERON_JWT_PUBLIC_KEY_PATH: z.string().optional(),
  HERON_FETCH_TIMEOUT_MS: z.string().optional(),
  HEKOTI_HERON_DEFAULT_RETURN: z.string().default("/ru/admin"),
  HEKOTI_HERON_EXCHANGE_RATE_LIMIT: z.coerce.number().default(20),
  HEHE_CHAT_API_URL: z.string().optional(),
  HEHE_CHAT_PUBLIC_URL: z.string().optional(),
  HEKOTI_FORWARD_TOKEN: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

function requireStrongSecret(name: string, value?: string, minLength = 32) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} chars in production.`);
  }
}

function requireHeronPkceEnv() {
  const missing: string[] = [];
  if (!parsed.HERON_AUTH_API_URL?.trim()) missing.push("HERON_AUTH_API_URL");
  if (!parsed.HERON_JWT_ISSUER?.trim()) missing.push("HERON_JWT_ISSUER");
  if (!parsed.HERON_OAUTH_CLIENT_ID?.trim()) missing.push("HERON_OAUTH_CLIENT_ID");
  if (missing.length) {
    throw new Error(
      `Heron PKCE enabled but missing: ${missing.join(", ")}. Set in .env / docker-compose.`,
    );
  }
}

if (parsed.NODE_ENV === "production" && process.env.HEKOTI_ENFORCE_PROD_SECRETS === "1") {
  requireStrongSecret("WEBHOOK_SECRET", parsed.WEBHOOK_SECRET);
  requireStrongSecret("AUTH_PENDING_SECRET", parsed.AUTH_PENDING_SECRET);
  requireStrongSecret("HEKOTI_TOTP_ENCRYPTION_KEY", parsed.HEKOTI_TOTP_ENCRYPTION_KEY);
}

if (parsed.HEKOTI_HERON_AUTH_ENABLED === "1" && parsed.NODE_ENV === "production") {
  requireHeronPkceEnv();
}

export const env = parsed;
