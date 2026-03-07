import { Router } from "express";
import { z } from "zod";
import * as homeworkController from "../controllers/homework.controller.js";
import { authenticate } from "../middleware/auth.js";
import {
  requireRegistrarOrOwner,
  requireTeacherOrAdmin,
} from "../middleware/role.js";
import { validate } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const markHomeworkSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    classId: z.string().uuid(),
    subjectId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    date: z.coerce.date(),
    status: z.enum(["done", "not_done"]),
    notes: z.string().optional(),
  }),
});

const bulkHomeworkSchema = z.object({
  body: z.object({
    classId: z.string().uuid(),
    subjectId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    date: z.coerce.date(),
    homeworkData: z.array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["done", "not_done"]),
        notes: z.string().optional(),
      }),
    ),
  }),
});

const updateHomeworkSchema = z.object({
  body: z.object({
    status: z.enum(["done", "not_done"]).optional(),
    notes: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
});

// Routes
router.post(
  "/",
  authenticate,
  requireTeacherOrAdmin,
  validate(markHomeworkSchema),
  homeworkController.markHomework,
);

router.post(
  "/bulk",
  authenticate,
  requireTeacherOrAdmin,
  validate(bulkHomeworkSchema),
  homeworkController.markBulkHomework,
);

router.get("/", authenticate, homeworkController.getHomework);

router.get("/:id", authenticate, homeworkController.getHomeworkById);

router.get(
  "/class/:classId",
  authenticate,
  homeworkController.getClassHomeworkForDate,
);

router.get(
  "/class/:classId/dates",
  authenticate,
  homeworkController.getClassHomeworkDates,
);

router.get(
  "/class/:classId/summary",
  authenticate,
  homeworkController.getClassHomeworkSummary,
);

router.patch(
  "/:id",
  authenticate,
  requireTeacherOrAdmin,
  validate(updateHomeworkSchema),
  homeworkController.updateHomework,
);

router.delete(
  "/:id",
  authenticate,
  requireRegistrarOrOwner,
  homeworkController.deleteHomework,
);

export default router;
