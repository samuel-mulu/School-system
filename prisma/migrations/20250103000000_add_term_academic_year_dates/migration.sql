-- Step 1: Delete existing terms (they need to be recreated with academic year)
-- If you want to keep existing terms, you'll need to manually assign them to an academic year first
DELETE FROM "Term";

-- Step 2: Add new columns to Term table (nullable first, then we'll make them required)
ALTER TABLE "Term" 
  ADD COLUMN "academicYearId" TEXT,
  ADD COLUMN "startDate" DATE,
  ADD COLUMN "endDate" DATE;

-- Step 3: AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearId_fkey" 
  FOREIGN KEY ("academicYearId") 
  REFERENCES "AcademicYear"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Step 4: Drop old unique constraint on name
DROP INDEX IF EXISTS "Term_name_key";

-- Step 5: Create new composite unique constraint
CREATE UNIQUE INDEX "Term_name_academicYearId_key" ON "Term"("name", "academicYearId");

-- Step 6: CreateIndex
CREATE INDEX "Term_academicYearId_idx" ON "Term"("academicYearId");

-- Step 7: Make columns required (this will fail if there are any NULL values)
-- Since we deleted all terms, this should work
ALTER TABLE "Term" 
  ALTER COLUMN "academicYearId" SET NOT NULL,
  ALTER COLUMN "startDate" SET NOT NULL;

