import { Router } from 'express';
import { z } from 'zod';
import * as gradeController from "../controllers/grade.controller.js";
import * as classController from "../controllers/class.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

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

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createGradeSchema),
  gradeController.createGrade
);

router.get('/', authenticate, gradeController.getGrades);

router.get('/:id', authenticate, gradeController.getGradeById);

router.patch(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateGradeSchema),
  gradeController.updateGrade
);

router.delete(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  gradeController.deleteGrade
);

// Subject routes (grade-level)
router.get(
  '/:gradeId/subjects',
  authenticate,
  classController.getSubjectsByGrade
);

router.post(
  '/:gradeId/subjects',
  authenticate,
  requireRegistrarOrOwner,
  validate(createSubjectSchema),
  classController.createSubject
);

export default router;

