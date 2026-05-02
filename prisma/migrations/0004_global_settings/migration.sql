-- GlobalSettings: head/body HTML snippets (counters, etc.) edited from admin UI.
CREATE TABLE IF NOT EXISTS "GlobalSettings" (
    "id" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "headHtml" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "GlobalSettings" ("id", "defaultLanguage", "headHtml", "bodyHtml", "updatedAt")
SELECT 'default', 'en', '', '', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "GlobalSettings" WHERE "id" = 'default');
