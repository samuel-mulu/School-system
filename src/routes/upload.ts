import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRegistrarOrOwner } from '../middleware/role.js';
import { uploadSingle } from '../middleware/upload.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = Router();

// KYC document upload endpoint
router.post(
  '/uploadkyc',
  authenticate,
  requireRegistrarOrOwner,
  uploadSingle,
  uploadController.uploadKYC
);

// General file upload endpoint
router.post(
  '/upload',
  authenticate,
  requireRegistrarOrOwner,
  uploadSingle,
  uploadController.uploadFile
);

export default router;
