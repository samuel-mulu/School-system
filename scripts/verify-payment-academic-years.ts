/**
 * Verify payment academic year backfill results.
 * Usage: npx tsx scripts/verify-payment-academic-years.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  console.log("=== Academic Years ===");
  for (const y of years) {
    console.log({
      name: y.name,
      status: y.status,
      startDate: y.startDate.toISOString().slice(0, 10),
      endDate: y.endDate?.toISOString().slice(0, 10) ?? null,
    });
  }

  const nullCount = await prisma.payment.count({
    where: { academicYearId: null },
  });
  const total = await prisma.payment.count();

  console.log("\n=== Payment academicYearId ===");
  console.log(`Total payments: ${total}`);
  console.log(`Still NULL: ${nullCount}`);

  const byYear = await prisma.payment.groupBy({
    by: ["academicYearId"],
    _count: { id: true },
  });

  console.log("\n=== Payments by academic year ===");
  for (const row of byYear) {
    const name = row.academicYearId
      ? years.find((y) => y.id === row.academicYearId)?.name ?? row.academicYearId
      : "NULL (unassigned)";
    console.log(`  ${name}: ${row._count.id}`);
  }

  const closedYear = years.find((y) => y.status === "CLOSED");
  const activeYear = years.find((y) => y.status === "ACTIVE");

  if (closedYear && activeYear) {
    console.log(`\n=== Overlap check: same month in ${closedYear.name} vs ${activeYear.name} ===`);
    const overlapMonths = await prisma.$queryRaw<Array<{ month: string; old_count: bigint; new_count: bigint }>>`
      SELECT o.month,
        COUNT(DISTINCT o.id) AS old_count,
        COUNT(DISTINCT n.id) AS new_count
      FROM "Payment" o
      JOIN "Payment" n ON n."studentId" = o."studentId" AND n.month = o.month
      WHERE o."academicYearId" = ${closedYear.id}
        AND n."academicYearId" = ${activeYear.id}
      GROUP BY o.month
      ORDER BY o.month
      LIMIT 10
    `;
    if (overlapMonths.length === 0) {
      console.log("  No duplicate student+month across old and new year (expected before new collection).");
    } else {
      overlapMonths.forEach((r) =>
        console.log(`  month ${r.month}: ${closedYear.name}=${r.old_count}, ${activeYear.name}=${r.new_count}`),
      );
    }
  }

  const sample = await prisma.payment.findMany({
    where: { academicYearId: { not: null } },
    take: 8,
    orderBy: { createdAt: "asc" },
    select: {
      month: true,
      year: true,
      paymentDate: true,
      createdAt: true,
      academicYear: { select: { name: true } },
    },
  });

  console.log("\n=== Sample earliest assigned payments ===");
  for (const p of sample) {
    console.log({
      month: p.month,
      year: p.year,
      recorded: (p.paymentDate ?? p.createdAt).toISOString().slice(0, 10),
      academicYear: p.academicYear?.name,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
