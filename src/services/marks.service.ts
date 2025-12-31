import { prisma } from '../config/db';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

interface CreateMarkData {
  studentId: string;
  classId: string;
  subjectId: string;
  term: string;
  score: number;
  maxScore?: number;
  grade?: string;
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

  // Validate score
  const maxScore = data.maxScore || 100;
  if (data.score < 0 || data.score > maxScore) {
    throw new BadRequestError(`Score must be between 0 and ${maxScore}`);
  }

  // Calculate grade if not provided
  let grade = data.grade;
  if (!grade) {
    const percentage = (data.score / maxScore) * 100;
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    else grade = 'F';
  }

  const mark = await prisma.mark.create({
    data: {
      ...data,
      maxScore,
      grade,
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
    },
  });

  return mark;
};

export const getMarks = async (filters?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  term?: string;
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

  if (filters?.term) {
    where.term = filters.term;
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
    },
  });

  if (!mark) {
    throw new NotFoundError('Mark not found');
  }

  return mark;
};

export const getStudentMarksByTerm = async (studentId: string, term: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const marks = await prisma.mark.findMany({
    where: {
      studentId,
      term,
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
    },
    orderBy: {
      subject: {
        name: 'asc',
      },
    },
  });

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    },
    term,
    marks,
    summary: {
      totalSubjects: marks.length,
      averageScore: marks.length > 0
        ? marks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0) / marks.length
        : 0,
    },
  };
};

export const getClassMarksByTerm = async (classId: string, term: string) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  const marks = await prisma.mark.findMany({
    where: {
      classId,
      term,
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
    ],
  });

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    term,
    marks,
  };
};

export const updateMark = async (
  id: string,
  data: {
    score?: number;
    maxScore?: number;
    grade?: string;
    notes?: string;
  }
) => {
  const mark = await prisma.mark.findUnique({
    where: { id },
  });

  if (!mark) {
    throw new NotFoundError('Mark not found');
  }

  // Validate score if provided
  if (data.score !== undefined) {
    const maxScore = data.maxScore || mark.maxScore;
    if (data.score < 0 || data.score > maxScore) {
      throw new BadRequestError(`Score must be between 0 and ${maxScore}`);
    }

    // Recalculate grade if score changed
    if (!data.grade) {
      const percentage = (data.score / maxScore) * 100;
      if (percentage >= 90) data.grade = 'A';
      else if (percentage >= 80) data.grade = 'B';
      else if (percentage >= 70) data.grade = 'C';
      else if (percentage >= 60) data.grade = 'D';
      else data.grade = 'F';
    }
  }

  const updated = await prisma.mark.update({
    where: { id },
    data,
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

