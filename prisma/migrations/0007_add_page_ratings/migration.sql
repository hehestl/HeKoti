-- CreateEnum
CREATE TYPE "PageReaction" AS ENUM ('BROKEN', 'NEUTRAL', 'LOVED');

-- CreateTable
CREATE TABLE "PageRating" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" "PageReaction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageRating_pageId_idx" ON "PageRating"("pageId");

-- CreateIndex
CREATE INDEX "PageRating_userId_idx" ON "PageRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PageRating_pageId_userId_key" ON "PageRating"("pageId", "userId");

-- AddForeignKey
ALTER TABLE "PageRating" ADD CONSTRAINT "PageRating_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRating" ADD CONSTRAINT "PageRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
