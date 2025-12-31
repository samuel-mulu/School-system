import { prisma } from '../config/db';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

interface CreateClassData {
  name: string;
  description?: string;
  academicYear?: string;
  headTeacherId?: string;
}

interface UpdateClassData extends Partial<CreateClassData> {}

export const createClass = async (data: CreateClassData) => {
  // Check if class name already exists
  const existing = await prisma.class.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new ConflictError('Class with this name already exists');
  }

  // Verify head teacher exists if provided
  if (data.headTeacherId) {
    const teacher = await prisma.user.findUnique({
      where: { id: data.headTeacherId },
    });

    if (!teacher || teacher.role !== 'TEACHER') {
      throw new BadRequestError('Invalid head teacher');
    }
  }

  const classRecord = await prisma.class.create({
    data,
    include: {
      headTeacher: true,
      studentClasses: {
        where: {
          endDate: null,
        },
        include: {
          student: true,
        },
      },
      subjects: true,
    },
  });

  return classRecord;
};

export const getClasses = async (filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        headTeacher: true,
        studentClasses: {
          where: {
            endDate: null,
          },
          include: {
            student: true,
          },
        },
        subjects: true,
      },
      skip,
      take: limit,
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.class.count({ where }),
  ]);

  return {
    classes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getClassById = async (id: string) => {
  const classRecord = await prisma.class.findUnique({
    where: { id },
    include: {
      headTeacher: true,
      studentClasses: {
        include: {
          student: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
      subjects: {
        include: {
          marks: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  return classRecord;
};

export const updateClass = async (id: string, data: UpdateClassData) => {
  const classRecord = await prisma.class.findUnique({
    where: { id },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== classRecord.name) {
    const existing = await prisma.class.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError('Class with this name already exists');
    }
  }

  // Verify head teacher if provided
  if (data.headTeacherId) {
    const teacher = await prisma.user.findUnique({
      where: { id: data.headTeacherId },
    });

    if (!teacher || teacher.role !== 'TEACHER') {
      throw new BadRequestError('Invalid head teacher');
    }
  }

  const updated = await prisma.class.update({
    where: { id },
    data,
    include: {
      headTeacher: true,
      studentClasses: {
        where: {
          endDate: null,
        },
        include: {
          student: true,
        },
      },
      subjects: true,
    },
  });

  return updated;
};

export const deleteClass = async (id: string) => {
  const classRecord = await prisma.class.findUnique({
    where: { id },
    include: {
      studentClasses: {
        where: {
          endDate: null,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  if (classRecord.studentClasses.length > 0) {
    throw new BadRequestError('Cannot delete class with active students');
  }

  await prisma.class.delete({
    where: { id },
  });

  return { message: 'Class deleted successfully' };
};

// Subject management
export const createSubject = async (classId: string, data: { name: string; code?: string; description?: string }) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // Check if subject already exists for this class
  const existing = await prisma.subject.findFirst({
    where: {
      classId,
      name: data.name,
    },
  });

  if (existing) {
    throw new ConflictError('Subject with this name already exists for this class');
  }

  const subject = await prisma.subject.create({
    data: {
      ...data,
      classId,
    },
  });

  return subject;
};

export const getSubjectsByClass = async (classId: string) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  const subjects = await prisma.subject.findMany({
    where: { classId },
    orderBy: {
      name: 'asc',
    },
  });

  return subjects;
};

export const updateSubject = async (subjectId: string, data: { name?: string; code?: string; description?: string }) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== subject.name) {
    const existing = await prisma.subject.findFirst({
      where: {
        classId: subject.classId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ConflictError('Subject with this name already exists for this class');
    }
  }

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data,
  });

  return updated;
};

export const deleteSubject = async (subjectId: string) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      marks: {
        take: 1,
      },
    },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  if (subject.marks.length > 0) {
    throw new BadRequestError('Cannot delete subject with existing marks');
  }

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  return { message: 'Subject deleted successfully' };
};

