import { ClassStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { deleteImageByUrl } from "../utils/cloudinary.js";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "../utils/errors.js";

interface CreateStudentData {
  // Personal details
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string;
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

  // Optional class assignment during creation
  classId?: string;
  assignClassReason?: string;

  // Profile image
  profileImageUrl?: string;

  // Parents portal access
  parentsPortal?: boolean;
}

interface UpdateStudentData extends Partial<CreateStudentData> {}

export const createStudent = async (data: CreateStudentData) => {
  // Ensure dateOfBirth is a proper Date object
  // Handle both Date objects and date strings (YYYY-MM-DD format)
  let dateOfBirth: Date;
  if (data.dateOfBirth instanceof Date) {
    dateOfBirth = data.dateOfBirth;
  } else if (typeof data.dateOfBirth === "string") {
    // If it's a date string like "2026-01-01", ensure it's converted properly
    // Add time component if missing to make it a valid ISO-8601 DateTime
    const dateStr = data.dateOfBirth.includes("T")
      ? data.dateOfBirth
      : `${data.dateOfBirth}T00:00:00.000Z`;
    dateOfBirth = new Date(dateStr);
  } else {
    dateOfBirth = new Date(data.dateOfBirth);
  }

  // Validate the date
  if (isNaN(dateOfBirth.getTime())) {
    throw new BadRequestError("Invalid date format for dateOfBirth");
  }

  // Remove classId and assignClassReason from student data (they're not student fields)
  const { classId, assignClassReason, ...studentData } = data;

  // If classId is provided, verify class exists
  if (classId) {
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      throw new NotFoundError("Class not found");
    }
  }

  const student = await prisma.student.create({
    data: {
      ...studentData,
      dateOfBirth,
      classStatus: classId ? ClassStatus.assigned : ClassStatus.new,
      paymentStatus: PaymentStatus.pending,
      parentsPortal: studentData.parentsPortal ?? true, // Default to true if not provided
    },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
    },
  });

  // If classId is provided, assign student to class
  if (classId) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId,
        reason: assignClassReason || "initial assignment",
        startDate: new Date(),
      },
    });

    // Return student with updated class history
    return prisma.student.findUnique({
      where: { id: student.id },
      include: {
        classHistory: {
          include: {
            class: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });
  }

  return student;
};

export const getStudents = async (filters?: {
  classStatus?: ClassStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  classId?: string;
  gradeId?: string;
  page?: number;
  limit?: number;
  month?: string;
  year?: number;
  userId?: string;
  userRole?: string;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 40;
  const skip = (page - 1) * limit;

  const where: any = {};

  // If user is a TEACHER, only show students from their assigned classes
  if (filters?.userRole === "TEACHER" && filters?.userId) {
    const teacherClasses = await prisma.class.findMany({
      where: { headTeacherId: filters.userId },
      select: { id: true },
    });
    const classIds = teacherClasses.map((c: { id: string }) => c.id);

    if (classIds.length === 0) {
      // Teacher has no assigned classes, return empty result
      return {
        students: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Filter students by teacher's assigned classes
    where.classHistory = {
      some: {
        classId: { in: classIds },
        endDate: null, // Only active class assignments
      },
    };
  }

  if (filters?.classStatus) {
    where.classStatus = filters.classStatus;
  }

  if (filters?.paymentStatus) {
    if (filters.month) {
      // If month is provided, filter students by their payment status for that specific month
      const year = filters.year || new Date().getFullYear();

      if (filters.paymentStatus === PaymentStatus.confirmed) {
        // Find students who HAVE a confirmed payment for this month
        where.payments = {
          some: {
            month: filters.month,
            year: year,
            status: PaymentStatus.confirmed,
          },
        };
      } else {
        // Find students who DO NOT have a confirmed payment for this month
        // This includes those with pending payments OR no payment record at all for this month
        where.NOT = {
          payments: {
            some: {
              month: filters.month,
              year: year,
              status: PaymentStatus.confirmed,
            },
          },
        };
      }
    } else {
      // Fallback to global paymentStatus if no month is provided
      where.paymentStatus = filters.paymentStatus;
    }
  }

  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Filter by gradeId through classHistory -> class relationship
  if (filters?.gradeId) {
    where.classHistory = {
      some: {
        class: {
          gradeId: filters.gradeId,
        },
        endDate: null, // Only active class assignments
      },
    };
  }

  // Filter by classId through StudentClass relationship
  if (filters?.classId) {
    // If teacher, verify they have access to this class
    if (filters?.userRole === "TEACHER" && filters?.userId) {
      const classRecord = await prisma.class.findUnique({
        where: { id: filters.classId },
      });
      if (!classRecord || classRecord.headTeacherId !== filters.userId) {
        throw new NotFoundError("Class not found");
      }
    }

    // If teacher already has classHistory filter, replace it with the specific classId
    // (since we've verified the teacher has access to this class)
    where.classHistory = {
      some: {
        classId: filters.classId,
        endDate: null, // Only active class assignments
      },
    };
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
        payments: filters?.month ? {
          where: filters.month === "register_fee" 
            ? {
                OR: [
                  { month: { endsWith: "-13" } },
                  { paymentType: { name: { contains: "Register", mode: "insensitive" } } }
                ]
              }
            : {
                month: filters.month,
                year: filters.year || new Date().getFullYear(),
              },
          include: {
            receipt: true,
            paymentType: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Just in case there are duplicates, take the latest
        } : false,
      },
      skip,
      take: limit,
      orderBy: {
        firstName: "asc",
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

export const getStudentById = async (
  id: string,
  userId?: string,
  userRole?: string,
) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          receipt: true,
        },
      },
      attendance: {
        take: 30,
        orderBy: {
          date: "desc",
        },
      },
      marks: {
        include: {
          subject: true,
          class: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  // If user is a TEACHER, check if student is in one of their assigned classes
  if (userRole === "TEACHER" && userId) {
    const activeClass = student.classHistory.find(
      (ch: { endDate: Date | null }) => !ch.endDate,
    );
    if (!activeClass) {
      throw new NotFoundError("Student not found");
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: activeClass.classId },
    });

    if (!classRecord || classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Student not found");
    }
  }

  return student;
};

export const updateStudent = async (id: string, data: UpdateStudentData) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  // Ensure dateOfBirth is a proper Date object if provided
  const updateData: any = { ...data };
  if (data.dateOfBirth) {
    let dateOfBirth: Date;
    if (data.dateOfBirth instanceof Date) {
      dateOfBirth = data.dateOfBirth;
    } else if (typeof data.dateOfBirth === "string") {
      const dateStr = data.dateOfBirth.includes("T")
        ? data.dateOfBirth
        : `${data.dateOfBirth}T00:00:00.000Z`;
      dateOfBirth = new Date(dateStr);
    } else {
      dateOfBirth = new Date(data.dateOfBirth);
    }

    if (isNaN(dateOfBirth.getTime())) {
      throw new BadRequestError("Invalid date format for dateOfBirth");
    }

    updateData.dateOfBirth = dateOfBirth;
  }

  // Handle profile image update - delete old image if new one is provided
  if (
    data.profileImageUrl &&
    student.profileImageUrl &&
    data.profileImageUrl !== student.profileImageUrl
  ) {
    // New image provided and different from old one - delete old image
    try {
      await deleteImageByUrl(student.profileImageUrl);
    } catch (error) {
      // Log error but don't fail the update if image deletion fails
      console.error("Failed to delete old profile image:", error);
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: updateData,
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
    },
  });

  return updated;
};

export const assignStudentToClass = async (
  studentId: string,
  classId: string,
  reason: string = "initial assignment",
) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  // Verify class exists
  const classExists = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classExists) {
    throw new NotFoundError("Class not found");
  }

  // Check if student already has an active class assignment
  const activeAssignment = await prisma.studentClass.findFirst({
    where: {
      studentId,
      endDate: null,
    },
  });

  if (activeAssignment) {
    throw new ConflictError("Student already has an active class assignment");
  }

  // Create new class assignment
  await prisma.studentClass.create({
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
          startDate: "desc",
        },
      },
    },
  });
};

