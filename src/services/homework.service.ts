import { HomeworkStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

interface CreateHomeworkData {
  studentId: string;
  classId: string;
  subjectId: string;
  title: string;
  description?: string;
  date: Date;
  status: HomeworkStatus;
  notes?: string;
}

export const markHomework = async (
  data: CreateHomeworkData,
  userId?: string,
  userRole?: string,
) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: data.classId },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === "TEACHER" && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Class not found");
    }
  }

  // Check if student is assigned to this class
  const studentClass = await prisma.studentClass.findFirst({
    where: {
      studentId: data.studentId,
      classId: data.classId,
      endDate: null, // Active assignment
    },
  });

  if (!studentClass) {
    throw new BadRequestError("Student is not assigned to this class");
  }

  // Normalize date to UTC start of day
  const homeworkDate = new Date(data.date);
  homeworkDate.setUTCHours(0, 0, 0, 0);

  // Check if homework already exists for this student, subject, and date
  const existing = await prisma.homework.findUnique({
    where: {
      studentId_subjectId_date: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        date: homeworkDate,
      },
    },
  });

  if (existing) {
    // Update existing homework
    const updated = await prisma.homework.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        date: homeworkDate,
        status: data.status,
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
          },
        },
      },
    });

    return updated;
  }

  // Create new homework record
  const homework = await prisma.homework.create({
    data: {
      studentId: data.studentId,
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      date: homeworkDate,
      status: data.status,
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
        },
      },
    },
  });

  return homework;
};

export const markBulkHomework = async (
  classId: string,
  subjectId: string,
  title: string,
  description: string | undefined,
  date: Date,
  homeworkData: Array<{
    studentId: string;
    status: HomeworkStatus;
    notes?: string;
  }>,
  userId?: string,
  userRole?: string,
) => {
  // Verify class exists and check permissions
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      studentClasses: {
        where: { endDate: null },
        select: { studentId: true },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === "TEACHER" && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Class not found");
    }
  }

  const homeworkDate = new Date(date);
  homeworkDate.setUTCHours(0, 0, 0, 0);

  // Get set of allowed student IDs for this class
  const allowedStudentIds = new Set(
    classRecord.studentClasses.map((sc) => sc.studentId),
  );

  // Process all homework records in parallel to improve performance
  const results = await Promise.all(
    homeworkData.map(async (item) => {
      try {
        // Check if student belongs to class
        if (!allowedStudentIds.has(item.studentId)) {
          return {
            success: false,
            studentId: item.studentId,
            error: "Student is not assigned to this class",
          };
        }

        // Perform upsert (update if exists, else create)
        const homework = await prisma.homework.upsert({
          where: {
            studentId_subjectId_date: {
              studentId: item.studentId,
              subjectId: subjectId,
              date: homeworkDate,
            },
          },
          update: {
            title: title,
            description: description,
            status: item.status,
            notes: item.notes,
            classId: classId, // Ensure classId is correct
          },
          create: {
            studentId: item.studentId,
            classId: classId,
            subjectId: subjectId,
            title: title,
            description: description,
            date: homeworkDate,
            status: item.status,
            notes: item.notes,
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
              },
            },
          },
        });

        return { success: true, data: homework };
      } catch (error: any) {
        return {
          success: false,
          studentId: item.studentId,
          error: error.message,
        };
      }
    }),
  );

  return results;
};

