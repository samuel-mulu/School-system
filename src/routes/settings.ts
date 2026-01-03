import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settings.controller.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';

const router = Router();

// Validation schemas
const updateSettingSchema = z.object({
  body: z.object({
    value: z.string().min(1),
    description: z.string().optional(),
  }),
});

// Routes
router.get('/', authenticate, requireOwner, settingsController.getAllSettings);

router.get('/:key', authenticate, requireOwner, settingsController.getSetting);

router.patch(
  '/:key',
  authenticate,
  requireOwner,
  validate(updateSettingSchema),
  settingsController.updateSetting
);

export default router;