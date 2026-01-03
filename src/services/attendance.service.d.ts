import { AttendanceStatus } from '../generated/prisma/enums';
interface CreateAttendanceData {
    studentId: string;
    classId: string;
    date: Date;
    status: AttendanceStatus;
    notes?: string;
}
export declare const markAttendance: (data: CreateAttendanceData, userId?: string, userRole?: string) => Promise<any>;
export declare const markBulkAttendance: (classId: string, date: Date, attendanceData: Array<{
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
}>, userId?: string, userRole?: string) => Promise<({
    success: boolean;
    data: any;
    studentId?: never;
    error?: never;
} | {
    success: boolean;
    studentId: string;
    error: any;
    data?: never;
})[]>;
export declare const getAttendance: (filters?: {
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
}) => Promise<{
    attendance: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        totalPages: number;
    };
}>;
export declare const getAttendanceById: (id: string, userId?: string, userRole?: string) => Promise<any>;
export declare const getClassAttendanceForDate: (classId: string, date: Date, userId?: string, userRole?: string) => Promise<{
    class: {
        id: any;
        name: any;
    };
    date: Date;
    students: any;
}>;
export declare const updateAttendance: (id: string, data: {
    status?: AttendanceStatus;
    notes?: string;
}, userId?: string, userRole?: string) => Promise<any>;
export declare const deleteAttendance: (id: string) => Promise<{
    message: string;
}>;
export declare const getClassAttendanceDates: (classId: string, userId?: string, userRole?: string) => Promise<unknown[]>;
export {};
//# sourceMappingURL=attendance.service.d.ts.map