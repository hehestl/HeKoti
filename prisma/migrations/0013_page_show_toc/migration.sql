-- AlterTable
ALTER TABLE "Page" ADD COLUMN "showToc" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows (safety)
UPDATE "Page" SET "showToc" = true WHERE "showToc" IS NULL;
