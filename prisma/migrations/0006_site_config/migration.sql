-- AlterTable
ALTER TABLE "GlobalSettings" ADD COLUMN "enabledLanguagesJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GlobalSettings" ADD COLUMN "aiAgentsJson" TEXT NOT NULL DEFAULT '';