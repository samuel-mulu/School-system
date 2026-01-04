import { Router } from 'express';
import { z } from 'zod';
import * as subExamController from "../controllers/subexam.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createSubExamSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid(),
    termId: z.string().uuid(),
    name: z.string().min(1),
    maxScore: z.number().positive(),
    weightPercent: z.number().min(0).max(100),
    examType: z.enum(['quiz', 'assignment', 'mid_exam', 'general_test']),
  }),
});

const updateSubExamSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    maxScore: z.number().positive().optional(),
    weightPercent: z.number().min(0).max(100).optional(),
    examType: z.enum(['quiz', 'assignment', 'mid_exam', 'general_test']).optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createSubExamSchema),
  subExamController.createSubExam
);

router.get(
  '/subject/:subjectId/term/:termId',
  authenticate,
  subExamController.getSubExamsBySubjectAndTerm
);

router.patch(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateSubExamSchema),
  subExamController.updateSubExam
);

router.delete(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  subExamController.deleteSubExam
);

export default router;