-- PageScope for wiki vs internal admin notes
CREATE TYPE "PageScope" AS ENUM ('WIKI', 'NOTES');

ALTER TABLE "Page" ADD COLUMN "scope" "PageScope" NOT NULL DEFAULT 'WIKI';
ALTER TABLE "Page" ADD COLUMN "systemKey" TEXT;

UPDATE "Page" SET "scope" = 'WIKI' WHERE "scope" IS NULL;

CREATE INDEX "Page_lang_scope_idx" ON "Page"("lang", "scope");

CREATE UNIQUE INDEX "Page_lang_systemKey_key" ON "Page"("lang", "systemKey") WHERE "systemKey" IS NOT NULL;
