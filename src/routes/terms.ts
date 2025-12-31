import { Router } from 'express';
import { z } from 'zod';
import * as termController from '../controllers/term.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { requireRegistrarOrOwner } from '../middleware/role';

const router = Router();

// Validation schemas
const createTermSchema = z.object({
  body: z.object({
    name: z.string().min(1),
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

export default router;

