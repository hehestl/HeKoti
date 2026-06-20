-- Admin UI language + temporary wiki path redirects (7-day TTL)
ALTER TABLE "GlobalSettings" ADD COLUMN "adminLanguage" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE "PageRedirect" (
  "id" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "fromPath" TEXT NOT NULL,
  "toPath" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PageRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageRedirect_lang_fromPath_key" ON "PageRedirect"("lang", "fromPath");
CREATE INDEX "PageRedirect_expiresAt_idx" ON "PageRedirect"("expiresAt");
