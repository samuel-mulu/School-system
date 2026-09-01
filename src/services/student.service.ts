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
  academicYearId?: string;
  page?: number;
  limit?: number;
  month?: string;
  year?: number;
  userId?: string;
  userRole?: string;
  excludeGraduated?: boolean;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 40;
  const skip = (page - 1) * limit;

  const where: any = {};

  let academicYearId = filters?.academicYearId;
  let isHistorical = false;
  let academicYearRecord: {
    id: string;
    startDate: Date;
    endDate: Date | null;
    status: string;
  } | null = null;

  if (academicYearId) {
    academicYearRecord = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    isHistorical = academicYearRecord?.status === "CLOSED";
  } else {
    academicYearRecord = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
    });
    academicYearId = academicYearRecord?.id;
  }

  const buildClassHistorySome = (extra: Record<string, unknown> = {}) => {
    const classFilter: Record<string, unknown> = {};
    if (filters?.gradeId) classFilter.gradeId = filters.gradeId;
    if (academicYearId) classFilter.academicYearId = academicYearId;

    const base: Record<string, unknown> = { ...extra };
    if (Object.keys(classFilter).length > 0) {
      base.class = classFilter;
    }
    if (!isHistorical && !Object.prototype.hasOwnProperty.call(extra, "endDate")) {
      base.endDate = null;
    }
    return base;
  };

  if (filters?.classStatus) {
    where.classStatus = filters.classStatus;
  } else if (filters?.excludeGraduated !== false) {
    where.classStatus = { not: ClassStatus.graduated };
  }

  // If user is a TEACHER, only show students from their assigned classes
  if (filters?.userRole === "TEACHER" && filters?.userId) {
    const teacherClasses = await prisma.class.findMany({
      where: { headTeacherId: filters.userId },
      select: { id: true },
    });
    const classIds = teacherClasses.map((c: { id: string }) => c.id);

    if (classIds.length === 0) {
      return {
        students: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    where.classHistory = {
      some: buildClassHistorySome({ classId: { in: classIds } }),
    };
  } else if (filters?.classId) {
    if (filters?.userRole === "TEACHER" && filters?.userId) {
      const classRecord = await prisma.class.findUnique({
        where: { id: filters.classId },
      });
      if (!classRecord || classRecord.headTeacherId !== filters.userId) {
        throw new NotFoundError("Class not found");
      }
    }
    where.classHistory = {
      some: buildClassHistorySome({ classId: filters.classId }),
    };
  } else if (filters?.gradeId || academicYearId) {
    where.classHistory = { some: buildClassHistorySome() };
  }

  if (filters?.paymentStatus) {
    if (filters.month) {
      const year = filters.year || new Date().getFullYear();

      const paymentMatch: Record<string, unknown> = {
        month: filters.month,
        year: year,
        status: PaymentStatus.confirmed,
      };
      if (academicYearId) {
        paymentMatch.academicYearId = academicYearId;
      }

      if (filters.paymentStatus === PaymentStatus.confirmed) {
        where.payments = { some: paymentMatch };
      } else {
        where.NOT = { payments: { some: paymentMatch } };
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

  const classHistoryIncludeWhere =
    isHistorical && academicYearId
      ? { class: { academicYearId } }
      : { endDate: null };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        classHistory: {
          where: classHistoryIncludeWhere,
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
                ],
                ...(academicYearId ? { academicYearId } : {}),
              }
            : {
                month: filters.month,
                year: filters.year || new Date().getFullYear(),
                ...(academicYearId ? { academicYearId } : {}),
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

export const getGraduates = async (filters?: {
  academicYearId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 40;
  const skip = (page - 1) * limit;

  const where: any = {
    classStatus: ClassStatus.graduated,
  };

  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.academicYearId) {
    where.classHistory = {
      some: {
        promotionStatus: "GRADUATED",
        class: { academicYearId: filters.academicYearId },
      },
    };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        classHistory: {
          where: { promotionStatus: "GRADUATED" },
          include: {
            class: { include: { academicYear: true, grade: true } },
          },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
