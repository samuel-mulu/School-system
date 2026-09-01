import { Router } from "express";
import { z } from "zod";
import * as studentController from "../controllers/student.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRegistrarOrOwner, requireRole } from "../middleware/role.js";
import { uploadSingle } from "../middleware/upload.js";
import { validate } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.coerce.date(),
    gender: z.string().min(1),
    nationality: z.string().optional(),
    religion: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    parentName: z.string().min(1),
    parentPhone: z.string().min(1),
    parentEmail: z.string().email().optional(),
    parentRelation: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    emergencyName: z.string().min(1),
    emergencyPhone: z.string().min(1),
    emergencyRelation: z.string().min(1),
    medicalConditions: z.string().optional(),
    allergies: z.string().optional(),
    bloodGroup: z.string().optional(),
    previousSchool: z.string().optional(),
    previousClass: z.string().optional(),
    transferReason: z.string().optional(),
    classId: z.string().uuid().optional(),
    assignClassReason: z.string().optional(),
    profileImageUrl: z.string().url().optional(),
    parentsPortal: z.boolean().optional(),
  }),
});

const updateStudentSchema = z.object({
  body: createStudentSchema.shape.body.partial(),
});

const assignClassSchema = z.object({
  body: z.object({
    classId: z.string().uuid(),
    reason: z.string().optional(),
  }),
});

const transferSchema = z.object({
  body: z.object({
    newClassId: z.string().uuid(),
    reason: z.string().optional(),
  }),
});

const bulkTransferSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string().uuid()).min(1).max(200),
    newClassId: z.string().uuid(),
    reason: z.string().optional(),
  }),
});

const toggleParentsPortalSchema = z.object({
  body: z.object({
    parentsPortal: z.boolean(),
  }),
});

// Routes
router.post(
  "/upload-image",
  authenticate,
  requireRegistrarOrOwner,
  uploadSingle,
  studentController.uploadStudentImage,
);

router.post(
  "/",
  authenticate,
  requireRegistrarOrOwner,
  validate(createStudentSchema),
  studentController.createStudent,
);

router.get("/", authenticate, studentController.getStudents);

router.get(
  "/graduates",
  authenticate,
  requireRegistrarOrOwner,
  studentController.getGraduates,
);

router.post(
  "/transfer/bulk",
  authenticate,
  requireRole("OWNER"),
  validate(bulkTransferSchema),
  studentController.transferStudentsBulk,
);

router.get("/:id", authenticate, studentController.getStudentById);

router.patch(
  "/:id",
  authenticate,
  requireRegistrarOrOwner,
  validate(updateStudentSchema),
  studentController.updateStudent,
);

router.post(
  "/:id/assign-class",
  authenticate,
  requireRegistrarOrOwner,
  validate(assignClassSchema),
  studentController.assignStudentToClass,
);

router.post(
  "/:id/transfer",
  authenticate,
  requireRole("OWNER"), // Only owner can transfer
  validate(transferSchema),
  studentController.transferStudent,
);

router.patch(
  "/:id/toggle-parents-portal",
  authenticate,
  requireRegistrarOrOwner,
  validate(toggleParentsPortalSchema),
  studentController.toggleParentsPortal,
);

router.delete(
  "/:id",
  authenticate,
  requireRole("OWNER"), // Only owner can delete
  studentController.deleteStudent,
);

export default router;
