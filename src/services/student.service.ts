import { prisma } from '../config/db';
import { ClassStatus, PaymentStatus } from '../generated/prisma/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

interface CreateStudentData {
  // Personal details
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  nationality?: string;
  religion?: string;
  email?: string;
  phone?: string;
  
  // Parent info
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentRelation: string;
  
  // Address
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Emergency contact
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  
  // Medical info
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  
  // Previous school history
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
}

interface UpdateStudentData extends Partial<CreateStudentData> {}

export const createStudent = async (data: CreateStudentData) => {
  const student = await prisma.student.create({
    data: {
      ...data,
      classStatus: ClassStatus.new,
      paymentStatus: PaymentStatus.pending,
    },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
  });

  return student;
};

export const getStudents = async (filters?: {
  classStatus?: ClassStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters?.classStatus) {
    where.classStatus = filters.classStatus;
  }

  if (filters?.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        classHistory: {
          where: {
            endDate: null, // Active class
          },
          include: {
            class: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getStudentById = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          receipt: true,
        },
      },
      attendance: {
        take: 30,
        orderBy: {
          date: 'desc',
        },
      },
      marks: {
        include: {
          subject: true,
          class: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  return student;
};

export const updateStudent = async (id: string, data: UpdateStudentData) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const updated = await prisma.student.update({
    where: { id },
    data,
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
  });

  return updated;
};

export const assignStudentToClass = async (
  studentId: string,
  classId: string,
  reason: string = 'initial assignment'
) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify class exists
  const classExists = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classExists) {
    throw new NotFoundError('Class not found');
  }

  // Check if student already has an active class assignment
  const activeAssignment = await prisma.studentClass.findFirst({
    where: {
      studentId,
      endDate: null,
    },
  });

  if (activeAssignment) {
    throw new ConflictError('Student already has an active class assignment');
  }

  // Create new class assignment
  const studentClass = await prisma.studentClass.create({
    data: {
      studentId,
      classId,
      reason,
      startDate: new Date(),
    },
  });

  // Update student's class status
  await prisma.student.update({
    where: { id: studentId },
    data: {
      classStatus: ClassStatus.assigned,
    },
  });

  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
  });
};

export const transferStudent = async (
  studentId: string,
  newClassId: string,
  reason: string = 'transfer'
) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify new class exists
  const newClass = await prisma.class.findUnique({
    where: { id: newClassId },
  });

  if (!newClass) {
    throw new NotFoundError('Class not found');
  }

  // Find current active assignment
  const currentAssignment = await prisma.studentClass.findFirst({
    where: {
      studentId,
      endDate: null,
    },
  });

  if (!currentAssignment) {
    throw new BadRequestError('Student does not have an active class assignment');
  }

  if (currentAssignment.classId === newClassId) {
    throw new BadRequestError('Student is already in this class');
  }

  // Update old assignment with end date
  await prisma.studentClass.update({
    where: { id: currentAssignment.id },
    data: {
      endDate: new Date(),
      reason: reason || 'transferred',
    },
  });

  // Create new assignment
  await prisma.studentClass.create({
    data: {
      studentId,
      classId: newClassId,
      reason: reason || 'transfer',
      startDate: new Date(),
    },
  });

  // Return updated student with class history
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      },
    },
  });
};

export const deleteStudent = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  await prisma.student.delete({
    where: { id },
  });

  return { message: 'Student deleted successfully' };
};

