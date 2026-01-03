interface CreateSubExamData {
    subjectId: string;
    termId: string;
    name: string;
    maxScore: number;
    weightPercent: number;
    examType: string;
}
interface UpdateSubExamData {
    name?: string;
    maxScore?: number;
    weightPercent?: number;
    examType?: string;
}
export declare const createSubExam: (data: CreateSubExamData) => Promise<any>;
export declare const getSubExamsBySubjectAndTerm: (subjectId: string, termId: string) => Promise<any>;
export declare const updateSubExam: (id: string, data: UpdateSubExamData) => Promise<any>;
export declare const deleteSubExam: (id: string) => Promise<{
    message: string;
}>;
export declare const validateWeights: (subjectId: string, termId: string) => Promise<{
    isValid: boolean;
    subExamTotal: number;
    generalTestTotal: number;
    total: number;
}>;
export {};
//# sourceMappingURL=subexam.service.d.ts.map