import { Prisma } from '@prisma/client';
import { prisma } from "../config/db.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import { getActiveAcademicYear } from "./academicYear.service.js";
import { calculateWeightedScore } from "./calculation.service.js";
import { getHighestGrade } from "./grade.service.js";
import { getSetting } from "./settings.service.js";

type PromotionBlocker =
  | 'NO_ACTIVE_YEAR'
  | 'TERM1_NOT_FOUND'
  | 'TERM2_NOT_FOUND'
  | 'TERM2_NOT_CLOSED'
  | 'INVALID_YEAR_FORMAT'
  | 'ALREADY_PROMOTED';

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

interface PromotionPreviewClass {
  id: string;
  name: string;
  studentCount: number;
}

interface PromotionPreview {
  canPromote: boolean;
  blockers: PromotionBlocker[];
  term1Status?: string;
  term2Status?: string;
  nextAcademicYearName?: string;
  activeAcademicYear: {
    id: string;
    name: string;
  } | null;
  classes: PromotionPreviewClass[];
  students: PromotionPreviewStudent[];
  summary: {
    total: number;
    passing: number;
    repeating: number;
    graduating: number;
  };
}

interface GetPromotionPreviewOptions {
  classId?: string;
  includeStudents?: boolean;
}

interface PromotionResult {
  message: string;
  promoted: number;
  repeated: number;
  graduated: number;
  previousAcademicYear: { id: string; name: string };
  newAcademicYear: { id: string; name: string };
  termsCreated: string[];
}

const emptySummary = () => ({
  total: 0,
  passing: 0,
  repeating: 0,
  graduating: 0,
});

const computeNextAcademicYearName = (
  yearName: string
): { nextYearName: string; nextYearStartDate: Date; nextYearEndDate: Date } | null => {
  const currentYearParts = yearName.split('-');
  if (currentYearParts.length !== 2) {
    return null;
  }

  const startYear = parseInt(currentYearParts[0], 10);
  const endYear = parseInt(currentYearParts[1], 10);

  if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
    return null;
  }

  return {
    nextYearName: `${startYear + 1}-${endYear + 1}`,
    nextYearStartDate: new Date(startYear + 1, 0, 1),
    nextYearEndDate: new Date(endYear + 1, 11, 31),
  };
};

const buildPreviewResponse = (
  partial: Partial<PromotionPreview> & {
    canPromote: boolean;
    blockers: PromotionBlocker[];
    students?: PromotionPreviewStudent[];
  }
): PromotionPreview => ({
  canPromote: partial.canPromote,
  blockers: partial.blockers,
  term1Status: partial.term1Status,
  term2Status: partial.term2Status,
  nextAcademicYearName: partial.nextAcademicYearName,
  activeAcademicYear: partial.activeAcademicYear ?? null,
  classes: partial.classes ?? [],
  students: partial.students ?? [],
  summary: partial.summary ?? emptySummary(),
});

type SubExamRow = {
  id: string;
  subjectId: string;
  maxScore: number;
  weightPercent: number;
  examType: string;
};

const markKey = (
  studentId: string,
  subjectId: string,
  termId: string,
  subExamId: string
) => `${studentId}:${subjectId}:${termId}:${subExamId}`;

const computeTermTotalFromMarks = (
  subExams: SubExamRow[],
  marksBySubExamId: Map<string, number>
): number => {
  let subExamTotal = 0;
  let generalTestTotal = 0;

  for (const subExam of subExams) {
    const score = marksBySubExamId.get(subExam.id) ?? 0;
    const weightedScore = calculateWeightedScore(
      score,
      subExam.maxScore,
      subExam.weightPercent
    );

    if (subExam.examType === 'general_test') {
      generalTestTotal += weightedScore;
    } else {
      subExamTotal += weightedScore;
    }
  }

  return subExamTotal + generalTestTotal;
};

