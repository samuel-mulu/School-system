/**
 * Calculate weighted score contribution
 */
export declare const calculateWeightedScore: (score: number, maxScore: number, weightPercent: number) => number;
/**
 * Assign letter grade based on percentage
 */
export declare const assignGrade: (percentage: number) => string;
/**
 * Calculate term total score for a student in a subject
 */
export declare const calculateTermTotal: (studentId: string, subjectId: string, termId: string) => Promise<{
    subExamTotal: number;
    generalTestTotal: number;
    termTotal: number;
    grade: string;
    breakdown: Array<{
        subExamId: string;
        subExamName: string;
        examType: string;
        score: number;
        maxScore: number;
        weightPercent: number;
        weightedScore: number;
    }>;
}>;
/**
 * Calculate year average from Term 1 and Term 2
 */
export declare const calculateYearAverage: (studentId: string, subjectId: string) => Promise<{
    term1Total: number;
    term2Total: number;
    yearAverage: number;
    grade: string;
    term1Details: {
        subExamTotal: number;
        generalTestTotal: number;
        termTotal: number;
    };
    term2Details: {
        subExamTotal: number;
        generalTestTotal: number;
        termTotal: number;
    };
}>;
/**
 * Generate roster for a class with rankings
 */
export declare const generateRoster: (classId: string, termId?: string) => Promise<{
    class: {
        id: string;
        name: string;
    };
    term?: {
        id: string;
        name: string;
    };
    students: Array<{
        studentId: string;
        firstName: string;
        lastName: string;
        subjects: Array<{
            subjectId: string;
            subjectName: string;
            termTotal?: number;
            yearAverage?: number;
            grade: string;
        }>;
        overallAverage: number;
        overallGrade: string;
        rank: number;
    }>;
}>;
//# sourceMappingURL=calculation.service.d.ts.map