ALTER TABLE "Page" ADD COLUMN "icon" TEXT;
ALTER TABLE "Page" ADD COLUMN "isCategory" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Page_isCategory_idx" ON "Page"("isCategory");
