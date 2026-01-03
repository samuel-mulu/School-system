interface CreateClassData {
    name: string;
    description?: string;
    academicYear?: string;
    academicYearId?: string;
    gradeId?: string;
    headTeacherId?: string;
}
interface UpdateClassData extends Partial<CreateClassData> {
}
export declare const createClass: (data: CreateClassData) => Promise<any>;
export declare const getClasses: (filters?: {
    search?: string;
    page?: number;
    limit?: number;
    userId?: string;
    userRole?: string;
}) => Promise<{
    classes: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        totalPages: number;
    };
}>;
export declare const getClassById: (id: string, userId?: string, userRole?: string) => Promise<any>;
export declare const updateClass: (id: string, data: UpdateClassData) => Promise<any>;
export declare const deleteClass: (id: string) => Promise<{
    message: string;
}>;
export declare const createSubject: (classId: string, data: {
    name: string;
    code?: string;
    description?: string;
}, userId?: string, userRole?: string) => Promise<any>;
export declare const getSubjectsByClass: (classId: string, userId?: string, userRole?: string) => Promise<any>;
export declare const updateSubject: (subjectId: string, data: {
    name?: string;
    code?: string;
    description?: string;
}, userId?: string, userRole?: string) => Promise<any>;
export declare const deleteSubject: (subjectId: string, userId?: string, userRole?: string) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=class.service.d.ts.map