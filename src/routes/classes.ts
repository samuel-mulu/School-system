import { Router } from 'express';
import { z } from 'zod';
import * as classController from "../controllers/class.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    academicYear: z.string().optional(),
    headTeacherId: z.string().uuid().optional(),
  }),
});

const updateClassSchema = z.object({
  body: createClassSchema.shape.body.partial(),
});

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
  }),
});

const updateSubjectSchema = z.object({
  body: createSubjectSchema.shape.body.partial(),
});

// Class routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createClassSchema),
  classController.createClass
);

router.get(
  '/',
  authenticate,
  classController.getClasses
);

router.get(
  '/:id',
  authenticate,
  classController.getClassById
);

router.patch(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateClassSchema),
  classController.updateClass
);

router.delete(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  classController.deleteClass
);

// Subject routes
router.post(
  '/:classId/subjects',
  authenticate,
  validate(createSubjectSchema),
  classController.createSubject
);

router.get(
  '/:classId/subjects',
  authenticate,
  classController.getSubjectsByClass
);

router.patch(
  '/subjects/:subjectId',
  authenticate,
  validate(updateSubjectSchema),
  classController.updateSubject
);

router.delete(
  '/subjects/:subjectId',
  authenticate,
  classController.deleteSubject
);

export default router;

