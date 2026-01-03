interface CreateAcademicYearData {
    name: string;
    startDate: Date;
    endDate?: Date;
}
export declare const createAcademicYear: (data: CreateAcademicYearData) => Promise<any>;
export declare const getAcademicYears: () => Promise<any>;
export declare const getAcademicYearById: (id: string) => Promise<any>;
export declare const getActiveAcademicYear: () => Promise<any>;
export declare const activateAcademicYear: (id: string) => Promise<any>;
export declare const closeAcademicYear: (id: string) => Promise<any>;
export declare const updateAcademicYear: (id: string, data: Partial<CreateAcademicYearData>) => Promise<any>;
export {};
//# sourceMappingURL=academicYear.service.d.ts.map