/**
 * Assign academicYearId to existing payments using date-range rule.
 * Does not modify month, year, amount, or paymentDate.
 *
 * Usage:
 *   npx tsx scripts/backfill-payment-academic-years.ts
 *   npx tsx scripts/backfill-payment-academic-years.ts --assign-remaining-to "2018 - 2019"
 *   npx tsx scripts/backfill-payment-academic-years.ts --force-all-to "2018 - 2019"
 *
 * When academic year date ranges overlap or payment dates fall outside all ranges,
 * use --assign-remaining-to to attach leftover rows to the old paid year (e.g. before promotion).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const assignRemainingToArg = process.argv.find((a) => a.startsWith("--assign-remaining-to="));
const assignRemainingToName = assignRemainingToArg?.split("=")[1]?.trim();
const forceAllToArg = process.argv.find((a) => a.startsWith("--force-all-to="));
const forceAllToName = forceAllToArg?.split("=")[1]?.trim();

function dateInYear(
  date: Date,
  startDate: Date,
  endDate: Date | null,
): boolean {
  const end = endDate ?? new Date();
  return date >= startDate && date <= end;
}

function pickYearByPaymentYear(
  years: Array<{ id: string; name: string; status: string }>,
  paymentYear: number,
): { id: string; name: string } | null {
  const matches = years.filter((y) => {
    const parts = y.name.replace(/\s/g, "").split("-");
    if (parts.length !== 2) return false;
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return paymentYear >= start && paymentYear <= end;
  });
  if (matches.length === 1) return matches[0];
  // Prefer CLOSED year for historical payment.year fallback
  const closed = matches.filter((y) => y.status === "CLOSED");
  return closed[0] ?? matches[0] ?? null;
}

function pickYearForPayment(
  recordedAt: Date,
  paymentYear: number,
  academicYears: Array<{
    id: string;
    name: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
  }>,
): { id: string; name: string } | null {
  const matching = academicYears.filter((y) =>
    dateInYear(recordedAt, y.startDate, y.endDate),
  );

  if (matching.length === 1) {
    return matching[0];
  }

  if (matching.length > 1) {
    // Historical backfill: prefer CLOSED years over ACTIVE when dates overlap
    const closed = matching.filter((y) => y.status === "CLOSED");
    if (closed.length === 1) return closed[0];
    if (closed.length > 1) {
      return closed.sort(
        (a, b) => b.startDate.getTime() - a.startDate.getTime(),
      )[0];
    }
    const active = matching.find((y) => y.status === "ACTIVE");
    return active ?? matching[matching.length - 1];
  }

  return pickYearByPaymentYear(academicYears, paymentYear);
}

async function main() {
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "asc" },
  });

  if (forceAllToName) {
    const target = academicYears.find(
      (y) => y.name.toLowerCase() === forceAllToName.toLowerCase(),
    );
    if (!target) {
      console.error(`Academic year not found: "${forceAllToName}"`);
      console.error("Available:", academicYears.map((y) => y.name).join(", "));
      process.exit(1);
    }
    const nullBefore = await prisma.payment.count({
      where: { academicYearId: null },
    });
    const result = await prisma.payment.updateMany({
      where: { academicYearId: null },
      data: { academicYearId: target.id },
    });
    console.log(
      `Force-assigned ${result.count} payment(s) to "${target.name}" (${nullBefore} were null).`,
    );
    return;
  }

  const fallbackYear = assignRemainingToName
    ? academicYears.find(
        (y) => y.name.toLowerCase() === assignRemainingToName.toLowerCase(),
      )
    : null;

  if (assignRemainingToName && !fallbackYear) {
    console.error(`Academic year not found: "${assignRemainingToName}"`);
    console.error("Available:", academicYears.map((y) => y.name).join(", "));
    process.exit(1);
  }

  const payments = await prisma.payment.findMany({
    where: { academicYearId: null },
    select: {
      id: true,
      month: true,
      year: true,
      paymentDate: true,
      createdAt: true,
    },
  });

  if (payments.length === 0) {
    console.log("No payments need backfill.");
    return;
  }

  console.log(`Backfilling ${payments.length} payment(s)...`);
  if (fallbackYear) {
    console.log(
      `Remaining unassigned will go to: ${fallbackYear.name} (${fallbackYear.id})`,
    );
  }

  let updated = 0;
  let skipped = 0;
  const warnings: string[] = [];
  const batchSize = 100;

  for (let i = 0; i < payments.length; i += batchSize) {
    const batch = payments.slice(i, i + batchSize);

    for (const payment of batch) {
      const recordedAt = payment.paymentDate ?? payment.createdAt;
      let picked = pickYearForPayment(
        recordedAt,
        payment.year,
        academicYears,
      );

      if (!picked && fallbackYear) {
        picked = fallbackYear;
        if (warnings.length < 20) {
          warnings.push(
            `Payment ${payment.id}: assigned to fallback ${fallbackYear.name}`,
          );
        }
      }

      if (!picked) {
        if (warnings.length < 20) {
          warnings.push(`Payment ${payment.id}: could not assign year — skipped`);
        }
        skipped++;
        continue;
      }

      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { academicYearId: picked.id },
        });
        updated++;
      } catch (err) {
        if (warnings.length < 20) {
          warnings.push(
            `Payment ${payment.id}: update failed (${err instanceof Error ? err.message : err})`,
          );
        }
        skipped++;
      }
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= payments.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, payments.length)}/${payments.length}`);
    }
  }

  const remaining = await prisma.payment.count({
    where: { academicYearId: null },
  });

  console.log(`\nUpdated: ${updated}, skipped: ${skipped}, still null: ${remaining}`);
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length} total, showing first 20):`);
    warnings.slice(0, 20).forEach((w) => console.log(`  ${w}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
