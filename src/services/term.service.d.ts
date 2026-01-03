export declare const createTerm: (data: {
    name: string;
    academicYearId: string;
    startDate: Date;
    endDate?: Date;
}) => Promise<any>;
export declare const getTerms: (academicYearId?: string) => Promise<any>;
export declare const getTermById: (id: string) => Promise<any>;
export declare const getTermByName: (name: string, academicYearId?: string) => Promise<any>;
export declare const closeTerm: (id: string) => Promise<any>;
export declare const openTerm: (id: string) => Promise<any>;
export declare const activateTerm: (id: string) => Promise<any>;
//# sourceMappingURL=term.service.d.ts.map