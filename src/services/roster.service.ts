import { prisma } from "../config/db.js";
import { NotFoundError } from "../utils/errors.js";
import { calculateTermTotal } from "./calculation.service.js";

export const getRosterResults = async (
  classId: string,
  termId: string,
  userId?: string,
  userRole?: string
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      grade: true,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  if (!classRecord.gradeId) {
    throw new NotFoundError('Class does not have a grade assigned');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Get all active students in the class
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId,
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
    },
    orderBy: {
      student: {
        firstName: 'asc',
      },
    },
  });

  // Get all subjects for the class's grade
  const subjects = await prisma.subject.findMany({
    where: {
      gradeId: classRecord.gradeId,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Calculate term totals for each student+subject+term combination
  const students = await Promise.all(
    studentClasses.map(async (sc) => {
      const subjectScores = await Promise.all(
        subjects.map(async (subject) => {
          try {
            const termResult = await calculateTermTotal(
              sc.studentId,
              subject.id,
              termId
            );
            return {
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code,
              termTotal: termResult.termTotal,
              grade: termResult.grade,
            };
          } catch (error: any) {
            // If calculation fails (e.g., no marks), return zero
            return {
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code,
              termTotal: 0,
              grade: 'F',
            };
          }
        })
      );

      return {
        studentId: sc.studentId,
        firstName: sc.student.firstName,
        lastName: sc.student.lastName,
        subjects: subjectScores,
      };
    })
  );

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    term: {
      id: term.id,
      name: term.name,
    },
    students,
  };
};

export const getRosterResultsSemesters = async (
  classId: string,
  userId?: string,
  userRole?: string
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      grade: true,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  if (!classRecord.gradeId) {
    throw new NotFoundError('Class does not have a grade assigned');
  }

  if (!classRecord.academicYearId) {
    throw new NotFoundError('Class does not have an academic year assigned');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  // Pick the first two terms for this class's academic year by startDate (no name matching).
  const allTerms = await prisma.term.findMany({
    where: { academicYearId: classRecord.academicYearId },
    orderBy: { startDate: 'asc' },
  });

  if (allTerms.length < 2) {
    throw new NotFoundError('At least two terms must exist for the class academic year');
  }

  const term1 = allTerms[0] || null;
  const term2 = allTerms[1] || null;

  // Get all active students in the class
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      classId,
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
    },
    orderBy: {
      student: {
        firstName: 'asc',
      },
    },
  });

  // Get all subjects for the class's grade
  const subjects = await prisma.subject.findMany({
    where: {
      gradeId: classRecord.gradeId,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const students = await Promise.all(
    studentClasses.map(async (sc) => {
      const subjectScores = await Promise.all(
        subjects.map(async (subject) => {
          const safeCalc = async (termId: string) => {
            try {
              const termResult = await calculateTermTotal(sc.studentId, subject.id, termId);
              return { termTotal: termResult.termTotal, grade: termResult.grade };
            } catch {
              return { termTotal: 0, grade: 'F' };
            }
          };

          const [t1, t2] = await Promise.all([safeCalc(term1.id), safeCalc(term2.id)]);
          const averageTotal = (t1.termTotal + t2.termTotal) / 2;

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            term1Total: t1.termTotal,
            term2Total: t2.termTotal,
            averageTotal,
          };
        })
      );

      return {
        studentId: sc.studentId,
        firstName: sc.student.firstName,
        lastName: sc.student.lastName,
        subjects: subjectScores,
      };
    })
  );

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    terms: {
      term1: { id: term1.id, name: term1.name },
      term2: { id: term2.id, name: term2.name },
    },
    students,
  };
};