const computeYearAverageForSubject = (
  studentId: string,
  subjectId: string,
  term1Id: string,
  term2Id: string,
  subExams: SubExamRow[],
  markLookup: Map<string, number>
): number => {
  if (subExams.length === 0) {
    return 0;
  }

  const marksForTerm = (termId: string) => {
    const bySubExam = new Map<string, number>();
    for (const subExam of subExams) {
      bySubExam.set(
        subExam.id,
        markLookup.get(markKey(studentId, subjectId, termId, subExam.id)) ?? 0
      );
    }
    return bySubExam;
  };

  const term1Total = computeTermTotalFromMarks(subExams, marksForTerm(term1Id));
  const term2Total = computeTermTotalFromMarks(subExams, marksForTerm(term2Id));

  return (term1Total + term2Total) / 2;
};

const computeStudentYearlyAverageBulk = (
  studentId: string,
  gradeId: string | null,
  term1Id: string,
  term2Id: string,
  subjectsByGradeId: Map<string, Array<{ id: string }>>,
  subExamsBySubjectId: Map<string, SubExamRow[]>,
  markLookup: Map<string, number>
): number => {
  if (!gradeId) {
    return 0;
  }

  const subjects = subjectsByGradeId.get(gradeId) ?? [];
  if (subjects.length === 0) {
    return 0;
  }

  const subjectAverages = subjects.map((subject) =>
    computeYearAverageForSubject(
      studentId,
      subject.id,
      term1Id,
      term2Id,
      subExamsBySubjectId.get(subject.id) ?? [],
      markLookup
    )
  );

  return (
    subjectAverages.reduce((sum, avg) => sum + avg, 0) / subjectAverages.length
  );
};

