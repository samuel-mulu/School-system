import { Prisma } from '@prisma/client';
import { prisma } from "../config/db.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import { getActiveAcademicYear } from "./academicYear.service.js";
import { calculateWeightedScore } from "./calculation.service.js";
import { getHighestGrade } from "./grade.service.js";
import { getSetting } from "./settings.service.js";
import {
  buildRepeatClassDisplayName,
  extractSectionAndBuildNextClassName,
  formatClassNameForYear,
  stripYearSuffix,
} from "../utils/promotionClassNames.js";

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
  skipped: number;
  alreadyProcessed: number;
  errors: Array<{ studentId: string; studentName?: string; error: string }>;
  previousAcademicYear: { id: string; name: string };
  newAcademicYear: { id: string; name: string };
  termsCreated: string[];
}

const PROMOTION_BATCH_SIZE = 25;
const TX_OPTIONS = { maxWait: 15000, timeout: 60000 };

const logPromotion = (message: string, data?: unknown) => {
  if (data !== undefined) {
    console.log(`[Promotion] ${message}`, data);
  } else {
    console.log(`[Promotion] ${message}`);
  }
};

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
      nextClassName = extractSectionAndBuildNextClassName(
        sc.class.name,
        currentGrade.name,
        nextGrade.name
      );
    } else {
      outcome = 'GRADUATE';
    }
  } else {
    outcome = 'REPEAT';
    nextGradeId = currentGrade.id;
    nextGradeName = currentGrade.name;
    nextClassName = buildRepeatClassDisplayName(sc.class.name, currentGrade.name);
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
  logPromotion('=== Execute promotion started ===');

  const preview = await getPromotionPreview({ includeStudents: true });

  logPromotion('Preview summary', preview.summary);
  logPromotion('Active year', preview.activeAcademicYear);
  logPromotion('Next year name', preview.nextAcademicYearName);
  if (preview.blockers.length > 0) {
    logPromotion('Blockers', preview.blockers);
  }

  for (const s of preview.students) {
    logPromotion(
      `Outcome: ${s.firstName} ${s.lastName} | ${s.currentClassName} → ${s.nextClassName ?? 'GRADUATE'} | avg=${s.overallAverage.toFixed(1)} | ${s.outcome}`
    );
  }

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
  });

  if (existingNextYear) {
    logPromotion(
      `Next year "${nextYearName}" already exists (${existingNextYear.status}) — resume mode enabled`
    );
  }

  const grades = await prisma.grade.findMany({ orderBy: { order: 'asc' } });
  const studentIds = preview.students.map((s) => s.studentId);

  logPromotion(`Students to evaluate: ${studentIds.length}`);

  const [activeAssignments, nextYearAssignments, graduatedStudents] =
    await Promise.all([
      prisma.studentClass.findMany({
        where: {
          studentId: { in: studentIds },
          endDate: null,
        },
      }),
      existingNextYear
        ? prisma.studentClass.findMany({
            where: {
              studentId: { in: studentIds },
              endDate: null,
              class: { academicYearId: existingNextYear.id },
            },
            select: { studentId: true },
          })
        : Promise.resolve([]),
      prisma.student.findMany({
        where: {
          id: { in: studentIds },
          classStatus: 'graduated',
        },
        select: { id: true },
      }),
    ]);

  const assignmentByStudentId = new Map(
    activeAssignments.map((a) => [a.studentId, a])
  );
  const alreadyInNextYear = new Set(nextYearAssignments.map((a) => a.studentId));
  const alreadyGraduated = new Set(graduatedStudents.map((s) => s.id));

  const errors: PromotionResult['errors'] = [];
  let skipped = 0;
  let alreadyProcessed = 0;

  // Tx A: create next year, seed grade classes, create terms
  logPromotion('Tx A: setup next year, grade classes, section classes…');
  const setup = await prisma.$transaction(async (tx) => {
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
      const dbName = formatClassNameForYear(grade.name, nextYearName);
      let existingClass = await tx.class.findFirst({
        where: { name: dbName },
      });

      if (!existingClass) {
        existingClass = await tx.class.findFirst({
          where: { gradeId: grade.id, academicYearId: nextAcademicYear.id },
        });
      }

      if (existingClass) {
        classMap.set(grade.id, existingClass.id);
      } else {
        const newClass = await tx.class.create({
          data: {
            name: dbName,
            description: `${grade.name} - ${nextYearName}`,
            gradeId: grade.id,
            academicYearId: nextAcademicYear.id,
          },
        });
        classMap.set(grade.id, newClass.id);
      }
    }

    const targetClassIds = new Map<string, string>();

    for (const studentPreview of preview.students) {
      if (studentPreview.outcome === 'GRADUATE' || !studentPreview.nextGradeId) {
        continue;
      }
      if (!studentPreview.nextClassName) {
        continue;
      }

      const displayName = stripYearSuffix(studentPreview.nextClassName);
      const dbName = formatClassNameForYear(displayName, nextYearName);
      const key = `${studentPreview.nextGradeId}:${dbName}`;

      if (targetClassIds.has(key)) {
        continue;
      }

      let cls = await tx.class.findFirst({ where: { name: dbName } });
      if (!cls) {
        cls = await tx.class.create({
          data: {
            name: dbName,
            description: `${displayName} - ${nextYearName}`,
            gradeId: studentPreview.nextGradeId,
            academicYearId: nextAcademicYear.id,
          },
        });
      }
      targetClassIds.set(key, cls.id);
    }

    return { nextAcademicYear, classMap, targetClassIds };
  }, TX_OPTIONS);

  const { nextAcademicYear, classMap, targetClassIds } = setup;
  logPromotion('Tx A complete', {
    nextYearId: nextAcademicYear.id,
    gradeClasses: classMap.size,
    sectionClasses: targetClassIds.size,
  });

  type BatchOp = {
    studentId: string;
    studentName: string;
    assignmentId: string;
    outcome: 'PASS' | 'REPEAT' | 'GRADUATE';
    targetClassId?: string;
  };

  const operations: BatchOp[] = [];

  for (const studentPreview of preview.students) {
    const studentName = `${studentPreview.firstName} ${studentPreview.lastName}`;
    const currentAssignment = assignmentByStudentId.get(studentPreview.studentId);

    if (studentPreview.outcome === 'GRADUATE' && alreadyGraduated.has(studentPreview.studentId)) {
      alreadyProcessed++;
      logPromotion(`SKIP (already graduated): ${studentName}`);
      continue;
    }

    if (alreadyInNextYear.has(studentPreview.studentId)) {
      alreadyProcessed++;
      logPromotion(
        `SKIP (already in next year): ${studentName} | intended ${studentPreview.outcome}`
      );
      continue;
    }

    if (!currentAssignment) {
      skipped++;
      const err = 'No active class assignment found';
      logPromotion(`SKIP: ${studentName} — ${err}`);
      errors.push({
        studentId: studentPreview.studentId,
        studentName,
        error: err,
      });
      continue;
    }

    if (currentAssignment.promotionStatus) {
      alreadyProcessed++;
      logPromotion(
        `SKIP (assignment already closed): ${studentName} | status=${currentAssignment.promotionStatus}`
      );
      continue;
    }

    if (studentPreview.outcome === 'GRADUATE') {
      operations.push({
        studentId: studentPreview.studentId,
        studentName,
        assignmentId: currentAssignment.id,
        outcome: 'GRADUATE',
      });
      logPromotion(`QUEUE GRADUATE: ${studentName}`);
      continue;
    }

    if (!studentPreview.nextGradeId) {
      skipped++;
      const err = 'No target grade for student';
      logPromotion(`SKIP: ${studentName} — ${err}`);
      errors.push({
        studentId: studentPreview.studentId,
        studentName,
        error: err,
      });
      continue;
    }

    let targetClassId = classMap.get(studentPreview.nextGradeId);

    if (studentPreview.nextClassName) {
      const displayName = stripYearSuffix(studentPreview.nextClassName);
      const dbName = formatClassNameForYear(displayName, nextYearName);
      const key = `${studentPreview.nextGradeId}:${dbName}`;
      targetClassId = targetClassIds.get(key) ?? targetClassId;
    }

    if (!targetClassId) {
      skipped++;
      const err = 'Target class could not be resolved';
      logPromotion(`SKIP: ${studentName} — ${err}`);
      errors.push({
        studentId: studentPreview.studentId,
        studentName,
        error: err,
      });
      continue;
    }

    operations.push({
      studentId: studentPreview.studentId,
      studentName,
      assignmentId: currentAssignment.id,
      outcome: studentPreview.outcome,
      targetClassId,
    });
    logPromotion(
      `QUEUE ${studentPreview.outcome}: ${studentName} → ${studentPreview.nextClassName}`
    );
  }

  const totalBatches = Math.ceil(operations.length / PROMOTION_BATCH_SIZE) || 0;
  logPromotion('Operation queue', {
    toProcess: operations.length,
    alreadyProcessed,
    skipped,
    batches: totalBatches,
    batchSize: PROMOTION_BATCH_SIZE,
  });

  let promoted = 0;
  let repeated = 0;
  let graduated = 0;
  const now = new Date();

  for (let i = 0; i < operations.length; i += PROMOTION_BATCH_SIZE) {
    const batch = operations.slice(i, i + PROMOTION_BATCH_SIZE);
    const batchNum = Math.floor(i / PROMOTION_BATCH_SIZE) + 1;
    logPromotion(
      `Tx B batch ${batchNum}/${totalBatches}: processing ${batch.length} students…`
    );

    try {
      await prisma.$transaction(async (tx) => {
        for (const op of batch) {
          const promotionStatus =
            op.outcome === 'PASS'
              ? ('PROMOTED' as const)
              : op.outcome === 'REPEAT'
                ? ('REPEATED' as const)
                : ('GRADUATED' as const);

          await tx.studentClass.update({
            where: { id: op.assignmentId },
            data: { endDate: now, promotionStatus },
          });

          if (op.outcome === 'GRADUATE') {
            graduated++;
            await tx.student.update({
              where: { id: op.studentId },
              data: { classStatus: 'graduated' },
            });
            logPromotion(`DONE GRADUATE: ${op.studentName}`);
          } else if (op.targetClassId) {
            if (op.outcome === 'PASS') promoted++;
            else repeated++;

            await tx.studentClass.create({
              data: {
                studentId: op.studentId,
                classId: op.targetClassId,
                reason:
                  op.outcome === 'PASS'
                    ? 'Promoted to next grade'
                    : 'Repeated same grade',
                startDate: now,
              },
            });

            await tx.student.update({
              where: { id: op.studentId },
              data: { classStatus: 'assigned' },
            });
            logPromotion(`DONE ${op.outcome}: ${op.studentName}`);
          }
        }
      }, TX_OPTIONS);
      logPromotion(`Tx B batch ${batchNum}/${totalBatches}: OK`);
    } catch (batchError) {
      const msg =
        batchError instanceof Error ? batchError.message : String(batchError);
      logPromotion(`Tx B batch ${batchNum}/${totalBatches}: FAILED — ${msg}`);
      for (const op of batch) {
        errors.push({
          studentId: op.studentId,
          studentName: op.studentName,
          error: `Batch ${batchNum} failed: ${msg}`,
        });
        skipped++;
      }
    }
  }

  // Tx C: flip academic years (safe to re-run if next year already ACTIVE)
  logPromotion('Tx C: close old year, activate new year…');
  const activatedYear = await prisma.$transaction(async (tx) => {
    await tx.academicYear.update({
      where: { id: activeYear.id },
      data: { status: 'CLOSED' },
    });

    await tx.academicYear.updateMany({
      where: { status: 'ACTIVE', id: { not: nextAcademicYear.id } },
      data: { status: 'CLOSED' },
    });

    const activated = await tx.academicYear.update({
      where: { id: nextAcademicYear.id },
      data: { status: 'ACTIVE' },
    });

    const termsCreated = await createDefaultTermsForYear(
      tx,
      activated.id,
      activated.startDate,
      activated.endDate
    );

    return { activated, termsCreated };
  }, TX_OPTIONS);

  logPromotion('Tx C complete', {
    newActiveYear: activatedYear.activated.name,
    termsCreated: activatedYear.termsCreated,
  });

  const result: PromotionResult = {
    message:
      errors.length > 0
        ? 'Promotion finished with errors — check server logs and re-run to process remaining students'
        : alreadyProcessed > 0 && operations.length === 0
          ? 'All students were already processed; academic year state updated'
          : 'Promotion completed successfully',
    promoted,
    repeated,
    graduated,
    skipped,
    alreadyProcessed,
    errors,
    previousAcademicYear: { id: activeYear.id, name: activeYear.name },
    newAcademicYear: { id: activatedYear.activated.id, name: activatedYear.activated.name },
    termsCreated: activatedYear.termsCreated,
  };

  logPromotion('=== Execute promotion finished ===', {
    promoted: result.promoted,
    repeated: result.repeated,
    graduated: result.graduated,
    alreadyProcessed: result.alreadyProcessed,
    skipped: result.skipped,
    errors: result.errors.length,
  });

  if (result.errors.length > 0) {
    logPromotion('Errors detail', result.errors);
  }

  return result;
};
