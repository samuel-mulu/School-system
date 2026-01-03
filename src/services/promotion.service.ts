import { prisma } from '../config/db';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { calculateYearAverage } from './calculation.service';
import { getNextGrade, getHighestGrade } from './grade.service';
import { getActiveAcademicYear, createAcademicYear } from './academicYear.service';
import { getSetting } from './settings.service';
// Note: After running 'npx prisma generate', you can import Prisma enums from '../generated/prisma/client'

interface PromotionPreviewStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  currentClassId: string;
  currentClassName: string;
  currentGradeId: string | null;
  currentGradeName: string | null;
  overallAverage: number;
  outcome: 'PASS' | 'REPEAT' | 'GRADUATE';
  nextGradeId: string | null;
  nextGradeName: string | null;
  nextClassName: string | null;
}

interface PromotionPreview {
  canPromote: boolean;
  term2Status: string;
  activeAcademicYear: {
    id: string;
    name: string;
  } | null;
  students: PromotionPreviewStudent[];
  summary: {
    total: number;
    passing: number;
    repeating: number;
    graduating: number;
  };
}

/**
 * Calculate overall yearly average for a student across all subjects
 */
export const calculateStudentYearlyAverage = async (
  studentId: string,
  classId: string
): Promise<number> => {
  // Get all subjects for the class
  const subjects = await prisma.subject.findMany({
    where: { classId },
  });

  if (subjects.length === 0) {
    return 0;
  }

  // Calculate yearly average for each subject
  const subjectAverages = await Promise.all(
    subjects.map(async (subject) => {
      try {
        const yearResult = await calculateYearAverage(studentId, subject.id);
        return yearResult.yearAverage;
      } catch {
        return 0;
      }
    })
  );

  // Calculate overall average
  const overallAverage =
    subjectAverages.length > 0
      ? subjectAverages.reduce((sum, avg) => sum + avg, 0) / subjectAverages.length
      : 0;

  return overallAverage;
};

/**
 * Get promotion preview before execution
 */
export const getPromotionPreview = async (): Promise<PromotionPreview> => {
  // Check if Term 2 exists and is closed
  const term2 = await prisma.term.findUnique({
    where: { name: 'Term 2' },
  });

  if (!term2) {
    throw new NotFoundError('Term 2 not found');
  }

  const canPromote = term2.status === 'CLOSED';

  // Get active academic year
  const activeYear = await getActiveAcademicYear();

  if (!activeYear) {
    return {
      canPromote: false,
      term2Status: term2.status,
      activeAcademicYear: null,
      students: [],
      summary: {
        total: 0,
        passing: 0,
        repeating: 0,
        graduating: 0,
      },
    };
  }

  // Get all active students in the active academic year
  const activeStudentClasses = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: activeYear.id,
      },
      endDate: null, // Active assignments only
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      class: {
        include: {
          grade: true,
        },
      },
    },
  });

  // Get promotion threshold
  const thresholdSetting = await getSetting('promotionThreshold');
  const threshold = parseFloat(thresholdSetting.value);

  // Get highest grade
  const highestGrade = await getHighestGrade();

  // Calculate outcomes for each student
  const students: PromotionPreviewStudent[] = await Promise.all(
    activeStudentClasses.map(async (sc) => {
      const overallAverage = await calculateStudentYearlyAverage(
        sc.studentId,
        sc.classId
      );

      const currentGrade = sc.class.grade;
      let outcome: 'PASS' | 'REPEAT' | 'GRADUATE';
      let nextGradeId: string | null = null;
      let nextGradeName: string | null = null;
      let nextClassName: string | null = null;

      // Determine outcome
      if (!currentGrade) {
        // No grade assigned, treat as repeat
        outcome = 'REPEAT';
        nextGradeId = null;
        nextGradeName = null;
      } else if (highestGrade && currentGrade.id === highestGrade.id) {
        // At highest grade, graduate
        outcome = 'GRADUATE';
        nextGradeId = null;
        nextGradeName = null;
      } else if (overallAverage >= threshold) {
        // Pass - move to next grade
        outcome = 'PASS';
        const nextGrade = await getNextGrade(currentGrade.id);
        if (nextGrade) {
          nextGradeId = nextGrade.id;
          nextGradeName = nextGrade.name;
          // Generate next class name (e.g., "Grade 2A" -> "Grade 3A")
          // This is a simple approach - in production, you might want more sophisticated logic
          const currentClassParts = sc.class.name.split(' ');
          if (currentClassParts.length >= 2) {
            const section = currentClassParts.slice(1).join(' ');
            nextClassName = `${nextGrade.name} ${section}`;
          } else {
            nextClassName = nextGrade.name;
          }
        } else {
          outcome = 'GRADUATE';
        }
      } else {
        // Repeat - stay in same grade
        outcome = 'REPEAT';
        nextGradeId = currentGrade.id;
        nextGradeName = currentGrade.name;
        // Keep same class name structure
        nextClassName = sc.class.name;
      }

      return {
        studentId: sc.studentId,
        firstName: sc.student.firstName,
        lastName: sc.student.lastName,
        currentClassId: sc.classId,
        currentClassName: sc.class.name,
        currentGradeId: currentGrade?.id || null,
        currentGradeName: currentGrade?.name || null,
        overallAverage,
        outcome,
        nextGradeId,
        nextGradeName,
        nextClassName,
      };
    })
  );

  // Calculate summary
  const summary = {
    total: students.length,
    passing: students.filter((s) => s.outcome === 'PASS').length,
    repeating: students.filter((s) => s.outcome === 'REPEAT').length,
    graduating: students.filter((s) => s.outcome === 'GRADUATE').length,
  };

  return {
    canPromote,
    term2Status: term2.status,
    activeAcademicYear: {
      id: activeYear.id,
      name: activeYear.name,
    },
    students,
    summary,
  };
};

