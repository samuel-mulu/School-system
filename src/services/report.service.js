import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';
export const getStudentReport = async (studentId) => {
    const student = await prisma.student.findUnique({
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
            attendance: {
                take: 100,
                orderBy: {
                    date: 'desc',
                },
                include: {
                    class: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
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
            payments: {
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    receipt: true,
                },
            },
        },
    });
    if (!student) {
        throw new NotFoundError('Student not found');
    }
    // Calculate attendance summary
    const attendanceSummary = {
        total: student.attendance.length,
        present: student.attendance.filter((a) => a.status === 'present').length,
        absent: student.attendance.filter((a) => a.status === 'absent').length,
        late: student.attendance.filter((a) => a.status === 'late').length,
        attendanceRate: student.attendance.length > 0
            ? (student.attendance.filter((a) => a.status === 'present').length /
                student.attendance.length) *
                100
            : 0,
    };
    // Group marks by term
    const marksByTerm = student.marks.reduce((acc, mark) => {
        if (!acc[mark.term]) {
            acc[mark.term] = [];
        }
        acc[mark.term].push(mark);
        return acc;
    }, {});
    // Calculate average per term
    const termAverages = Object.entries(marksByTerm).map(([term, marks]) => {
        const average = marks.length > 0
            ? marks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0) / marks.length
            : 0;
        return { term, average, subjectCount: marks.length };
    });
    // Payment summary
    const paymentSummary = {
        total: student.payments.length,
        confirmed: student.payments.filter((p) => p.status === 'confirmed').length,
        pending: student.payments.filter((p) => p.status === 'pending').length,
        totalAmount: student.payments.reduce((sum, p) => sum + p.amount, 0),
        paidAmount: student.payments
            .filter((p) => p.status === 'confirmed')
            .reduce((sum, p) => sum + p.amount, 0),
    };
    return {
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            classStatus: student.classStatus,
            paymentStatus: student.paymentStatus,
        },
        classHistory: student.classHistory,
        attendanceSummary,
        marksByTerm,
        termAverages,
        paymentSummary,
        recentAttendance: student.attendance.slice(0, 30),
        recentMarks: student.marks.slice(0, 20),
        recentPayments: student.payments.slice(0, 12),
    };
};
export const getPaymentHistory = async (studentId) => {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
    });
    if (!student) {
        throw new NotFoundError('Student not found');
    }
    const payments = await prisma.payment.findMany({
        where: { studentId },
        include: {
            receipt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    const summary = {
        total: payments.length,
        confirmed: payments.filter((p) => p.status === 'confirmed').length,
        pending: payments.filter((p) => p.status === 'pending').length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        paidAmount: payments
            .filter((p) => p.status === 'confirmed')
            .reduce((sum, p) => sum + p.amount, 0),
        outstandingAmount: payments
            .filter((p) => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0),
    };
    return {
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
        },
        payments,
        summary,
    };
};
export const getClassReport = async (classId, term) => {
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
    // Get attendance for all students in class
    const studentIds = classRecord.studentClasses.map((sc) => sc.studentId);
    const attendance = await prisma.attendance.findMany({
        where: {
            classId,
            studentId: { in: studentIds },
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
    // Get marks for all students in class
    const marksWhere = {
        classId,
        studentId: { in: studentIds },
    };
    if (term) {
        marksWhere.term = term;
    }
    const marks = await prisma.mark.findMany({
        where: marksWhere,
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
    });
    // Calculate attendance per student
    const attendanceByStudent = studentIds.map((studentId) => {
        const studentAttendance = attendance.filter((a) => a.studentId === studentId);
        return {
            studentId,
            total: studentAttendance.length,
            present: studentAttendance.filter((a) => a.status === 'present').length,
            absent: studentAttendance.filter((a) => a.status === 'absent').length,
            late: studentAttendance.filter((a) => a.status === 'late').length,
            attendanceRate: studentAttendance.length > 0
                ? (studentAttendance.filter((a) => a.status === 'present').length /
                    studentAttendance.length) *
                    100
                : 0,
        };
    });
    // Calculate marks per student
    const marksByStudent = studentIds.map((studentId) => {
        const studentMarks = marks.filter((m) => m.studentId === studentId);
        const average = studentMarks.length > 0
            ? studentMarks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0) /
                studentMarks.length
            : 0;
        return {
            studentId,
            markCount: studentMarks.length,
            average,
            marks: studentMarks,
        };
    });
    return {
        class: {
            id: classRecord.id,
            name: classRecord.name,
        },
        term: term || 'all',
        studentCount: classRecord.studentClasses.length,
        attendanceSummary: {
            totalRecords: attendance.length,
            averageAttendanceRate: attendanceByStudent.length > 0
                ? attendanceByStudent.reduce((sum, a) => sum + a.attendanceRate, 0) /
                    attendanceByStudent.length
                : 0,
        },
        academicSummary: {
            totalMarks: marks.length,
            averageScore: marksByStudent.length > 0
                ? marksByStudent.reduce((sum, m) => sum + m.average, 0) / marksByStudent.length
                : 0,
        },
        attendanceByStudent,
        marksByStudent,
    };
};
//# sourceMappingURL=report.service.js.map