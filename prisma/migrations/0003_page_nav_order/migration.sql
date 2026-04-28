-- Custom order in wiki sidebar lists (move up / down within same folder).
ALTER TABLE "Page" ADD COLUMN "navOrder" INTEGER NOT NULL DEFAULT 0;