const buildStudentOutcome = (
  sc: {
    studentId: string;
    classId: string;
    class: { name: string; grade: { id: string; name: string } | null };
    student: { firstName: string; lastName: string };
  },
  overallAverage: number,
  threshold: number,
  highestGrade: { id: string } | null,
  nextGradeById: Map<string, { id: string; name: string }>
): PromotionPreviewStudent => {
  const currentGrade = sc.class.grade;
  let outcome: 'PASS' | 'REPEAT' | 'GRADUATE';
  let nextGradeId: string | null = null;
  let nextGradeName: string | null = null;
  let nextClassName: string | null = null;

  if (!currentGrade) {
    outcome = 'REPEAT';
  } else if (highestGrade && currentGrade.id === highestGrade.id) {
    outcome = 'GRADUATE';
  } else if (overallAverage >= threshold) {
    outcome = 'PASS';
    const nextGrade = nextGradeById.get(currentGrade.id);
    if (nextGrade) {
      nextGradeId = nextGrade.id;
      nextGradeName = nextGrade.name;
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
    outcome = 'REPEAT';
    nextGradeId = currentGrade.id;
    nextGradeName = currentGrade.name;
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
};

const calculateStudentOutcomes = async (
  activeYearId: string,
  term1Id: string,
  term2Id: string
): Promise<{
  students: PromotionPreviewStudent[];
  classes: PromotionPreviewClass[];
  summary: PromotionPreview['summary'];
}> => {
  const activeStudentClasses = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: activeYearId,
      },
      endDate: null,
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

  if (activeStudentClasses.length === 0) {
    return {
      students: [],
      classes: [],
      summary: emptySummary(),
    };
  }

  const gradeIds = [
    ...new Set(
      activeStudentClasses
        .map((sc) => sc.class.grade?.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const studentIds = activeStudentClasses.map((sc) => sc.studentId);

  const [thresholdSetting, highestGrade, allGrades, subjects, subExams, marks] =
    await Promise.all([
      getSetting('promotionThreshold'),
      getHighestGrade(),
      prisma.grade.findMany({ orderBy: { order: 'asc' } }),
      gradeIds.length > 0
        ? prisma.subject.findMany({ where: { gradeId: { in: gradeIds } } })
        : Promise.resolve([]),
      gradeIds.length > 0
        ? prisma.subExam.findMany({ where: { gradeId: { in: gradeIds } } })
        : Promise.resolve([]),
      prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
          termId: { in: [term1Id, term2Id] },
        },
        select: {
          studentId: true,
          subjectId: true,
          termId: true,
          subExamId: true,
          score: true,
        },
      }),
    ]);

  const threshold = parseFloat(thresholdSetting.value);

  const nextGradeById = new Map<string, { id: string; name: string }>();
  for (let i = 0; i < allGrades.length; i++) {
    const current = allGrades[i];
    const next = allGrades[i + 1];
    if (next && !current.isHighest) {
      nextGradeById.set(current.id, { id: next.id, name: next.name });
    }
  }

  const subjectsByGradeId = new Map<string, Array<{ id: string }>>();
  for (const subject of subjects) {
    const list = subjectsByGradeId.get(subject.gradeId) ?? [];
    list.push({ id: subject.id });
    subjectsByGradeId.set(subject.gradeId, list);
  }

  const subExamsBySubjectId = new Map<string, SubExamRow[]>();
  for (const subExam of subExams) {
    const list = subExamsBySubjectId.get(subExam.subjectId) ?? [];
    list.push(subExam);
    subExamsBySubjectId.set(subExam.subjectId, list);
  }

  const markLookup = new Map<string, number>();
  for (const mark of marks) {
    markLookup.set(
      markKey(mark.studentId, mark.subjectId, mark.termId, mark.subExamId),
      mark.score
    );
  }

  const students = activeStudentClasses.map((sc) => {
    const overallAverage = computeStudentYearlyAverageBulk(
      sc.studentId,
      sc.class.grade?.id ?? null,
      term1Id,
      term2Id,
      subjectsByGradeId,
      subExamsBySubjectId,
      markLookup
    );

    return buildStudentOutcome(
      sc,
      overallAverage,
      threshold,
      highestGrade,
      nextGradeById
    );
  });

  const classCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const student of students) {
    const existing = classCounts.get(student.currentClassId);
    if (existing) {
      existing.count += 1;
    } else {
      classCounts.set(student.currentClassId, {
        id: student.currentClassId,
        name: student.currentClassName,
        count: 1,
      });
    }
  }

  const classes = [...classCounts.values()]
    .map(({ id, name, count }) => ({
      id,
      name,
      studentCount: count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    students,
    classes,
    summary: {
      total: students.length,
      passing: students.filter((s) => s.outcome === 'PASS').length,
      repeating: students.filter((s) => s.outcome === 'REPEAT').length,
      graduating: students.filter((s) => s.outcome === 'GRADUATE').length,
    },
  };
};

export const calculateStudentYearlyAverage = async (
  studentId: string,
  classId: string
): Promise<number> => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { gradeId: true, academicYearId: true },
  });

  if (!classRecord?.gradeId || !classRecord.academicYearId) {
    return 0;
  }

  const [term1, term2] = await Promise.all([
    prisma.term.findFirst({
      where: { name: 'Term 1', academicYearId: classRecord.academicYearId },
    }),
    prisma.term.findFirst({
      where: { name: 'Term 2', academicYearId: classRecord.academicYearId },
    }),
  ]);

  if (!term1 || !term2) {
    return 0;
  }

  const { students } = await calculateStudentOutcomes(
    classRecord.academicYearId,
    term1.id,
    term2.id
  );

  return students.find((s) => s.studentId === studentId)?.overallAverage ?? 0;
};

const createDefaultTermsForYear = async (
  tx: Prisma.TransactionClient,
  academicYearId: string,
  startDate: Date,
  endDate: Date | null
): Promise<string[]> => {
  const termsCreated: string[] = [];
  const yearEnd = endDate ?? new Date(startDate.getFullYear(), 11, 31);
  const midpoint = new Date(
    startDate.getTime() + (yearEnd.getTime() - startDate.getTime()) / 2
  );
  const term2Start = new Date(midpoint);
  term2Start.setDate(term2Start.getDate() + 1);

  const termDefinitions = [
    {
      name: 'Term 1',
      startDate,
      endDate: midpoint,
    },
    {
      name: 'Term 2',
      startDate: term2Start,
      endDate: yearEnd,
    },
  ];

  for (const termDef of termDefinitions) {
    const existing = await tx.term.findFirst({
      where: {
        name: termDef.name,
        academicYearId,
      },
    });

    if (!existing) {
      await tx.term.create({
        data: {
          name: termDef.name,
          academicYearId,
          startDate: termDef.startDate,
          endDate: termDef.endDate,
          status: 'OPEN',
        },
      });
      termsCreated.push(termDef.name);
    }
  }

  return termsCreated;
};

