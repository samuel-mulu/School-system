import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract year code (last 2 digits) from academic year name
 * Examples: "2024-2025" -> "24", "2025-2026" -> "25", "2025" -> "25"
 */
function extractYearCode(academicYearName: string): string {
  // Extract the first year from formats like "2024-2025" or just "2025"
  const match = academicYearName.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1]);
    // Get last 2 digits
    return String(year % 100).padStart(2, '0');
  }
  // Fallback: try to extract any 4-digit number
  const yearMatch = academicYearName.match(/\d{4}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    return String(year % 100).padStart(2, '0');
  }
  // Ultimate fallback: use current year
  const currentYear = new Date().getFullYear();
  return String(currentYear % 100).padStart(2, '0');
}

/**
 * Format student number as 5-digit string
 */
function formatStudentNumber(number: number): string {
  return String(number).padStart(5, '0');
}

/**
 * Find academic year for a student based on their class history or creation date
 */
async function findAcademicYearForStudent(student: any): Promise<{ id: string; name: string } | null> {
  // Try to get academic year from active class assignment
  if (student.classHistory && student.classHistory.length > 0) {
    const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
    if (activeClass?.class?.academicYear) {
      return {
        id: activeClass.class.academicYear.id,
        name: activeClass.class.academicYear.name,
      };
    }
    // If no active class, try the most recent class
    const recentClass = student.classHistory[0];
    if (recentClass?.class?.academicYear) {
      return {
        id: recentClass.class.academicYear.id,
        name: recentClass.class.academicYear.name,
      };
    }
  }

  // Try to find academic year based on creation date
  const studentCreatedAt = new Date(student.createdAt);
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      startDate: {
        lte: studentCreatedAt,
      },
      OR: [
        { endDate: null },
        { endDate: { gte: studentCreatedAt } },
      ],
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  if (academicYear) {
    return {
      id: academicYear.id,
      name: academicYear.name,
    };
  }

  // Fallback to active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { status: 'ACTIVE' },
  });

  return activeYear ? { id: activeYear.id, name: activeYear.name } : null;
}

async function main() {
  console.log('Starting student number migration...');

  // Fetch all students with their class history
  const students = await prisma.student.findMany({
    include: {
      classHistory: {
        include: {
          class: {
            include: {
              academicYear: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`Found ${students.length} students to process`);

  // Group students by academic year
  const studentsByYear = new Map<string, Array<{ student: any; academicYear: { id: string; name: string } }>>();

  for (const student of students) {
    const academicYear = await findAcademicYearForStudent(student);
    
    if (!academicYear) {
      console.warn(`Could not determine academic year for student ${student.id}, skipping...`);
      continue;
    }

    const yearKey = academicYear.id;
    if (!studentsByYear.has(yearKey)) {
      studentsByYear.set(yearKey, []);
    }
    studentsByYear.get(yearKey)!.push({ student, academicYear });
  }

  console.log(`Grouped students into ${studentsByYear.size} academic years`);

  // Assign numbers for each academic year
  let totalAssigned = 0;

  for (const [yearId, studentGroup] of studentsByYear.entries()) {
    const academicYear = studentGroup[0].academicYear;
    const yearCode = extractYearCode(academicYear.name);
    
    console.log(`Processing academic year: ${academicYear.name} (code: ${yearCode})`);

    // Sort students by creation date within this year
    studentGroup.sort((a, b) => 
      new Date(a.student.createdAt).getTime() - new Date(b.student.createdAt).getTime()
    );

    // Assign sequential numbers starting from 1
    for (let i = 0; i < studentGroup.length; i++) {
      const sequential = i + 1;
      const studentNumber = parseInt(`${yearCode}${String(sequential).padStart(3, '0')}`);

      try {
        await prisma.student.update({
          where: { id: studentGroup[i].student.id },
          data: { studentNumber },
        });
        totalAssigned++;
        console.log(`  Assigned ${formatStudentNumber(studentNumber)} to ${studentGroup[i].student.firstName} ${studentGroup[i].student.lastName}`);
      } catch (error: any) {
        console.error(`  Failed to assign number to student ${studentGroup[i].student.id}:`, error.message);
      }
    }
  }

  console.log(`\nMigration completed! Assigned ${totalAssigned} student numbers.`);
}

main()
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
