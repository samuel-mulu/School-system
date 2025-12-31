-- Delete existing marks as they are incompatible with new structure
DELETE FROM "Mark";

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubExam" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "examType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Term_name_key" ON "Term"("name");

-- CreateIndex
CREATE INDEX "Term_name_idx" ON "Term"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubExam_subjectId_termId_name_key" ON "SubExam"("subjectId", "termId", "name");

-- CreateIndex
CREATE INDEX "SubExam_subjectId_idx" ON "SubExam"("subjectId");

-- CreateIndex
CREATE INDEX "SubExam_termId_idx" ON "SubExam"("termId");

-- CreateIndex
CREATE INDEX "SubExam_subjectId_termId_idx" ON "SubExam"("subjectId", "termId");

-- AlterTable
ALTER TABLE "Mark" DROP COLUMN "term",
ADD COLUMN     "termId" TEXT NOT NULL,
ADD COLUMN     "subExamId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Mark_studentId_subjectId_termId_subExamId_key" ON "Mark"("studentId", "subjectId", "termId", "subExamId");

-- CreateIndex
CREATE INDEX "Mark_termId_idx" ON "Mark"("termId");

-- CreateIndex
CREATE INDEX "Mark_subExamId_idx" ON "Mark"("subExamId");

-- AddForeignKey
ALTER TABLE "SubExam" ADD CONSTRAINT "SubExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubExam" ADD CONSTRAINT "SubExam_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_subExamId_fkey" FOREIGN KEY ("subExamId") REFERENCES "SubExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

