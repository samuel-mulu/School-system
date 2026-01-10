import { Router } from 'express';
import { z } from 'zod';
import * as paymentTypeController from "../controllers/payment-type.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireOwner, requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createPaymentTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    amount: z.number().positive('Amount must be greater than 0'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updatePaymentTypeSchema = z.object({
  body: createPaymentTypeSchema.shape.body.partial(),
});

// Routes
// Only OWNER can create, update, delete payment types
router.post(
  '/',
  authenticate,
  requireOwner,
  validate(createPaymentTypeSchema),
  paymentTypeController.createPaymentType
);

// REGISTRAR and OWNER can view payment types (for payment creation)
router.get('/', authenticate, requireRegistrarOrOwner, paymentTypeController.getPaymentTypes);

router.get('/:id', authenticate, requireRegistrarOrOwner, paymentTypeController.getPaymentTypeById);

router.patch(
  '/:id',
  authenticate,
  requireOwner,
  validate(updatePaymentTypeSchema),
  paymentTypeController.updatePaymentType
);

router.delete(
  '/:id',
  authenticate,
  requireOwner,
  paymentTypeController.deletePaymentType
);

export default router;
