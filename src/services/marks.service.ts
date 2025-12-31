import { prisma } from '../config/db';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { assignGrade, calculateTermTotal, calculateYearAverage } from './calculation.service';

interface CreateMarkData {
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  subExamId: string;
  score: number;
  notes?: string;
}

export const createMark = async (data: CreateMarkData) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: data.classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // Verify subject exists and belongs to class
  const subject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  if (subject.classId !== data.classId) {
    throw new BadRequestError('Subject does not belong to this class');
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: data.termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Verify sub-exam exists and belongs to subject and term
  const subExam = await prisma.subExam.findUnique({
    where: { id: data.subExamId },
  });

  if (!subExam) {
    throw new NotFoundError('Sub-exam not found');
  }

  if (subExam.subjectId !== data.subjectId || subExam.termId !== data.termId) {
    throw new BadRequestError('Sub-exam does not belong to this subject and term');
  }

  // Check if student is/was assigned to this class
  const studentClass = await prisma.studentClass.findFirst({
    where: {
      studentId: data.studentId,
      classId: data.classId,
    },
  });

  if (!studentClass) {
    throw new BadRequestError('Student is not assigned to this class');
  }

  // Check if mark already exists
  const existing = await prisma.mark.findUnique({
    where: {
      studentId_subjectId_termId_subExamId: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        termId: data.termId,
        subExamId: data.subExamId,
      },
    },
  });

  if (existing) {
    throw new ConflictError('Mark already exists for this student, subject, term, and sub-exam');
  }

  // Validate score against sub-exam max score
  if (data.score < 0 || data.score > subExam.maxScore) {
    throw new BadRequestError(`Score must be between 0 and ${subExam.maxScore}`);
  }

  // Calculate grade based on percentage
  const percentage = (data.score / subExam.maxScore) * 100;
  const grade = assignGrade(percentage);

  const mark = await prisma.mark.create({
    data: {
      studentId: data.studentId,
      classId: data.classId,
      subjectId: data.subjectId,
      termId: data.termId,
      subExamId: data.subExamId,
      score: data.score,
      maxScore: subExam.maxScore,
      grade,
      notes: data.notes,
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
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
      subExam: {
        select: {
          id: true,
          name: true,
          examType: true,
          maxScore: true,
          weightPercent: true,
        },
      },
    },
  });

  return mark;
};

export const recordMark = async (
  studentId: string,
  subExamId: string,
  score: number,
  notes?: string
) => {
  // Get sub-exam to get related IDs
  const subExam = await prisma.subExam.findUnique({
    where: { id: subExamId },
    include: {
      subject: {
        include: {
          class: true,
        },
      },
    },
  });

  if (!subExam) {
    throw new NotFoundError('Sub-exam not found');
  }

  // Use createMark with all required fields
    return createMark({
      studentId,
      classId: subExam.subject.classId,
      subjectId: subExam.subjectId,
      termId: subExam.termId,
      subExamId,
      score,
      notes: notes || undefined,
    });
};

export const getMarks = async (filters?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  termId?: string;
  subExamId?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters?.studentId) {
    where.studentId = filters.studentId;
  }

  if (filters?.classId) {
    where.classId = filters.classId;
  }

  if (filters?.subjectId) {
    where.subjectId = filters.subjectId;
  }

  if (filters?.termId) {
    where.termId = filters.termId;
  }

  if (filters?.subExamId) {
    where.subExamId = filters.subExamId;
  }

  const [marks, total] = await Promise.all([
    prisma.mark.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
        subExam: {
          select: {
            id: true,
            name: true,
            examType: true,
            maxScore: true,
            weightPercent: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.mark.count({ where }),
  ]);

  return {
    marks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getMarkById = async (id: string) => {
  const mark = await prisma.mark.findUnique({
    where: { id },
    include: {
      student: true,
      class: true,
      subject: true,
      term: true,
      subExam: true,
    },
  });

  if (!mark) {
    throw new NotFoundError('Mark not found');
  }

  return mark;
};

export const getStudentMarksByTerm = async (studentId: string, termId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  const marks = await prisma.mark.findMany({
    where: {
      studentId,
      termId,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
      subExam: {
        select: {
          id: true,
          name: true,
          examType: true,
          maxScore: true,
          weightPercent: true,
        },
      },
    },
    orderBy: [
      {
        subject: {
          name: 'asc',
        },
      },
      {
        subExam: {
          name: 'asc',
        },
      },
    ],
  });

  // Group marks by subject
  const marksBySubject = marks.reduce((acc: Record<string, { subject: any; marks: any[] }>, mark: any) => {
    const subjectId = mark.subjectId;
    if (!acc[subjectId]) {
      acc[subjectId] = {
        subject: mark.subject,
        marks: [],
      };
    }
    acc[subjectId].marks.push(mark);
    return acc;
  }, {} as Record<string, { subject: any; marks: any[] }>);

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    },
    term: {
      id: term.id,
      name: term.name,
    },
    marksBySubject: Object.values(marksBySubject),
    allMarks: marks,
    summary: {
      totalSubjects: Object.keys(marksBySubject).length,
      totalMarks: marks.length,
    },
  };
};

export const getClassMarksByTerm = async (classId: string, termId: string) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  const marks = await prisma.mark.findMany({
    where: {
      classId,
      termId,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
      subExam: {
        select: {
          id: true,
          name: true,
          examType: true,
          maxScore: true,
          weightPercent: true,
        },
      },
    },
    orderBy: [
      {
        subject: {
          name: 'asc',
        },
      },
      {
        student: {
          lastName: 'asc',
        },
      },
      {
        subExam: {
          name: 'asc',
        },
      },
    ],
  });

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    term: {
      id: term.id,
      name: term.name,
    },
    marks,
  };
};

