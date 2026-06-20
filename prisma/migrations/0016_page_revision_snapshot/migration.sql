-- PageRevision: full snapshot metadata + contentHash/sizeBytes/summary
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "showToc" BOOLEAN;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "isCategory" BOOLEAN;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "navOrder" INTEGER;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "PageRevision" ADD COLUMN IF NOT EXISTS "summary" TEXT;

ALTER TABLE "PageRevision" ALTER COLUMN "contentMd" SET DEFAULT '';

CREATE INDEX IF NOT EXISTS "PageRevision_pageId_createdAt_idx" ON "PageRevision"("pageId", "createdAt" DESC);
