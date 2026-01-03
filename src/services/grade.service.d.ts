interface CreateGradeData {
    name: string;
    order: number;
    isHighest?: boolean;
}
interface UpdateGradeData extends Partial<CreateGradeData> {
}
export declare const createGrade: (data: CreateGradeData) => Promise<any>;
export declare const getGrades: () => Promise<any>;
export declare const getGradeById: (id: string) => Promise<any>;
export declare const updateGrade: (id: string, data: UpdateGradeData) => Promise<any>;
export declare const deleteGrade: (id: string) => Promise<{
    message: string;
}>;
export declare const getNextGrade: (currentGradeId: string) => Promise<any>;
export declare const getHighestGrade: () => Promise<any>;
export {};
//# sourceMappingURL=grade.service.d.ts.map