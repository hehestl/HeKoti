-- Soft delete for Page with partial unique path among active rows
ALTER TABLE "Page" ADD COLUMN "deletedAt" TIMESTAMPTZ;

CREATE INDEX "Page_deletedAt_idx" ON "Page"("deletedAt");
CREATE INDEX "Page_lang_deletedAt_idx" ON "Page"("lang", "deletedAt");

ALTER TABLE "Page" DROP CONSTRAINT IF EXISTS "Page_path_key";
DROP INDEX IF EXISTS "Page_path_key";

CREATE UNIQUE INDEX "Page_path_active_key"
ON "Page"("lang", "path")
WHERE "deletedAt" IS NULL;
