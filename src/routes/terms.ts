import { Router } from 'express';
import { z } from 'zod';
import * as termController from "../controllers/term.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createTermSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    academicYearId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  }),
});

const updateTermSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createTermSchema),
  termController.createTerm
);

router.get('/', authenticate, termController.getTerms);

router.get('/:id', authenticate, termController.getTermById);

router.put(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateTermSchema),
  termController.updateTerm
);

router.post(
  '/:id/close',
  authenticate,
  requireRegistrarOrOwner,
  termController.closeTerm
);

router.post(
  '/:id/open',
  authenticate,
  requireRegistrarOrOwner,
  termController.openTerm
);

router.post(
  '/:id/activate',
  authenticate,
  requireRegistrarOrOwner,
  termController.activateTerm
);

export default router;