/**
 * Get promotion preview before execution
 */
export const getPromotionPreview = async (
  options: GetPromotionPreviewOptions = {}
): Promise<PromotionPreview> => {
  const { classId, includeStudents = true } = options;
  const activeYear = await getActiveAcademicYear();

  if (!activeYear) {
    return buildPreviewResponse({
      canPromote: false,
      blockers: ['NO_ACTIVE_YEAR'],
    });
  }

  const nextYearInfo = computeNextAcademicYearName(activeYear.name);
  const blockers: PromotionBlocker[] = [];

  if (!nextYearInfo) {
    blockers.push('INVALID_YEAR_FORMAT');
  }

  const term1 = await prisma.term.findFirst({
    where: {
      name: 'Term 1',
      academicYearId: activeYear.id,
    },
  });

  const term2 = await prisma.term.findFirst({
    where: {
      name: 'Term 2',
      academicYearId: activeYear.id,
    },
  });

  if (!term1) {
    blockers.push('TERM1_NOT_FOUND');
  }

  if (!term2) {
    blockers.push('TERM2_NOT_FOUND');
  } else if (term2.status !== 'CLOSED') {
    blockers.push('TERM2_NOT_CLOSED');
  }

  const activeAcademicYear = {
    id: activeYear.id,
    name: activeYear.name,
  };

  if (blockers.includes('TERM1_NOT_FOUND') || blockers.includes('TERM2_NOT_FOUND')) {
    return buildPreviewResponse({
      canPromote: false,
      blockers,
      term1Status: term1?.status,
      term2Status: term2?.status,
      nextAcademicYearName: nextYearInfo?.nextYearName,
      activeAcademicYear,
    });
  }

  const { students: allStudents, classes, summary } = await calculateStudentOutcomes(
    activeYear.id,
    term1!.id,
    term2!.id
  );

  let students = allStudents;
  if (classId) {
    students = allStudents.filter((s) => s.currentClassId === classId);
  }
  if (!includeStudents) {
    students = [];
  }

  return buildPreviewResponse({
    canPromote: blockers.length === 0,
    blockers,
    term1Status: term1?.status,
    term2Status: term2?.status,
    nextAcademicYearName: nextYearInfo?.nextYearName,
    activeAcademicYear,
    classes,
    students,
    summary,
  });
};

/**
 * Execute promotion for all students
 */
