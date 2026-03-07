-- AlterTable: Remove assignedDate and dueDate, add date
ALTER TABLE "Homework" DROP COLUMN IF EXISTS "assignedDate";
ALTER TABLE "Homework" DROP COLUMN IF EXISTS "dueDate";
ALTER TABLE "Homework" ADD COLUMN IF NOT EXISTS "date" DATE NOT NULL DEFAULT CURRENT_DATE;

-- Drop old unique constraint
DROP INDEX IF EXISTS "Homework_studentId_subjectId_dueDate_key";

-- Create new unique constraint with date
CREATE UNIQUE INDEX IF NOT EXISTS "Homework_studentId_subjectId_date_key" ON "Homework"("studentId", "subjectId", "date");

-- Drop old index on dueDate
DROP INDEX IF EXISTS "Homework_dueDate_idx";

-- Create new index on date
CREATE INDEX IF NOT EXISTS "Homework_date_idx" ON "Homework"("date");