/**
 * Execute promotion for all students
 */
export const promoteStudents = async (): Promise<{
  message: string;
  promoted: number;
  repeated: number;
  graduated: number;
}> => {
  // Get preview to validate
  const preview = await getPromotionPreview();

  if (!preview.canPromote) {
    throw new BadRequestError(
      'Cannot promote students. Term 2 must be closed first.'
    );
  }

  if (!preview.activeAcademicYear) {
    throw new BadRequestError('No active academic year found');
  }

  // Get active academic year
  const activeYear = await prisma.academicYear.findUnique({
    where: { id: preview.activeAcademicYear.id },
  });

  if (!activeYear) {
    throw new NotFoundError('Active academic year not found');
  }

  // Create next academic year (e.g., "2024-2025" -> "2025-2026")
  const currentYearParts = activeYear.name.split('-');
  if (currentYearParts.length !== 2) {
    throw new BadRequestError('Invalid academic year format');
  }

  const startYear = parseInt(currentYearParts[0]);
  const endYear = parseInt(currentYearParts[1]);

  const nextYearName = `${startYear + 1}-${endYear + 1}`;
  const nextYearStartDate = new Date(startYear + 1, 0, 1); // January 1st
  const nextYearEndDate = new Date(endYear + 1, 11, 31); // December 31st

  // Check if next academic year already exists
  let nextAcademicYear = await prisma.academicYear.findUnique({
    where: { name: nextYearName },
  });

  if (!nextAcademicYear) {
    nextAcademicYear = await createAcademicYear({
      name: nextYearName,
      startDate: nextYearStartDate,
      endDate: nextYearEndDate,
    });
  }

  // Get all grades to create classes
  const grades = await prisma.grade.findMany({
    orderBy: { order: 'asc' },
  });

  // Create classes for next academic year if they don't exist
  const classMap = new Map<string, string>(); // gradeId -> classId

  for (const grade of grades) {
    // Check if class already exists for this grade and year
    const existingClass = await prisma.class.findFirst({
      where: {
        gradeId: grade.id,
        academicYearId: nextAcademicYear.id,
      },
    });

    if (existingClass) {
      classMap.set(grade.id, existingClass.id);
    } else {
      // Create new class (simple naming: "Grade 1", "Grade 2", etc.)
      // In production, you might want more sophisticated class creation
      const newClass = await prisma.class.create({
        data: {
          name: grade.name,
          description: `${grade.name} - ${nextYearName}`,
          gradeId: grade.id,
          academicYearId: nextAcademicYear.id,
        },
      });
      classMap.set(grade.id, newClass.id);
    }
  }

  // Process each student
  let promoted = 0;
  let repeated = 0;
  let graduated = 0;

  for (const studentPreview of preview.students) {
    // Find current student class record
    const currentStudentClass = await prisma.studentClass.findFirst({
      where: {
        studentId: studentPreview.studentId,
        classId: studentPreview.currentClassId,
        endDate: null,
      },
    });

    if (!currentStudentClass) {
      continue; // Skip if no active assignment found
    }

    // Close current student class record
    let promotionStatus: 'PROMOTED' | 'REPEATED' | 'GRADUATED' | null = null;

    if (studentPreview.outcome === 'PASS') {
      promotionStatus = 'PROMOTED';
      promoted++;
    } else if (studentPreview.outcome === 'REPEAT') {
      promotionStatus = 'REPEATED';
      repeated++;
    } else if (studentPreview.outcome === 'GRADUATE') {
      promotionStatus = 'GRADUATED';
      graduated++;
      // Don't create new student class for graduates
      await prisma.studentClass.update({
        where: { id: currentStudentClass.id },
        data: {
          endDate: new Date(),
          promotionStatus,
        },
      });
      continue;
    }

    // Update current record
    await prisma.studentClass.update({
      where: { id: currentStudentClass.id },
      data: {
        endDate: new Date(),
        promotionStatus,
      },
    });

    // Create new student class record for next year (if not graduating)
    if (studentPreview.nextGradeId && classMap.has(studentPreview.nextGradeId)) {
      const nextClassId = classMap.get(studentPreview.nextGradeId)!;

      // Find or create class with the specific name if needed
      let targetClassId = nextClassId;

      // If we have a specific next class name, try to find or create it
      if (studentPreview.nextClassName) {
        const specificClass = await prisma.class.findFirst({
          where: {
            academicYearId: nextAcademicYear.id,
            gradeId: studentPreview.nextGradeId,
            name: studentPreview.nextClassName,
          },
        });

        if (specificClass) {
          targetClassId = specificClass.id;
        } else {
          // Create class with specific name
          const newClass = await prisma.class.create({
            data: {
              name: studentPreview.nextClassName,
              description: `${studentPreview.nextClassName} - ${nextYearName}`,
              gradeId: studentPreview.nextGradeId,
              academicYearId: nextAcademicYear.id,
            },
          });
          targetClassId = newClass.id;
        }
      }

      await prisma.studentClass.create({
        data: {
          studentId: studentPreview.studentId,
          classId: targetClassId,
          reason:
            studentPreview.outcome === 'PASS'
              ? 'Promoted to next grade'
              : 'Repeated same grade',
          startDate: new Date(),
        },
      });
    }
  }

  return {
    message: 'Promotion completed successfully',
    promoted,
    repeated,
    graduated,
  };
};

