import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dateRange = await prisma.$queryRaw<
    Array<{ min_created: Date; max_created: Date; min_payment: Date | null; max_payment: Date | null }>
  >`
    SELECT MIN("createdAt") as min_created, MAX("createdAt") as max_created,
           MIN("paymentDate") as min_payment, MAX("paymentDate") as max_payment
    FROM "Payment"
  `;
  console.log("Payment date span:", dateRange[0]);

  const byYearField = await prisma.payment.groupBy({
    by: ["year"],
    _count: { id: true },
    orderBy: { year: "asc" },
  });
  console.log("\nPayments by payment.year field:");
  byYearField.forEach((r) => console.log(`  ${r.year}: ${r._count.id}`));

  const recentNull = await prisma.payment.findMany({
    where: { academicYearId: null },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { month: true, year: true, createdAt: true, paymentDate: true },
  });
  console.log("\nSample NULL (most recent):");
  recentNull.forEach((p) =>
    console.log({
      month: p.month,
      year: p.year,
      createdAt: p.createdAt.toISOString().slice(0, 10),
      paymentDate: p.paymentDate?.toISOString().slice(0, 10),
    }),
  );
}

main().finally(() => prisma.$disconnect());
