-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'READER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "heronSubjectId" TEXT;

-- Migrate legacy string roles to enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE WHEN LOWER("role") = 'admin' THEN 'ADMIN'::"UserRole" ELSE 'READER'::"UserRole" END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'READER';

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_heronSubjectId_key" ON "User"("heronSubjectId");
