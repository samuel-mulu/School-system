import { Router } from 'express';
import { z } from 'zod';
import * as attendanceController from "../controllers/attendance.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner, requireTeacherOrAdmin } from "../middleware/role.js";
import { validate } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const markAttendanceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    classId: z.string().uuid(),
    date: z.coerce.date(),
    status: z.enum(['present', 'absent', 'late']),
    notes: z.string().optional(),
  }),
});

const bulkAttendanceSchema = z.object({
  body: z.object({
    classId: z.string().uuid(),
    date: z.coerce.date(),
    attendanceData: z.array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(['present', 'absent', 'late']),
        notes: z.string().optional(),
      })
    ),
  }),
});

const updateAttendanceSchema = z.object({
  body: z.object({
    status: z.enum(['present', 'absent', 'late']).optional(),
    notes: z.string().optional(),
  }),
});

// Routes
router.post(
  '/',
  authenticate,
  requireTeacherOrAdmin,
  validate(markAttendanceSchema),
  attendanceController.markAttendance
);

router.post(
  '/bulk',
  authenticate,
  requireTeacherOrAdmin,
  validate(bulkAttendanceSchema),
  attendanceController.markBulkAttendance
);

router.get(
  '/',
  authenticate,
  attendanceController.getAttendance
);

router.get(
  '/:id',
  authenticate,
  attendanceController.getAttendanceById
);

router.get(
  '/class/:classId',
  authenticate,
  attendanceController.getClassAttendanceForDate
);

router.get(
  '/class/:classId/dates',
  authenticate,
  attendanceController.getClassAttendanceDates
);

router.get(
  '/class/:classId/summary',
  authenticate,
  attendanceController.getClassAttendanceSummary
);

router.patch(
  '/:id',
  authenticate,
  requireTeacherOrAdmin,
  validate(updateAttendanceSchema),
  attendanceController.updateAttendance
);

router.delete(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  attendanceController.deleteAttendance
);

export default router;

