import { Router } from 'express';
import { z } from 'zod';
import * as marksController from '../controllers/marks.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { requireTeacher } from '../middleware/role';
const router = Router();
// Validation schemas
const createMarkSchema = z.object({
    body: z.object({
        studentId: z.string().uuid(),
        classId: z.string().uuid(),
        subjectId: z.string().uuid(),
        termId: z.string().uuid(),
        subExamId: z.string().uuid(),
        score: z.number().min(0),
        notes: z.string().optional(),
    }),
});
const recordMarkSchema = z.object({
    body: z.object({
        score: z.number().min(0),
        notes: z.string().optional(),
    }),
});
const recordBulkMarksSchema = z.object({
    body: z.object({
        marksData: z.array(z.object({
            studentId: z.string().uuid(),
            score: z.number().min(0),
            notes: z.string().optional(),
        })),
    }),
});
const updateMarkSchema = z.object({
    body: z.object({
        score: z.number().min(0).optional(),
        grade: z.string().optional(),
        notes: z.string().optional(),
    }),
});
// Routes
router.post('/', authenticate, requireTeacher, validate(createMarkSchema), marksController.createMark);
router.get('/', authenticate, marksController.getMarks);
router.get('/:id', authenticate, marksController.getMarkById);
router.post('/record/student/:studentId/subexam/:subExamId', authenticate, requireTeacher, validate(recordMarkSchema), marksController.recordMark);
router.post('/record/bulk/subexam/:subExamId', authenticate, requireTeacher, validate(recordBulkMarksSchema), marksController.recordBulkMarks);
router.get('/term/:termId/student/:studentId', authenticate, marksController.getStudentMarksByTerm);
router.get('/class/:classId/term/:termId', authenticate, marksController.getClassMarksByTerm);
router.get('/calculate/term/:termId/student/:studentId/subject/:subjectId', authenticate, marksController.calculateTermScore);
router.get('/calculate/year/student/:studentId/subject/:subjectId', authenticate, marksController.calculateYearScore);
router.get('/report/term/:termId/student/:studentId', authenticate, marksController.getTermReport);
router.get('/roster/class/:classId', authenticate, marksController.generateRoster);
router.patch('/:id', authenticate, requireTeacher, validate(updateMarkSchema), marksController.updateMark);
router.delete('/:id', authenticate, requireTeacher, marksController.deleteMark);
export default router;
//# sourceMappingURL=marks.js.map