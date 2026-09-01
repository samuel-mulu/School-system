import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dupes = await prisma.$queryRaw<
    Array<{ studentId: string; month: string; c: number }>
  >`
    SELECT "studentId", month, COUNT(*)::int as c
    FROM "Payment"
    WHERE "academicYearId" IS NULL
    GROUP BY "studentId", month
    HAVING COUNT(*) > 1
    LIMIT 10
  `;
  console.log("Duplicate student+month among NULL:", dupes.length, "groups");
  dupes.forEach((d) => console.log(d));

  const oldYear = await prisma.academicYear.findFirst({
    where: { name: { contains: "2018", mode: "insensitive" } },
    orderBy: { startDate: "asc" },
  });
  const activeYear = await prisma.academicYear.findFirst({
    where: { status: "ACTIVE" },
  });
  console.log("\nOld year candidate:", oldYear?.name, oldYear?.id);
  console.log("Active year:", activeYear?.name, activeYear?.id);
}

main().finally(() => prisma.$disconnect());
