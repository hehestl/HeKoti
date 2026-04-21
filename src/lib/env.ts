import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://hekoti:hekoti@localhost:5432/hekoti?schema=public"),
  APP_URL: z.string().default("http://localhost:3310"),
  PORT: z.string().default("3310"),
  SESSION_TTL_HOURS: z.coerce.number().default(720),
  SESSION_COOKIE_NAME: z.string().default("hekoti_session"),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().default(900),
  RATE_LIMIT_LOGIN_ATTEMPTS: z.coerce.number().default(8),
  PUBLIC_READ_MODE: z.coerce.boolean().default(true),
  ENABLED_LANGUAGES: z.string().default("en,ru"),
  HEKOTI_ADMIN_EMAIL: z.string().default("admin@hekoti.local"),
  HEKOTI_ADMIN_PASSWORD: z.string().default("change-me-now"),
  WEBHOOK_SECRET: z.string().default("change-me"),
  OUTGOING_WEBHOOK_URLS: z.string().default(""),
  DONATE_LINKS_JSON: z.string().default("[]"),
  CRYPTO_DONATION_JSON: z.string().default("[]"),
  AI_LINKS_JSON: z.string().default("[]"),
  AI_AGENTS_JSON: z.string().default("[]"),
  ASSETS_BASE_URL: z.string().default(""),
  LOCAL_UPLOAD_DIR: z.string().default("public/uploads"),
});

export const env = envSchema.parse(process.env);
