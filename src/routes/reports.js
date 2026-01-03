import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { requireRegistrarOrOwner } from '../middleware/role';
const router = Router();
// Routes
router.get('/student/:studentId', authenticate, requireRegistrarOrOwner, reportController.getStudentReport);
router.get('/student/:studentId/payments', authenticate, requireRegistrarOrOwner, reportController.getPaymentHistory);
router.get('/class/:classId', authenticate, requireRegistrarOrOwner, reportController.getClassReport);
export default router;
//# sourceMappingURL=reports.js.map