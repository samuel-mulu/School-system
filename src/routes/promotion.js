import { Router } from 'express';
import * as promotionController from '../controllers/promotion.controller';
import { authenticate } from '../middleware/auth';
import { requireRegistrarOrOwner } from '../middleware/role';
const router = Router();
// Routes
router.get('/preview', authenticate, requireRegistrarOrOwner, promotionController.getPromotionPreview);
router.post('/execute', authenticate, requireRegistrarOrOwner, promotionController.promoteStudents);
export default router;
//# sourceMappingURL=promotion.js.map