import { Router } from 'express';
import { z } from 'zod';
import * as paymentController from "../controllers/payment.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Validation schemas
const createPaymentSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    paymentTypeId: z.string().uuid('Payment type ID is required'),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    year: z.number().int().min(2000).max(3000),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
    amount: z.number().positive().optional(), // Optional for backward compatibility, but will be fetched from PaymentType
  }),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    paymentDate: z.coerce.date().optional(),
    paymentMethod: z.string().optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createPaymentSchema),
  paymentController.createPayment
);

router.get(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.getPayments
);

router.get(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.getPaymentById
);

router.post(
  '/:id/confirm',
  authenticate,
  requireRegistrarOrOwner,
  validate(confirmPaymentSchema),
  paymentController.confirmPayment
);

router.post(
  '/:paymentId/receipt',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.generateReceipt
);

router.get(
  '/receipts/:id',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.getReceiptById
);

router.get(
  '/receipts/number/:receiptNumber',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.getReceiptByNumber
);

router.delete(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  paymentController.deletePayment
);

export default router;

