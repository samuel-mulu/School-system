-- Add academic year link to payments (nullable until backfill)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

-- Drop old unique constraint (studentId + month + year)
DROP INDEX IF EXISTS "Payment_studentId_month_year_key";

-- Add foreign key
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_academicYearId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New unique: one payment per student per month per academic year
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_studentId_academicYearId_month_key"
  ON "Payment"("studentId", "academicYearId", "month");

CREATE INDEX IF NOT EXISTS "Payment_academicYearId_idx" ON "Payment"("academicYearId");
