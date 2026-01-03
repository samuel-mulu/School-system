-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TermStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PROMOTED', 'REPEATED', 'GRADUATED');

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isHighest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_name_key" ON "Grade"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_order_key" ON "Grade"("order");

-- CreateIndex
CREATE INDEX "Grade_order_idx" ON "Grade"("order");

-- CreateIndex
CREATE INDEX "Grade_isHighest_idx" ON "Grade"("isHighest");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE INDEX "AcademicYear_status_idx" ON "AcademicYear"("status");

-- CreateIndex
CREATE INDEX "AcademicYear_name_idx" ON "AcademicYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- AlterTable: Add status to Term (with default)
ALTER TABLE "Term" ADD COLUMN "status" "TermStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex for Term status
CREATE INDEX "Term_status_idx" ON "Term"("status");

-- AlterTable: Add new columns to Class (nullable for now)
ALTER TABLE "Class" ADD COLUMN "academicYearId" TEXT;
ALTER TABLE "Class" ADD COLUMN "gradeId" TEXT;

-- AlterTable: Add promotionStatus to StudentClass (nullable)
ALTER TABLE "StudentClass" ADD COLUMN "promotionStatus" "PromotionStatus";

-- AddForeignKey for Class -> AcademicYear
ALTER TABLE "Class" ADD CONSTRAINT "Class_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for Class -> Grade
ALTER TABLE "Class" ADD CONSTRAINT "Class_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for Class
CREATE INDEX "Class_academicYearId_idx" ON "Class"("academicYearId");
CREATE INDEX "Class_gradeId_idx" ON "Class"("gradeId");

-- CreateIndex for StudentClass
CREATE INDEX "StudentClass_promotionStatus_idx" ON "StudentClass"("promotionStatus");

-- Migrate existing academicYear string data to AcademicYear records
-- First, create AcademicYear records from unique academicYear values
INSERT INTO "AcademicYear" ("id", "name", "startDate", "endDate", "status", "createdAt", "updatedAt")
SELECT 
    uuid_generate_v4()::text as "id",
    "academicYear" as "name",
    CURRENT_TIMESTAMP as "startDate",
    NULL as "endDate",
    'CLOSED'::"AcademicYearStatus" as "status",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM (
    SELECT DISTINCT "academicYear"
    FROM "Class"
    WHERE "academicYear" IS NOT NULL
) AS unique_years
ON CONFLICT ("name") DO NOTHING;

-- Update Class records to link to AcademicYear
UPDATE "Class" c
SET "academicYearId" = ay."id"
FROM "AcademicYear" ay
WHERE c."academicYear" = ay."name"
AND c."academicYear" IS NOT NULL;

-- Note: We keep the academicYear column for now to avoid data loss
-- It can be dropped later after verifying the migration worked correctly

