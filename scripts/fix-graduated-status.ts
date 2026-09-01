/**
 * One-time script: set classStatus = graduated for alumni who completed promotion
 * but were not tagged (e.g. before ClassStatus.graduated existed).
 *
 * Usage: npx tsx scripts/fix-graduated-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const graduatedAssignments = await prisma.studentClass.findMany({
    where: { promotionStatus: "GRADUATED" },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const studentIds = graduatedAssignments.map((a) => a.studentId);
  if (studentIds.length === 0) {
    console.log("No GRADUATED promotion records found.");
    return;
  }

  const result = await prisma.student.updateMany({
    where: {
      id: { in: studentIds },
      classStatus: { not: "graduated" },
    },
    data: { classStatus: "graduated" },
  });

  console.log(
    `Updated ${result.count} student(s) to classStatus=graduated (${studentIds.length} with GRADUATED history).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
