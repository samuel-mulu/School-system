interface PromotionPreviewStudent {
    studentId: string;
    firstName: string;
    lastName: string;
    currentClassId: string;
    currentClassName: string;
    currentGradeId: string | null;
    currentGradeName: string | null;
    overallAverage: number;
    outcome: 'PASS' | 'REPEAT' | 'GRADUATE';
    nextGradeId: string | null;
    nextGradeName: string | null;
    nextClassName: string | null;
}
interface PromotionPreview {
    canPromote: boolean;
    term2Status: string;
    activeAcademicYear: {
        id: string;
        name: string;
    } | null;
    students: PromotionPreviewStudent[];
    summary: {
        total: number;
        passing: number;
        repeating: number;
        graduating: number;
    };
}
/**
 * Calculate overall yearly average for a student across all subjects
 */
export declare const calculateStudentYearlyAverage: (studentId: string, classId: string) => Promise<number>;
/**
 * Get promotion preview before execution
 */
export declare const getPromotionPreview: () => Promise<PromotionPreview>;
/**
 * Execute promotion for all students
 */
export declare const promoteStudents: () => Promise<{
    message: string;
    promoted: number;
    repeated: number;
    graduated: number;
}>;
export {};
//# sourceMappingURL=promotion.service.d.ts.map