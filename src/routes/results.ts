import { Router } from 'express';
import * as rosterController from "../controllers/roster.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Roster results route
router.get(
  '/roster/class/:classId/term/:termId',
  authenticate,
  rosterController.getRosterResults
);

// Roster results for semesters (Term 1 + Term 2 + Average)
router.get(
  '/roster/class/:classId/semesters',
  authenticate,
  rosterController.getRosterResultsSemesters
);

export default router;
