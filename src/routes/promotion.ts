import { Router } from 'express';
import * as promotionController from "../controllers/promotion.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner } from "../middleware/role.js";

const router = Router();

// Routes
router.get(
  '/preview',
  authenticate,
  requireRegistrarOrOwner,
  promotionController.getPromotionPreview
);

router.post(
  '/execute',
  authenticate,
  requireRegistrarOrOwner,
  promotionController.promoteStudents
);

export default router;