export const promoteStudents = async (): Promise<PromotionResult> => {
  const preview = await getPromotionPreview({ includeStudents: true });

  if (preview.blockers.length > 0) {
    throw new BadRequestError(
      `Cannot promote students: ${preview.blockers.join(', ')}`
    );
  }

  if (!preview.canPromote) {
    throw new BadRequestError(
      'Cannot promote students. All prerequisites must be met first.'
    );
  }

  if (!preview.activeAcademicYear) {
    throw new BadRequestError('No active academic year found');
  }

  const activeYear = await prisma.academicYear.findUnique({
    where: { id: preview.activeAcademicYear.id },
  });

  if (!activeYear) {
    throw new NotFoundError('Active academic year not found');
  }

  const nextYearInfo = computeNextAcademicYearName(activeYear.name);
  if (!nextYearInfo) {
    throw new BadRequestError('Invalid academic year format. Expected YYYY-YYYY');
  }

  const { nextYearName, nextYearStartDate, nextYearEndDate } = nextYearInfo;

  const existingNextYear = await prisma.academicYear.findUnique({
    where: { name: nextYearName },
    include: {
      classes: {
        select: { id: true },
      },
    },
  });

  if (existingNextYear && preview.students.length > 0) {
    const studentIds = preview.students.map((s) => s.studentId);
    const existingAssignments = await prisma.studentClass.findFirst({
      where: {
        studentId: { in: studentIds },
        endDate: null,
        class: {
          academicYearId: existingNextYear.id,
        },
      },
    });

    if (existingAssignments) {
      throw new BadRequestError(
        'Promotion already executed for this cohort. Students already have active records in the next academic year.'
      );
    }
  }

  const grades = await prisma.grade.findMany({
    orderBy: { order: 'asc' },
  });

  const result = await prisma.$transaction(async (tx) => {
    let nextAcademicYear = await tx.academicYear.findUnique({
      where: { name: nextYearName },
    });

    if (!nextAcademicYear) {
      nextAcademicYear = await tx.academicYear.create({
        data: {
          name: nextYearName,
          startDate: nextYearStartDate,
          endDate: nextYearEndDate,
          status: 'CLOSED',
        },
      });
    }

    const classMap = new Map<string, string>();

    for (const grade of grades) {
      const existingClass = await tx.class.findFirst({
        where: {
          gradeId: grade.id,
          academicYearId: nextAcademicYear.id,
        },
      });

      if (existingClass) {
        classMap.set(grade.id, existingClass.id);
      } else {
        const newClass = await tx.class.create({
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

    let promoted = 0;
    let repeated = 0;
    let graduated = 0;
    const now = new Date();

    for (const studentPreview of preview.students) {
      const currentStudentClass = await tx.studentClass.findFirst({
        where: {
          studentId: studentPreview.studentId,
          classId: studentPreview.currentClassId,
          endDate: null,
        },
      });

      if (!currentStudentClass) {
        continue;
      }

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
        await tx.studentClass.update({
          where: { id: currentStudentClass.id },
          data: {
            endDate: now,
            promotionStatus,
          },
        });
        continue;
      }

      await tx.studentClass.update({
        where: { id: currentStudentClass.id },
        data: {
          endDate: now,
          promotionStatus,
        },
      });

      if (studentPreview.nextGradeId && classMap.has(studentPreview.nextGradeId)) {
        let targetClassId = classMap.get(studentPreview.nextGradeId)!;

        if (studentPreview.nextClassName) {
          const specificClass = await tx.class.findFirst({
            where: {
              academicYearId: nextAcademicYear.id,
              gradeId: studentPreview.nextGradeId,
              name: studentPreview.nextClassName,
            },
          });

          if (specificClass) {
            targetClassId = specificClass.id;
          } else {
            const newClass = await tx.class.create({
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

        await tx.studentClass.create({
          data: {
            studentId: studentPreview.studentId,
            classId: targetClassId,
            reason:
              studentPreview.outcome === 'PASS'
                ? 'Promoted to next grade'
                : 'Repeated same grade',
            startDate: now,
          },
        });
      }
    }

    await tx.academicYear.update({
      where: { id: activeYear.id },
      data: { status: 'CLOSED' },
    });

    await tx.academicYear.updateMany({
      where: {
        status: 'ACTIVE',
        id: { not: nextAcademicYear.id },
      },
      data: { status: 'CLOSED' },
    });

    const activatedYear = await tx.academicYear.update({
      where: { id: nextAcademicYear.id },
      data: { status: 'ACTIVE' },
    });

    const termsCreated = await createDefaultTermsForYear(
      tx,
      activatedYear.id,
      activatedYear.startDate,
      activatedYear.endDate
    );

    return {
      promoted,
      repeated,
      graduated,
      previousAcademicYear: { id: activeYear.id, name: activeYear.name },
      newAcademicYear: { id: activatedYear.id, name: activatedYear.name },
      termsCreated,
    };
  });

  return {
    message: 'Promotion completed successfully',
    promoted: result.promoted,
    repeated: result.repeated,
    graduated: result.graduated,
    previousAcademicYear: result.previousAcademicYear,
    newAcademicYear: result.newAcademicYear,
    termsCreated: result.termsCreated,
  };
};
