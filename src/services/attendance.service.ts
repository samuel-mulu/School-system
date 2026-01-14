import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

interface CreateAttendanceData {
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  notes?: string;
}

export const markAttendance = async (
  data: CreateAttendanceData,
  userId?: string,
  userRole?: string
) => {
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

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
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
    throw new BadRequestError('Student is not assigned to this class');
  }

  // Normalize date to start of day for comparison
  const attendanceDate = new Date(data.date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check if attendance already exists for this student on this date
  const existing = await prisma.attendance.findUnique({
    where: {
      studentId_date: {
        studentId: data.studentId,
        date: attendanceDate,
      },
    },
  });

  if (existing) {
    // Update existing attendance
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
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
      },
    });

    return updated;
  }

  // Create new attendance record
  const attendance = await prisma.attendance.create({
    data: {
      studentId: data.studentId,
      classId: data.classId,
      date: attendanceDate,
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
    },
  });

  return attendance;
};

export const markBulkAttendance = async (
  classId: string,
  date: Date,
  attendanceData: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>,
  userId?: string,
  userRole?: string
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  const results = [];

  for (const item of attendanceData) {
    try {
      const attendance = await markAttendance({
        studentId: item.studentId,
        classId,
        date: attendanceDate,
        status: item.status,
        notes: item.notes,
      }, userId, userRole);
      results.push({ success: true, data: attendance });
    } catch (error: any) {
      results.push({
        success: false,
        studentId: item.studentId,
        error: error.message,
      });
    }
  }

  return results;
};

export const getAttendance = async (filters?: {
  studentId?: string;
  classId?: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
  userId?: string;
  userRole?: string;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 40;
  const skip = (page - 1) * limit;

  const where: any = {};

  // If user is a TEACHER, only show attendance for their assigned classes
  if (filters?.userRole === 'TEACHER' && filters?.userId) {
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
    if (filters?.userRole === 'TEACHER' && filters?.userId) {
      const classRecord = await prisma.class.findUnique({
        where: { id: filters.classId },
      });
      if (!classRecord || classRecord.headTeacherId !== filters.userId) {
        throw new NotFoundError('Class not found');
      }
    }
    where.classId = filters.classId;
  }

  if (filters?.date) {
    const date = new Date(filters.date);
    date.setHours(0, 0, 0, 0);
    where.date = date;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const [attendance, total] = await Promise.all([
    prisma.attendance.findMany({
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
      },
      skip,
      take: limit,
      orderBy: {
        date: 'desc',
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    attendance,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAttendanceById = async (
  id: string,
  userId?: string,
  userRole?: string
) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      student: true,
      class: true,
    },
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  // If user is a TEACHER, check if they are the head teacher of the class
  if (userRole === 'TEACHER' && userId) {
    if (attendance.class.headTeacherId !== userId) {
      throw new NotFoundError('Attendance record not found');
    }
  }

  return attendance;
};

export const getClassAttendanceForDate = async (
  classId: string,
  date: Date,
  userId?: string,
  userRole?: string
) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      studentClasses: {
        where: {
          endDate: null, // Active students
        },
        include: {
          student: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Get all attendance records for this class and date
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      classId,
      date: attendanceDate,
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
  });

  // Create a map of studentId -> attendance
  const attendanceMap = new Map(
    attendanceRecords.map((record: { studentId: string }) => [record.studentId, record])
  );

  // Combine with all students in the class
  const result = classRecord.studentClasses.map((sc: { student: unknown; studentId: string }) => ({
    student: sc.student,
    attendance: attendanceMap.get(sc.studentId) || null,
  }));

  return {
    class: {
      id: classRecord.id,
      name: classRecord.name,
    },
    date: attendanceDate,
    students: result,
  };
};

export const updateAttendance = async (
  id: string,
  data: { status?: AttendanceStatus; notes?: string },
  userId?: string,
  userRole?: string
) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      class: true,
    },
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  // If user is a TEACHER, check if they are the head teacher of the class
  if (userRole === 'TEACHER' && userId) {
    if (attendance.class.headTeacherId !== userId) {
      throw new NotFoundError('Attendance record not found');
    }
  }

  const updated = await prisma.attendance.update({
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
    },
  });

  return updated;
};

export const deleteAttendance = async (id: string) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  await prisma.attendance.delete({
    where: { id },
  });

  return { message: 'Attendance record deleted successfully' };
};

export const getClassAttendanceDates = async (
  classId: string,
  userId?: string,
  userRole?: string
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  // Get all attendance records for this class to extract unique dates
  // Fetch ALL records without any limit to ensure we get all dates
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      classId,
    },
    select: {
      date: true,
    },
    orderBy: {
      date: 'desc',
    },
    // No limit - get all records to ensure all dates are included
  });

  // Extract unique dates and format them as YYYY-MM-DD
  const dateSet = new Set<string>();
  attendanceRecords.forEach((record: { date: Date | string }) => {
    const date = new Date(record.date);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    dateSet.add(dateStr);
  });

  // Convert set to array and sort descending (newest first)
  const uniqueDates = Array.from(dateSet).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return uniqueDates;
};

export const getClassAttendanceSummary = async (
  classId: string,
  userId?: string,
  userRole?: string
) => {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      studentClasses: {
        where: {
          endDate: null, // Active students
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found');
  }

  // If user is a TEACHER, check if they are the head teacher
  if (userRole === 'TEACHER' && userId) {
    if (classRecord.headTeacherId !== userId) {
      throw new NotFoundError('Class not found');
    }
  }

  // Get all attendance records for this class
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      classId,
    },
    select: {
      date: true,
      status: true,
    },
  });

  // Get total number of students in the class
  const totalStudents = classRecord.studentClasses.length;

  // Group by date and calculate statistics
  const dateMap = new Map<string, { present: number; absent: number; late: number }>();

  attendanceRecords.forEach((record) => {
    const date = new Date(record.date);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { present: 0, absent: 0, late: 0 });
    }

    const stats = dateMap.get(dateStr)!;
    if (record.status === 'present') stats.present++;
    else if (record.status === 'absent') stats.absent++;
    else if (record.status === 'late') stats.late++;
  });

  // Convert to array and format
  const summary = Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      date,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      total: totalStudents,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return summary;
};
