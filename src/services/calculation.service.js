import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';
/**
 * Calculate weighted score contribution
 */
export const calculateWeightedScore = (score, maxScore, weightPercent) => {
    if (maxScore === 0)
        return 0;
    const percentage = (score / maxScore) * 100;
    return (percentage / 100) * weightPercent;
};
/**
 * Assign letter grade based on percentage
 */
export const assignGrade = (percentage) => {
    if (percentage >= 90)
        return 'A';
    if (percentage >= 80)
        return 'B';
    if (percentage >= 70)
        return 'C';
    if (percentage >= 60)
        return 'D';
    return 'F';
};
/**
 * Calculate term total score for a student in a subject
 */
export const calculateTermTotal = async (studentId, subjectId, termId) => {
    // Get all sub-exams for this subject and term
    const subExams = await prisma.subExam.findMany({
        where: {
            subjectId,
            termId,
        },
    });
    if (subExams.length === 0) {
        throw new NotFoundError('No sub-exams found for this subject and term');
    }
    // Get all marks for this student, subject, and term
    const marks = await prisma.mark.findMany({
        where: {
            studentId,
            subjectId,
            termId,
        },
        include: {
            subExam: true,
        },
    });
    let subExamTotal = 0;
    let generalTestTotal = 0;
    const breakdown = [];
    // Calculate weighted scores for each sub-exam
    for (const subExam of subExams) {
        const mark = marks.find((m) => m.subExamId === subExam.id);
        const score = mark?.score || 0;
        const maxScore = subExam.maxScore;
        const weightedScore = calculateWeightedScore(score, maxScore, subExam.weightPercent);
        breakdown.push({
            subExamId: subExam.id,
            subExamName: subExam.name,
            examType: subExam.examType,
            score,
            maxScore,
            weightPercent: subExam.weightPercent,
            weightedScore,
        });
        if (subExam.examType === 'general_test') {
            generalTestTotal += weightedScore;
        }
        else {
            subExamTotal += weightedScore;
        }
    }
    const termTotal = subExamTotal + generalTestTotal;
    const grade = assignGrade(termTotal);
    return {
        subExamTotal,
        generalTestTotal,
        termTotal,
        grade,
        breakdown,
    };
};
/**
 * Calculate year average from Term 1 and Term 2
 */
export const calculateYearAverage = async (studentId, subjectId) => {
    // Get Term 1 and Term 2
    const term1 = await prisma.term.findUnique({ where: { name: 'Term 1' } });
    const term2 = await prisma.term.findUnique({ where: { name: 'Term 2' } });
    if (!term1 || !term2) {
        throw new NotFoundError('Term 1 or Term 2 not found');
    }
    // Calculate term totals
    const term1Result = await calculateTermTotal(studentId, subjectId, term1.id);
    const term2Result = await calculateTermTotal(studentId, subjectId, term2.id);
    const yearAverage = (term1Result.termTotal + term2Result.termTotal) / 2;
    const grade = assignGrade(yearAverage);
    return {
        term1Total: term1Result.termTotal,
        term2Total: term2Result.termTotal,
        yearAverage,
        grade,
        term1Details: {
            subExamTotal: term1Result.subExamTotal,
            generalTestTotal: term1Result.generalTestTotal,
            termTotal: term1Result.termTotal,
        },
        term2Details: {
            subExamTotal: term2Result.subExamTotal,
            generalTestTotal: term2Result.generalTestTotal,
            termTotal: term2Result.termTotal,
        },
    };
};
/**
 * Generate roster for a class with rankings
 */
export const generateRoster = async (classId, termId) => {
    // Verify class exists
    const classRecord = await prisma.class.findUnique({
        where: { id: classId },
    });
    if (!classRecord) {
        throw new NotFoundError('Class not found');
    }
    // Get all students in this class
    const studentClasses = await prisma.studentClass.findMany({
        where: {
            classId,
            endDate: null, // Active assignments only
        },
        include: {
            student: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });
    // Get all subjects for this class
    const subjects = await prisma.subject.findMany({
        where: { classId },
    });
    const term = termId
        ? await prisma.term.findUnique({ where: { id: termId } })
        : null;
    // Calculate scores for each student
    const studentScores = await Promise.all(studentClasses.map(async (sc) => {
        const subjectScores = await Promise.all(subjects.map(async (subject) => {
            let termTotal;
            let yearAverage;
            let grade;
            if (term) {
                // Calculate term score
                try {
                    const termResult = await calculateTermTotal(sc.studentId, subject.id, term.id);
                    termTotal = termResult.termTotal;
                    grade = termResult.grade;
                }
                catch {
                    termTotal = 0;
                    grade = 'F';
                }
            }
            else {
                // Calculate year average
                try {
                    const yearResult = await calculateYearAverage(sc.studentId, subject.id);
                    yearAverage = yearResult.yearAverage;
                    grade = yearResult.grade;
                }
                catch {
                    yearAverage = 0;
                    grade = 'F';
                }
            }
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                termTotal,
                yearAverage,
                grade,
            };
        }));
        // Calculate overall average
        const scores = subjectScores.map((s) => s.yearAverage || s.termTotal || 0);
        const overallAverage = scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;
        const overallGrade = assignGrade(overallAverage);
        return {
            studentId: sc.studentId,
            firstName: sc.student.firstName,
            lastName: sc.student.lastName,
            subjects: subjectScores,
            overallAverage,
            overallGrade,
            rank: 0, // Will be set after sorting
        };
    }));
    // Sort by overall average (descending) and assign ranks
    studentScores.sort((a, b) => b.overallAverage - a.overallAverage);
    studentScores.forEach((student, index) => {
        student.rank = index + 1;
    });
    const result = {
        class: {
            id: classRecord.id,
            name: classRecord.name,
        },
        students: studentScores,
    };
    if (term) {
        result.term = {
            id: term.id,
            name: term.name,
        };
    }
    return result;
};
//# sourceMappingURL=calculation.service.js.map