import { Router } from 'express';
import { z } from 'zod';
import * as academicYearController from "../controllers/academicYear.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  }),
});

const updateAcademicYearSchema = z.object({
  body: createAcademicYearSchema.shape.body.partial(),
});

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createAcademicYearSchema),
  academicYearController.createAcademicYear
);

router.get('/', authenticate, academicYearController.getAcademicYears);

router.get('/active', authenticate, academicYearController.getActiveAcademicYear);

router.get('/:id', authenticate, academicYearController.getAcademicYearById);

router.patch(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateAcademicYearSchema),
  academicYearController.updateAcademicYear
);

router.post(
  '/:id/activate',
  authenticate,
  requireRegistrarOrOwner,
  academicYearController.activateAcademicYear
);

router.post(
  '/:id/close',
  authenticate,
  requireRegistrarOrOwner,
  academicYearController.closeAcademicYear
);

export default router;

