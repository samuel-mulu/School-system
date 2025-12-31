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
    term: z.string().min(1),
    score: z.number().min(0),
    maxScore: z.number().positive().optional(),
    grade: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateMarkSchema = z.object({
  body: z.object({
    score: z.number().min(0).optional(),
    maxScore: z.number().positive().optional(),
    grade: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireTeacher,
  validate(createMarkSchema),
  marksController.createMark
);

router.get(
  '/',
  authenticate,
  marksController.getMarks
);

router.get(
  '/:id',
  authenticate,
  marksController.getMarkById
);

router.get(
  '/student/:studentId/term/:term',
  authenticate,
  marksController.getStudentMarksByTerm
);

router.get(
  '/class/:classId/term/:term',
  authenticate,
  marksController.getClassMarksByTerm
);

router.patch(
  '/:id',
  authenticate,
  requireTeacher,
  validate(updateMarkSchema),
  marksController.updateMark
);

router.delete(
  '/:id',
  authenticate,
  requireTeacher,
  marksController.deleteMark
);

export default router;

