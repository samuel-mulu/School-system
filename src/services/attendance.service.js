import { prisma } from '../config/db';
import { AttendanceStatus } from '../generated/prisma/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
export const markAttendance = async (data, userId, userRole) => {
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
export const markBulkAttendance = async (classId, date, attendanceData, userId, userRole) => {
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
        }
        catch (error) {
            results.push({
                success: false,
                studentId: item.studentId,
                error: error.message,
            });
        }
    }
    return results;
};
export const getAttendance = async (filters) => {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    const where = {};
    // If user is a TEACHER, only show attendance for their assigned classes
    if (filters?.userRole === 'TEACHER' && filters?.userId) {
        const teacherClasses = await prisma.class.findMany({
            where: { headTeacherId: filters.userId },
            select: { id: true },
        });
        const classIds = teacherClasses.map((c) => c.id);
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
export const getAttendanceById = async (id, userId, userRole) => {
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
export const getClassAttendanceForDate = async (classId, date, userId, userRole) => {
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
    const attendanceMap = new Map(attendanceRecords.map((record) => [record.studentId, record]));
    // Combine with all students in the class
    const result = classRecord.studentClasses.map((sc) => ({
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
export const updateAttendance = async (id, data, userId, userRole) => {
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
export const deleteAttendance = async (id) => {
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
export const getClassAttendanceDates = async (classId, userId, userRole) => {
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
    // Get distinct dates for this class, ordered by date descending
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            classId,
        },
        select: {
            date: true,
        },
        distinct: ['date'],
        orderBy: {
            date: 'desc',
        },
    });
    // Extract unique dates and format them
    const dates = attendanceRecords.map((record) => {
        const date = new Date(record.date);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
    });
    // Remove duplicates (in case of any timezone issues)
    const uniqueDates = Array.from(new Set(dates));
    return uniqueDates;
};
//# sourceMappingURL=attendance.service.js.map