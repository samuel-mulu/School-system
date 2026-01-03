interface CreateMarkData {
    studentId: string;
    classId: string;
    subjectId: string;
    termId: string;
    subExamId: string;
    score: number;
    notes?: string;
}
export declare const createMark: (data: CreateMarkData, userId?: string, userRole?: string) => Promise<any>;
export declare const recordMark: (studentId: string, subExamId: string, score: number, notes?: string, userId?: string, userRole?: string) => Promise<any>;
export declare const recordBulkMarks: (subExamId: string, marksData: Array<{
    studentId: string;
    score: number;
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
export declare const getMarks: (filters?: {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    termId?: string;
    subExamId?: string;
    page?: number;
    limit?: number;
}) => Promise<{
    marks: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        totalPages: number;
    };
}>;
export declare const getMarkById: (id: string, userId?: string, userRole?: string) => Promise<any>;
export declare const getStudentMarksByTerm: (studentId: string, termId: string) => Promise<{
    student: {
        id: any;
        firstName: any;
        lastName: any;
    };
    term: {
        id: any;
        name: any;
    };
    marksBySubject: unknown[];
    allMarks: any;
    summary: {
        totalSubjects: number;
        totalMarks: any;
    };
}>;
export declare const getClassMarksByTerm: (classId: string, termId: string, subjectId?: string, userId?: string, userRole?: string) => Promise<{
    class: {
        id: any;
        name: any;
    };
    term: {
        id: any;
        name: any;
    };
    marks: any;
}>;
export declare const updateMark: (id: string, data: {
    score?: number;
    grade?: string;
    notes?: string;
}, userId?: string, userRole?: string) => Promise<any>;
export declare const deleteMark: (id: string, userId?: string, userRole?: string) => Promise<{
    message: string;
}>;
export declare const calculateTermScore: (studentId: string, subjectId: string, termId: string) => Promise<any>;
export declare const calculateYearScore: (studentId: string, subjectId: string) => Promise<any>;
export declare const getTermReport: (studentId: string, termId: string) => Promise<{
    student: {
        id: any;
        firstName: any;
        lastName: any;
    };
    term: {
        id: any;
        name: any;
    };
    subjects: any;
    overallAverage: number;
    overallGrade: any;
}>;
export {};
//# sourceMappingURL=marks.service.d.ts.map