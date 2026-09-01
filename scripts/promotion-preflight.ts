/**
 * Run before re-executing promotion: npx tsx scripts/promotion-preflight.ts
 * Read-only checks — does not modify data.
 */
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('=== Promotion pre-flight ===\n');

  const activeYear = await prisma.academicYear.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!activeYear) {
    console.log('FAIL: No active academic year');
    process.exit(1);
  }

  console.log(`Active year: ${activeYear.name} (${activeYear.id})`);

  const yearFormat = /^\d{4}-\d{4}$/.test(activeYear.name);
  console.log(yearFormat ? 'OK: Year name YYYY-YYYY' : 'FAIL: Year name must be YYYY-YYYY');

  const [term1, term2] = await Promise.all([
    prisma.term.findFirst({
      where: { name: 'Term 1', academicYearId: activeYear.id },
    }),
    prisma.term.findFirst({
      where: { name: 'Term 2', academicYearId: activeYear.id },
    }),
  ]);

  console.log(term1 ? `OK: Term 1 (${term1.status})` : 'FAIL: Term 1 missing');
  console.log(
    term2
      ? term2.status === 'CLOSED'
        ? 'OK: Term 2 CLOSED'
        : `FAIL: Term 2 must be CLOSED (is ${term2.status})`
      : 'FAIL: Term 2 missing'
  );

  const grades = await prisma.grade.findMany({ orderBy: { order: 'asc' } });
  console.log('\nGrades (order → name, isHighest):');
  for (const g of grades) {
    console.log(`  ${g.order}: ${g.name}${g.isHighest ? ' [HIGHEST]' : ''}`);
  }

  const highestCount = grades.filter((g) => g.isHighest).length;
  console.log(
    highestCount === 1 ? 'OK: Exactly one highest grade' : `WARN: ${highestCount} grades marked highest`
  );

  const parts = activeYear.name.split('-');
  const nextYearName =
    parts.length === 2
      ? `${parseInt(parts[0], 10) + 1}-${parseInt(parts[1], 10) + 1}`
      : null;

  if (nextYearName) {
    const nextYear = await prisma.academicYear.findUnique({
      where: { name: nextYearName },
      include: { classes: { select: { id: true } } },
    });

    if (nextYear) {
      const activeInNext = await prisma.studentClass.count({
        where: {
          endDate: null,
          class: { academicYearId: nextYear.id },
        },
      });
      console.log(`\nNext year "${nextYearName}" exists (${nextYear.status})`);
      console.log(
        activeInNext > 0
          ? `WARN: Partial promotion? ${activeInNext} students already active in next year`
          : 'OK: No active assignments in next year yet'
      );
    } else {
      console.log(`\nOK: Next year "${nextYearName}" not created yet`);
    }
  }

  const enrolled = await prisma.studentClass.count({
    where: {
      endDate: null,
      class: { academicYearId: activeYear.id },
    },
  });
  console.log(`\nStudents in active year: ${enrolled}`);
  if (enrolled >= 500) {
    console.log(`OK: Large roster (${enrolled}) — batched promotion (25/batch) recommended`);
  } else if (enrolled === 0) {
    console.log('WARN: No enrolled students in active year');
  }

  console.log('\n=== End pre-flight ===');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
