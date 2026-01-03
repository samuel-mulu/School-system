import { prisma } from '../config/db';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
export const createClass = async (data) => {
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
    // Verify academic year exists if provided
    if (data.academicYearId) {
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: data.academicYearId },
        });
        if (!academicYear) {
            throw new NotFoundError('Academic year not found');
        }
    }
    // Verify grade exists if provided
    if (data.gradeId) {
        const grade = await prisma.grade.findUnique({
            where: { id: data.gradeId },
        });
        if (!grade) {
            throw new NotFoundError('Grade not found');
        }
    }
    // Prepare data for creation (exclude legacy academicYear string)
    const { academicYear, ...createData } = data;
    const classRecord = await prisma.class.create({
        data: createData,
        include: {
            headTeacher: true,
            academicYear: true,
            grade: true,
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
export const getClasses = async (filters) => {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    const where = {};
    // If user is a TEACHER, only show classes where they are head teacher
    if (filters?.userRole === 'TEACHER' && filters?.userId) {
        where.headTeacherId = filters.userId;
    }
    // OWNER and REGISTRAR can see all classes
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
                academicYear: true,
                grade: true,
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
export const getClassById = async (id, userId, userRole) => {
    const classRecord = await prisma.class.findUnique({
        where: { id },
        include: {
            headTeacher: true,
            academicYear: true,
            grade: true,
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
    // If user is a TEACHER, check if they are the head teacher of this class
    if (userRole === 'TEACHER' && userId) {
        if (classRecord.headTeacherId !== userId) {
            throw new NotFoundError('Class not found'); // Return 404 to hide existence
        }
    }
    // OWNER and REGISTRAR can access any class
    return classRecord;
};
export const updateClass = async (id, data) => {
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
    // Verify academic year exists if provided
    if (data.academicYearId) {
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: data.academicYearId },
        });
        if (!academicYear) {
            throw new NotFoundError('Academic year not found');
        }
    }
    // Verify grade exists if provided
    if (data.gradeId) {
        const grade = await prisma.grade.findUnique({
            where: { id: data.gradeId },
        });
        if (!grade) {
            throw new NotFoundError('Grade not found');
        }
    }
    // Prepare data for update (exclude legacy academicYear string)
    const { academicYear, ...updateData } = data;
    const updated = await prisma.class.update({
        where: { id },
        data: updateData,
        include: {
            headTeacher: true,
            academicYear: true,
            grade: true,
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
export const deleteClass = async (id) => {
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
export const createSubject = async (classId, data, userId, userRole) => {
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
export const getSubjectsByClass = async (classId, userId, userRole) => {
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
    const subjects = await prisma.subject.findMany({
        where: { classId },
        orderBy: {
            name: 'asc',
        },
    });
    return subjects;
};
export const updateSubject = async (subjectId, data, userId, userRole) => {
    const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
            class: true,
        },
    });
    if (!subject) {
        throw new NotFoundError('Subject not found');
    }
    // If user is a TEACHER, check if they are the head teacher of the class
    if (userRole === 'TEACHER' && userId) {
        if (subject.class.headTeacherId !== userId) {
            throw new NotFoundError('Subject not found');
        }
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
export const deleteSubject = async (subjectId, userId, userRole) => {
    const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
            marks: {
                take: 1,
            },
            class: true,
        },
    });
    if (!subject) {
        throw new NotFoundError('Subject not found');
    }
    // If user is a TEACHER, check if they are the head teacher of the class
    if (userRole === 'TEACHER' && userId) {
        if (subject.class.headTeacherId !== userId) {
            throw new NotFoundError('Subject not found');
        }
    }
    if (subject.marks.length > 0) {
        throw new BadRequestError('Cannot delete subject with existing marks');
    }
    await prisma.subject.delete({
        where: { id: subjectId },
    });
    return { message: 'Subject deleted successfully' };
};
//# sourceMappingURL=class.service.js.map