export const updateMark = async (
  id: string,
  data: {
    score?: number;
    grade?: string;
    notes?: string;
  }
) => {
  const mark = await prisma.mark.findUnique({
    where: { id },
    include: {
      subExam: true,
    },
  });

  if (!mark) {
    throw new NotFoundError('Mark not found');
  }

  // Validate score if provided
  if (data.score !== undefined) {
    const maxScore = mark.subExam.maxScore;
    if (data.score < 0 || data.score > maxScore) {
      throw new BadRequestError(`Score must be between 0 and ${maxScore}`);
    }

    // Recalculate grade if score changed
    if (!data.grade) {
      const percentage = (data.score / maxScore) * 100;
      data.grade = assignGrade(percentage);
    }
  }

  const updated = await prisma.mark.update({
    where: { id },
    data: {
      score: data.score,
      grade: data.grade,
      notes: data.notes,
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
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
      subExam: {
        select: {
          id: true,
          name: true,
          examType: true,
          maxScore: true,
          weightPercent: true,
        },
      },
    },
  });

  return updated;
};

export const deleteMark = async (id: string) => {
  const mark = await prisma.mark.findUnique({
    where: { id },
  });

  if (!mark) {
    throw new NotFoundError('Mark not found');
  }

  await prisma.mark.delete({
    where: { id },
  });

  return { message: 'Mark deleted successfully' };
};

// New functions for calculations
export const calculateTermScore = async (
  studentId: string,
  subjectId: string,
  termId: string
) => {
  return calculateTermTotal(studentId, subjectId, termId);
};

export const calculateYearScore = async (
  studentId: string,
  subjectId: string
) => {
  return calculateYearAverage(studentId, subjectId);
};

export const getTermReport = async (studentId: string, termId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Get all subjects the student is enrolled in
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      studentId,
      endDate: null,
    },
    include: {
      class: {
        include: {
          subjects: true,
        },
      },
    },
  });

  const subjects = studentClasses.flatMap((sc: any) => sc.class.subjects);

  // Calculate term scores for each subject
  const subjectScores = await Promise.all(
    subjects.map(async (subject: any) => {
      try {
        const termScore = await calculateTermScore(
          studentId,
          subject.id,
          termId
        );
        return {
          subject: {
            id: subject.id,
            name: subject.name,
            code: subject.code,
          },
          ...termScore,
        };
      } catch {
        return {
          subject: {
            id: subject.id,
            name: subject.name,
            code: subject.code,
          },
          subExamTotal: 0,
          generalTestTotal: 0,
          termTotal: 0,
          grade: 'F',
          breakdown: [],
        };
      }
    })
  );

  // Calculate overall average
  const overallAverage =
    subjectScores.length > 0
      ? subjectScores.reduce((sum: number, s: any) => sum + s.termTotal, 0) /
        subjectScores.length
      : 0;

  const overallGrade = assignGrade(overallAverage);

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    },
    term: {
      id: term.id,
      name: term.name,
    },
    subjects: subjectScores,
    overallAverage,
    overallGrade,
  };
};

