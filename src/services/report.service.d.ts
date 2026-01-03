export declare const getStudentReport: (studentId: string) => Promise<{
    student: {
        id: any;
        firstName: any;
        lastName: any;
        classStatus: any;
        paymentStatus: any;
    };
    classHistory: any;
    attendanceSummary: {
        total: any;
        present: any;
        absent: any;
        late: any;
        attendanceRate: number;
    };
    marksByTerm: any;
    termAverages: {
        term: string;
        average: number;
        subjectCount: any;
    }[];
    paymentSummary: {
        total: any;
        confirmed: any;
        pending: any;
        totalAmount: any;
        paidAmount: any;
    };
    recentAttendance: any;
    recentMarks: any;
    recentPayments: any;
}>;
export declare const getPaymentHistory: (studentId: string) => Promise<{
    student: {
        id: any;
        firstName: any;
        lastName: any;
    };
    payments: any;
    summary: {
        total: any;
        confirmed: any;
        pending: any;
        totalAmount: any;
        paidAmount: any;
        outstandingAmount: any;
    };
}>;
export declare const getClassReport: (classId: string, term?: string) => Promise<{
    class: {
        id: any;
        name: any;
    };
    term: string;
    studentCount: any;
    attendanceSummary: {
        totalRecords: any;
        averageAttendanceRate: number;
    };
    academicSummary: {
        totalMarks: any;
        averageScore: number;
    };
    attendanceByStudent: any;
    marksByStudent: any;
}>;
//# sourceMappingURL=report.service.d.ts.map