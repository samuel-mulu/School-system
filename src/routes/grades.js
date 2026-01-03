import { Router } from 'express';
import { z } from 'zod';
import * as gradeController from '../controllers/grade.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { requireRegistrarOrOwner } from '../middleware/role';
const router = Router();
// Validation schemas
const createGradeSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        order: z.number().int().positive(),
        isHighest: z.boolean().optional(),
    }),
});
const updateGradeSchema = z.object({
    body: createGradeSchema.shape.body.partial(),
});
// Routes
router.post('/', authenticate, requireRegistrarOrOwner, validate(createGradeSchema), gradeController.createGrade);
router.get('/', authenticate, gradeController.getGrades);
router.get('/:id', authenticate, gradeController.getGradeById);
router.patch('/:id', authenticate, requireRegistrarOrOwner, validate(updateGradeSchema), gradeController.updateGrade);
router.delete('/:id', authenticate, requireRegistrarOrOwner, gradeController.deleteGrade);
export default router;
//# sourceMappingURL=grades.js.map