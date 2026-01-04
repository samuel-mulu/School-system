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

