import { Router } from 'express';
import * as badgeController from '../controllers/badge.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get badge preview data (for frontend preview)
router.get(
  '/:studentId/preview',
  authenticate,
  badgeController.getBadgePreview
);

// Generate and download badge
router.get(
  '/:studentId',
  authenticate,
  badgeController.getBadge
);

export default router;
