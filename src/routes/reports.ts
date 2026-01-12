import { Router } from 'express';
import * as reportController from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Routes
router.get(
  '/student/:studentId',
  authenticate,
  requireRegistrarOrOwner,
  reportController.getStudentReport
);

router.get(
  '/student/:studentId/payments',
  authenticate,
  requireRegistrarOrOwner,
  reportController.getPaymentHistory
);

router.get(
  '/class/:classId',
  authenticate,
  requireRegistrarOrOwner,
  reportController.getClassReport
);

router.get(
  '/payments',
  authenticate,
  requireRegistrarOrOwner,
  reportController.getPaymentReports
);

export default router;