export const transferStudent = async (
  studentId: string,
  newClassId: string,
  reason: string = "transfer",
) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  // Verify new class exists
  const newClass = await prisma.class.findUnique({
    where: { id: newClassId },
  });

  if (!newClass) {
    throw new NotFoundError("Class not found");
  }

  // Find current active assignment
  const currentAssignment = await prisma.studentClass.findFirst({
    where: {
      studentId,
      endDate: null,
    },
  });

  if (!currentAssignment) {
    throw new BadRequestError(
      "Student does not have an active class assignment",
    );
  }

  if (currentAssignment.classId === newClassId) {
    throw new BadRequestError("Student is already in this class");
  }

  // Update old assignment with end date
  await prisma.studentClass.update({
    where: { id: currentAssignment.id },
    data: {
      endDate: new Date(),
      reason: reason || "transferred",
    },
  });

  // Create new assignment
  await prisma.studentClass.create({
    data: {
      studentId,
      classId: newClassId,
      reason: reason || "transfer",
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
          startDate: "desc",
        },
      },
    },
  });
};

export interface BulkTransferItemResult {
  studentId: string;
  success: boolean;
  studentName?: string;
  error?: string;
}

export interface BulkTransferResult {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkTransferItemResult[];
}

export const transferStudentsBulk = async (
  studentIds: string[],
  newClassId: string,
  reason: string = "transfer",
): Promise<BulkTransferResult> => {
  const newClass = await prisma.class.findUnique({
    where: { id: newClassId },
  });

  if (!newClass) {
    throw new NotFoundError("Class not found");
  }

  const uniqueIds = [...new Set(studentIds)];

  if (uniqueIds.length === 0) {
    throw new BadRequestError("No students selected");
  }

  if (uniqueIds.length > 200) {
    throw new BadRequestError("Cannot transfer more than 200 students at once");
  }

  const students = await prisma.student.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const activeAssignments = await prisma.studentClass.findMany({
    where: {
      studentId: { in: uniqueIds },
      endDate: null,
    },
  });
  const assignmentMap = new Map(
    activeAssignments.map((a) => [a.studentId, a]),
  );

  const results: BulkTransferItemResult[] = [];
  const toTransfer: Array<{
    studentId: string;
    assignmentId: string;
    name: string;
  }> = [];

  for (const id of uniqueIds) {
    const student = studentMap.get(id);
    if (!student) {
      results.push({
        studentId: id,
        success: false,
        error: "Student not found",
      });
      continue;
    }

    const studentName = `${student.firstName} ${student.lastName}`;
    const assignment = assignmentMap.get(id);

    if (!assignment) {
      results.push({
        studentId: id,
        success: false,
        studentName,
        error: "Student does not have an active class assignment",
      });
      continue;
    }

    if (assignment.classId === newClassId) {
      results.push({
        studentId: id,
        success: false,
        studentName,
        error: "Student is already in this class",
      });
      continue;
    }

    toTransfer.push({
      studentId: id,
      assignmentId: assignment.id,
      name: studentName,
    });
  }

  const BATCH_SIZE = 25;
  for (let i = 0; i < toTransfer.length; i += BATCH_SIZE) {
    const batch = toTransfer.slice(i, i + BATCH_SIZE);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const item of batch) {
        await tx.studentClass.update({
          where: { id: item.assignmentId },
          data: {
            endDate: now,
            reason: reason || "transferred",
          },
        });
        await tx.studentClass.create({
          data: {
            studentId: item.studentId,
            classId: newClassId,
            reason: reason || "transfer",
            startDate: now,
          },
        });
      }
    });

    for (const item of batch) {
      results.push({
        studentId: item.studentId,
        success: true,
        studentName: item.name,
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    total: uniqueIds.length,
    succeeded,
    failed: uniqueIds.length - succeeded,
    results,
  };
};

export const updateParentsPortal = async (
  id: string,
  parentsPortal: boolean,
) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  const updated = await prisma.student.update({
    where: { id },
    data: { parentsPortal },
    include: {
      classHistory: {
        include: {
          class: true,
        },
        orderBy: {
          startDate: "desc",
        },
      },
    },
  });

  return updated;
};

export const deleteStudent = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  await prisma.student.delete({
    where: { id },
  });

  return { message: "Student deleted successfully" };
};
