-- Step 1: Add gradeId to Subject as nullable
ALTER TABLE "Subject" ADD COLUMN "gradeId" TEXT;

-- Step 2: Populate gradeId from Class.gradeId via the existing classId
UPDATE "Subject" 
SET "gradeId" = "Class"."gradeId"
FROM "Class"
WHERE "Subject"."classId" = "Class"."id" AND "Class"."gradeId" IS NOT NULL;

-- Step 2.5: Handle duplicate subjects (same name in same grade from different classes)
-- Keep the first subject per grade+name, update marks to point to it, then delete duplicates
DO $$
DECLARE
    dup_record RECORD;
    keep_id TEXT;
BEGIN
    FOR dup_record IN 
        SELECT "gradeId", "name", array_agg("id" ORDER BY "createdAt") as subject_ids
        FROM "Subject"
        WHERE "gradeId" IS NOT NULL
        GROUP BY "gradeId", "name"
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (oldest) subject
        SELECT subject_ids[1] INTO keep_id FROM (SELECT dup_record.subject_ids as subject_ids) t;
        
        -- Update marks to point to the kept subject
        UPDATE "Mark" 
        SET "subjectId" = keep_id
        WHERE "subjectId" = ANY(dup_record.subject_ids[2:array_length(dup_record.subject_ids, 1)]);
        
        -- Update sub-exams to point to the kept subject
        UPDATE "SubExam"
        SET "subjectId" = keep_id
        WHERE "subjectId" = ANY(dup_record.subject_ids[2:array_length(dup_record.subject_ids, 1)]);
        
        -- Delete duplicate subjects
        DELETE FROM "Subject"
        WHERE "id" = ANY(dup_record.subject_ids[2:array_length(dup_record.subject_ids, 1)]);
    END LOOP;
END $$;

-- Step 3: Make gradeId non-nullable and add foreign key
ALTER TABLE "Subject" ALTER COLUMN "gradeId" SET NOT NULL;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Drop the old classId column and its constraint
ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_classId_fkey";
ALTER TABLE "Subject" DROP COLUMN "classId";

-- Step 5: Update unique constraint
DROP INDEX IF EXISTS "Subject_classId_name_key";
CREATE UNIQUE INDEX "Subject_gradeId_name_key" ON "Subject"("gradeId", "name");

-- Step 6: Update index
DROP INDEX IF EXISTS "Subject_classId_idx";
CREATE INDEX "Subject_gradeId_idx" ON "Subject"("gradeId");

-- Step 7: Add gradeId to SubExam as nullable
ALTER TABLE "SubExam" ADD COLUMN "gradeId" TEXT;

-- Step 8: Populate gradeId from Subject.gradeId
UPDATE "SubExam"
SET "gradeId" = "Subject"."gradeId"
FROM "Subject"
WHERE "SubExam"."subjectId" = "Subject"."id" AND "Subject"."gradeId" IS NOT NULL;

-- Step 9: Make gradeId non-nullable and add foreign key
ALTER TABLE "SubExam" ALTER COLUMN "gradeId" SET NOT NULL;
ALTER TABLE "SubExam" ADD CONSTRAINT "SubExam_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Drop the old termId column and its constraint
ALTER TABLE "SubExam" DROP CONSTRAINT IF EXISTS "SubExam_termId_fkey";
ALTER TABLE "SubExam" DROP COLUMN "termId";

-- Step 11: Update unique constraint
DROP INDEX IF EXISTS "SubExam_subjectId_termId_name_key";
CREATE UNIQUE INDEX "SubExam_gradeId_subjectId_name_key" ON "SubExam"("gradeId", "subjectId", "name");

-- Step 12: Update indexes
DROP INDEX IF EXISTS "SubExam_termId_idx";
DROP INDEX IF EXISTS "SubExam_subjectId_termId_idx";
CREATE INDEX "SubExam_gradeId_idx" ON "SubExam"("gradeId");
CREATE INDEX "SubExam_gradeId_subjectId_idx" ON "SubExam"("gradeId", "subjectId");
