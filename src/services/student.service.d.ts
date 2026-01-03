import { ClassStatus, PaymentStatus } from '../generated/prisma/enums';
interface CreateStudentData {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    nationality?: string;
    religion?: string;
    email?: string;
    phone?: string;
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    parentRelation: string;
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelation: string;
    medicalConditions?: string;
    allergies?: string;
    bloodGroup?: string;
    previousSchool?: string;
    previousClass?: string;
    transferReason?: string;
    classId?: string;
    assignClassReason?: string;
}
interface UpdateStudentData extends Partial<CreateStudentData> {
}
export declare const createStudent: (data: CreateStudentData) => Promise<any>;
export declare const getStudents: (filters?: {
    classStatus?: ClassStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    classId?: string;
    page?: number;
    limit?: number;
    userId?: string;
    userRole?: string;
}) => Promise<{
    students: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        totalPages: number;
    };
}>;
export declare const getStudentById: (id: string, userId?: string, userRole?: string) => Promise<any>;
export declare const updateStudent: (id: string, data: UpdateStudentData) => Promise<any>;
export declare const assignStudentToClass: (studentId: string, classId: string, reason?: string) => Promise<any>;
export declare const transferStudent: (studentId: string, newClassId: string, reason?: string) => Promise<any>;
export declare const deleteStudent: (id: string) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=student.service.d.ts.map