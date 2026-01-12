import { prisma } from "../config/db.js";
import { NotFoundError } from "../utils/errors.js";

export const getStudentReport = async (studentId: string) => {
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
    present: student.attendance.filter((a: { status: string }) => a.status === 'present').length,
    absent: student.attendance.filter((a: { status: string }) => a.status === 'absent').length,
    late: student.attendance.filter((a: { status: string }) => a.status === 'late').length,
    attendanceRate:
      student.attendance.length > 0
        ? (student.attendance.filter((a: { status: string }) => a.status === 'present').length /
            student.attendance.length) *
          100
        : 0,
  };

  // Group marks by term
  const marksByTerm = student.marks.reduce((acc: Record<string, unknown[]>, mark: any) => {
    const term = mark.term?.id || mark.term || 'unknown';
    if (!acc[term]) {
      acc[term] = [];
    }
    acc[term].push(mark);
    return acc;
  }, {} as Record<string, unknown[]>);

  // Calculate average per term
  const termAverages = Object.entries(marksByTerm).map(([term, marks]) => {
    const typedMarks = (marks as any[]).filter((m: any) => m.score !== undefined && m.maxScore !== undefined) as Array<{ score: number; maxScore: number }>;
    const average =
      typedMarks.length > 0
        ? typedMarks.reduce((sum: number, m: { score: number; maxScore: number }) => sum + (m.score / m.maxScore) * 100, 0) / typedMarks.length
        : 0;
    return { term, average, subjectCount: typedMarks.length };
  });

  // Payment summary
  const paymentSummary = {
    total: student.payments.length,
    confirmed: student.payments.filter((p: { status: string }) => p.status === 'confirmed').length,
    pending: student.payments.filter((p: { status: string }) => p.status === 'pending').length,
    totalAmount: student.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
    paidAmount: student.payments
      .filter((p: { status: string }) => p.status === 'confirmed')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
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

export const getPaymentHistory = async (studentId: string) => {
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
    confirmed: payments.filter((p: { status: string }) => p.status === 'confirmed').length,
    pending: payments.filter((p: { status: string }) => p.status === 'pending').length,
    totalAmount: payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
    paidAmount: payments
      .filter((p: { status: string }) => p.status === 'confirmed')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
    outstandingAmount: payments
      .filter((p: { status: string }) => p.status === 'pending')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
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

export const getClassReport = async (classId: string, term?: string) => {
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
  const studentIds = classRecord.studentClasses.map((sc: { studentId: string }) => sc.studentId);

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
  const marksWhere: any = {
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
  const attendanceByStudent = studentIds.map((studentId: string) => {
    const studentAttendance = attendance.filter((a: { studentId: string }) => a.studentId === studentId);
    return {
      studentId,
      total: studentAttendance.length,
      present: studentAttendance.filter((a: { status: string }) => a.status === 'present').length,
      absent: studentAttendance.filter((a: { status: string }) => a.status === 'absent').length,
      late: studentAttendance.filter((a: { status: string }) => a.status === 'late').length,
      attendanceRate:
        studentAttendance.length > 0
          ? (studentAttendance.filter((a: { status: string }) => a.status === 'present').length /
              studentAttendance.length) *
            100
          : 0,
    };
  });

  // Calculate marks per student
  const marksByStudent = studentIds.map((studentId: string) => {
    const studentMarks = marks.filter((m: { studentId: string }) => m.studentId === studentId);
    const average =
      studentMarks.length > 0
        ? studentMarks.reduce((sum: number, m: { score: number; maxScore: number }) => sum + (m.score / m.maxScore) * 100, 0) /
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
      averageAttendanceRate:
        attendanceByStudent.length > 0
          ? attendanceByStudent.reduce((sum: number, a: { attendanceRate: number }) => sum + a.attendanceRate, 0) /
            attendanceByStudent.length
          : 0,
    },
    academicSummary: {
      totalMarks: marks.length,
      averageScore:
        marksByStudent.length > 0
          ? marksByStudent.reduce((sum: number, m: { average: number }) => sum + m.average, 0) / marksByStudent.length
          : 0,
    },
    attendanceByStudent,
    marksByStudent,
  };
};

export const getPaymentReports = async (params: {
  academicYearId?: string;
  paymentTypeId?: string;
  month?: string; // YYYY-MM format
  registrarId?: string; // User ID of registrar who processed payment
}) => {
  const { academicYearId, paymentTypeId, month, registrarId } = params;

  // Build where clause for payments
  const whereClause: any = {
    status: 'confirmed', // Only confirmed payments for revenue
  };

  // Filter by payment type if provided
  if (paymentTypeId) {
    whereClause.paymentTypeId = paymentTypeId;
  }

  // Filter by month if provided
  if (month) {
    whereClause.month = month;
  }

  // Filter by registrar if provided (will be implemented when we add processedBy field)
  // For now, we'll skip this filter

  // If academic year is provided, filter by students in classes from that academic year
  if (academicYearId) {
    const classesInYear = await prisma.class.findMany({
      where: { academicYearId },
      select: { id: true },
    });
    const classIds = classesInYear.map(c => c.id);
    
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: { in: classIds },
        endDate: null, // Active students only
      },
      select: { studentId: true },
    });
    const studentIds = [...new Set(studentClasses.map(sc => sc.studentId))];
    
    if (studentIds.length > 0) {
      whereClause.studentId = { in: studentIds };
    } else {
      // No students in this academic year, return empty result
      return {
        summary: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          paymentCount: 0,
          confirmedPaymentCount: 0,
          totalStudents: 0,
          paidStudents: 0,
          paymentProgress: 0,
        },
        byPaymentType: [],
        byMonth: [],
      };
    }
  }

  // Get all confirmed payments
  const confirmedPayments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      paymentType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      paymentDate: 'asc',
    },
  });

  // Calculate summary
  const selectedMonth = month || new Date().toISOString().slice(0, 7);
  const monthlyRevenue = confirmedPayments
    .filter(p => p.month === selectedMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate student payment progress for the selected month
  let totalStudents = 0;
  let paidStudents = 0;
  
  if (academicYearId) {
    // Get all students in the academic year
    const classesInYear = await prisma.class.findMany({
      where: { academicYearId },
      select: { id: true },
    });
    const classIds = classesInYear.map(c => c.id);
    
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: { in: classIds },
        endDate: null, // Active students only
      },
      select: { studentId: true },
    });
    const studentIds = [...new Set(studentClasses.map(sc => sc.studentId))];
    totalStudents = studentIds.length;
    
    // Count students who have paid for the selected month
    if (month) {
      const year = parseInt(month.split('-')[0]);
      const paidStudentIds = new Set(
        confirmedPayments
          .filter(p => p.month === month && p.year === year)
          .map(p => p.studentId)
      );
      paidStudents = paidStudentIds.size;
    } else {
      // If no month filter, count all students with any payment
      const paidStudentIds = new Set(confirmedPayments.map(p => p.studentId));
      paidStudents = paidStudentIds.size;
    }
  }

  const summary = {
    totalRevenue: confirmedPayments.reduce((sum, p) => sum + p.amount, 0),
    monthlyRevenue,
    paymentCount: confirmedPayments.length,
    confirmedPaymentCount: confirmedPayments.length,
    totalStudents,
    paidStudents,
    paymentProgress: totalStudents > 0 ? (paidStudents / totalStudents) * 100 : 0,
  };

  // Group by payment type
  const byPaymentTypeMap = new Map<string, {
    paymentTypeId: string;
    paymentTypeName: string;
    totalAmount: number;
    monthlyBreakdown: Map<string, { amount: number; count: number }>;
  }>();

  confirmedPayments.forEach(payment => {
    const typeId = payment.paymentTypeId || 'unknown';
    const typeName = payment.paymentType?.name || 'Unknown';
    const month = payment.month; // Already in YYYY-MM format

    if (!byPaymentTypeMap.has(typeId)) {
      byPaymentTypeMap.set(typeId, {
        paymentTypeId: typeId,
        paymentTypeName: typeName,
        totalAmount: 0,
        monthlyBreakdown: new Map(),
      });
    }

    const typeData = byPaymentTypeMap.get(typeId)!;
    typeData.totalAmount += payment.amount;

    if (!typeData.monthlyBreakdown.has(month)) {
      typeData.monthlyBreakdown.set(month, { amount: 0, count: 0 });
    }

    const monthData = typeData.monthlyBreakdown.get(month)!;
    monthData.amount += payment.amount;
    monthData.count += 1;
  });

  const byPaymentType = Array.from(byPaymentTypeMap.values()).map(type => ({
    paymentTypeId: type.paymentTypeId,
    paymentTypeName: type.paymentTypeName,
    totalAmount: type.totalAmount,
    monthlyBreakdown: Array.from(type.monthlyBreakdown.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    })),
  }));

  // Group by month
  const byMonthMap = new Map<string, {
    month: string;
    totalAmount: number;
    paymentCount: number;
    breakdown: Map<string, { paymentTypeId: string; paymentTypeName: string; amount: number }>;
  }>();

  confirmedPayments.forEach(payment => {
    const month = payment.month;

    if (!byMonthMap.has(month)) {
      byMonthMap.set(month, {
        month,
        totalAmount: 0,
        paymentCount: 0,
        breakdown: new Map(),
      });
    }

    const monthData = byMonthMap.get(month)!;
    monthData.totalAmount += payment.amount;
    monthData.paymentCount += 1;

    const typeId = payment.paymentTypeId || 'unknown';
    const typeName = payment.paymentType?.name || 'Unknown';
    const breakdownKey = `${typeId}-${typeName}`;

    if (!monthData.breakdown.has(breakdownKey)) {
      monthData.breakdown.set(breakdownKey, {
        paymentTypeId: typeId,
        paymentTypeName: typeName,
        amount: 0,
      });
    }

    const breakdownData = monthData.breakdown.get(breakdownKey)!;
    breakdownData.amount += payment.amount;
  });

  const byMonth = Array.from(byMonthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(month => ({
      month: month.month,
      totalAmount: month.totalAmount,
      paymentCount: month.paymentCount,
      breakdown: Array.from(month.breakdown.values()),
    }));

  return {
    summary,
    byPaymentType,
    byMonth,
  };
};

