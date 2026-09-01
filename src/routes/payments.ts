import { Router } from 'express';
import { z } from 'zod';
import * as paymentController from "../controllers/payment.controller.js";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";
import { uploadSingle } from "../middleware/upload.js";

const router = Router();

// Treat empty strings / null as "not provided" for optional URL fields.
const optionalUrl = () =>
  z.preprocess(
    (v) => {
      if (v === '' || v === null) return undefined;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        return trimmed === '' ? undefined : trimmed;
      }
      return v;
    },
    z.string().url().optional()
  );

const optionalTrimmedString = () =>
  z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        return trimmed === '' ? undefined : trimmed;
      }
      return v;
    },
    z.string().optional()
  );

const requirePayerNameForMobileBanking = <T extends { paymentMethod?: string; payerName?: string }>(
  data: T,
  ctx: z.RefinementCtx
) => {
  if (data.paymentMethod === 'mobile_banking' && !data.payerName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Payer name is required for mobile banking payments',
      path: ['payerName'],
    });
  }
};

// Validation schemas
const createPaymentSchema = z.object({
  body: z
    .object({
      studentId: z.string().uuid(),
      academicYearId: z.string().uuid('Academic year ID is required'),
      paymentTypeId: z.string().uuid('Payment type ID is required'),
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
      year: z.number().int().min(2000).max(3000),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      proofImageUrl: optionalUrl(),
      transactionNumber: z.string().optional(),
      payerName: optionalTrimmedString(),
      amount: z.number().positive().optional(), // Optional for backward compatibility, but will be fetched from PaymentType
    })
    .superRefine(requirePayerNameForMobileBanking),
});

const createBulkPaymentSchema = z.object({
  body: z
    .object({
      studentId: z.string().uuid(),
      academicYearId: z.string().uuid('Academic year ID is required'),
      paymentTypeId: z.string().uuid('Payment type ID is required'),
      months: z.array(z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')).min(1, 'At least one month must be provided'),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      proofImageUrl: optionalUrl(),
      transactionNumber: z.string().optional(),
      payerName: optionalTrimmedString(),
    })
    .superRefine(requirePayerNameForMobileBanking),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    paymentDate: z.coerce.date().optional(),
    paymentMethod: z.string().optional(),
    proofImageUrl: optionalUrl(),
    transactionNumber: z.string().optional(),
    payerName: optionalTrimmedString(),
  }),
});

const confirmBulkPaymentsSchema = z.object({
  body: z.object({
    paymentIds: z.array(z.string().uuid()).min(1, 'At least one payment ID is required'),
    paymentDate: z.coerce.date().optional(),
    paymentMethod: z.string().optional(),
    proofImageUrl: optionalUrl(),
    transactionNumber: z.string().optional(),
    payerName: optionalTrimmedString(),
  }),
});

// Routes
router.post(
  '/bulk',
  authenticate,
  requireRegistrarOrOwner,
  validate(createBulkPaymentSchema),
  paymentController.createBulkPayments
);

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
  '/bulk/confirm',
  authenticate,
  requireRegistrarOrOwner,
  validate(confirmBulkPaymentsSchema),
  paymentController.confirmBulkPayments
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

router.post(
  '/upload-proof',
  authenticate,
  requireRegistrarOrOwner,
  uploadSingle,
  paymentController.uploadPaymentProof
);

export default router;

