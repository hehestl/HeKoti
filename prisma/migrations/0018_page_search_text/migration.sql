ALTER TABLE "Page" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Page_searchText_trgm_wiki_idx"
  ON "Page" USING gin ("searchText" gin_trgm_ops)
  WHERE "deletedAt" IS NULL AND "scope" = 'WIKI';