export const getHomework = async (filters?: {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: HomeworkStatus;
  page?: number;
  limit?: number;
  userId?: string;
  userRole?: string;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 40;
  const skip = (page - 1) * limit;

  const where: any = {};

  // If user is a TEACHER, only show homework for their assigned classes
  if (filters?.userRole === "TEACHER" && filters?.userId) {
    const teacherClasses = await prisma.class.findMany({
      where: { headTeacherId: filters.userId },
      select: { id: true },
    });
    const classIds = teacherClasses.map((c: { id: string }) => c.id);
    where.classId = { in: classIds };
  }

  if (filters?.studentId) {
    where.studentId = filters.studentId;
  }

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
    where.classId = filters.classId;
  }

  if (filters?.subjectId) {
    where.subjectId = filters.subjectId;
  }

  if (filters?.dueDate) {
    const date = new Date(filters.dueDate);
    date.setUTCHours(0, 0, 0, 0);
    where.date = date;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const [homework, total] = await Promise.all([
    prisma.homework.findMany({
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
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        date: "desc",
      },
    }),
    prisma.homework.count({ where }),
  ]);

  return {
    homework,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getHomeworkById = async (
  id: string,
  userId?: string,
  userRole?: string,
) => {
  const homework = await prisma.homework.findUnique({
    where: { id },
    include: {
      student: true,
      class: true,
      subject: true,
    },
  });

  if (!homework) {
    throw new NotFoundError("Homework record not found");
  }

  // If user is a TEACHER, check if they are the head teacher of the class
  if (userRole === "TEACHER" && userId) {
    if (homework.class.headTeacherId !== userId) {
      throw new NotFoundError("Homework record not found");
    }
  }

  return homework;
};

export const getClassHomeworkForDate = async (
  classId: string,
  date: Date,
  subjectId?: string,
  userId?: string,
  userRole?: string,
) => {
  if (isNaN(date.getTime())) {
    console.error("Invalid date provided:", date);
    throw new Error(`Invalid date: ${date}`);
  }

  const homeworkDate = new Date(date);
  homeworkDate.setUTCHours(0, 0, 0, 0);

  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      studentClasses: {
        where: {
          startDate: { lte: homeworkDate },
          OR: [{ endDate: null }, { endDate: { gte: homeworkDate } }],
        },
        include: {
          student: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === "TEACHER" && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Class not found");
    }
  }

  // Get all homework records for this class and date (and subject if provided)
  const homeworkWhere: any = {
    classId,
    date: homeworkDate,
  };
  if (subjectId) {
    homeworkWhere.subjectId = subjectId;
  }

  const homeworkRecords = await prisma.homework.findMany({
    where: homeworkWhere,
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
        },
      },
    },
  });

  // Create a map of studentId -> homework[] (filtered by subject if provided)
  const homeworkMap = new Map<string, any[]>();
  homeworkRecords.forEach((record) => {
    const existing = homeworkMap.get(record.studentId) || [];
    existing.push(record);
    homeworkMap.set(record.studentId, existing);
  });

  // Combine with all students in the class
  const result = classRecord.studentClasses.map(
    (sc: { student: unknown; studentId: string }) => ({
      student: sc.student,
      homework: homeworkMap.get(sc.studentId) || [],
    }),
  );

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    date: homeworkDate,
    students: result,
  };
};

export const updateHomework = async (
  id: string,
  data: {
    status?: HomeworkStatus;
    notes?: string;
    title?: string;
    description?: string;
  },
  userId?: string,
  userRole?: string,
) => {
  const homework = await prisma.homework.findUnique({
    where: { id },
    include: {
      class: true,
    },
  });

  if (!homework) {
    throw new NotFoundError("Homework record not found");
  }

  // If user is a TEACHER, check if they are the head teacher of the class
  if (userRole === "TEACHER" && userId) {
    if (homework.class.headTeacherId !== userId) {
      throw new NotFoundError("Homework record not found");
    }
  }

  const updated = await prisma.homework.update({
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
        },
      },
    },
  });

  return updated;
};

export const deleteHomework = async (id: string) => {
  const homework = await prisma.homework.findUnique({
    where: { id },
  });

  if (!homework) {
    throw new NotFoundError("Homework record not found");
  }

  await prisma.homework.delete({
    where: { id },
  });

  return { message: "Homework record deleted successfully" };
};

export const getClassHomeworkDates = async (
  classId: string,
  userId?: string,
  userRole?: string,
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === "TEACHER" && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Class not found");
    }
  }

  // Optimize: Use groupBy to get unique dates directly from the database
  const groups = await prisma.homework.groupBy({
    by: ["date"],
    where: {
      classId,
    },
    orderBy: {
      date: "desc",
    },
  });

  // Extract dates and format as YYYY-MM-DD using UTC values
  const uniqueDates = groups.map((g: { date: Date }) => {
    return g.date.toISOString().split("T")[0];
  });

  return uniqueDates;
};

export const getClassHomeworkSummary = async (
  classId: string,
  userId?: string,
  userRole?: string,
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      studentClasses: {
        select: {
          studentId: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === "TEACHER" && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError("Class not found");
    }
  }

  // Get all homework records for this class
  const homeworkRecords = await prisma.homework.findMany({
    where: {
      classId,
    },
    select: {
      date: true,
      status: true,
    },
  });

  // Group by date and calculate statistics
  const dateMap = new Map<string, { done: number; not_done: number }>();

  homeworkRecords.forEach((record) => {
    const date = new Date(record.date);
    // Use ISO date string (YYYY-MM-DD) for grouping to avoid TZ issues
    const dateStr = date.toISOString().split("T")[0];

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { done: 0, not_done: 0 });
    }

    const stats = dateMap.get(dateStr)!;
    if (record.status === "done") stats.done++;
    else if (record.status === "not_done") stats.not_done++;
  });

  // Convert to array and format
  const summary = Array.from(dateMap.entries())
    .map(([date, stats]) => {
      // Create a UTC-normalized date for comparison
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);

      // Calculate how many students were assigned to the class on THIS specific date
      const historicalTotal = classRecord.studentClasses.filter((sc) => {
        const start = new Date(sc.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = sc.endDate ? new Date(sc.endDate) : null;
        if (end) end.setUTCHours(0, 0, 0, 0);

        return start <= targetDate && (!end || end >= targetDate);
      }).length;

      return {
        date,
        done: stats.done,
        not_done: stats.not_done,
        total: historicalTotal || stats.done + stats.not_done,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return summary;
};
