import { Router } from 'express';
import { z } from 'zod';
import * as studentController from '../controllers/student.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { requireRegistrarOrOwner } from '../middleware/role';

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

// Routes
router.post(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  validate(createStudentSchema),
  studentController.createStudent
);

router.get(
  '/',
  authenticate,
  requireRegistrarOrOwner,
  studentController.getStudents
);

router.get(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  studentController.getStudentById
);

router.patch(
  '/:id',
  authenticate,
  requireRegistrarOrOwner,
  validate(updateStudentSchema),
  studentController.updateStudent
);

router.post(
  '/:id/assign-class',
  authenticate,
  requireRegistrarOrOwner,
  validate(assignClassSchema),
  studentController.assignStudentToClass
);

import { requireRole } from '../middleware/role';

router.post(
  '/:id/transfer',
  authenticate,
  requireRole('OWNER'), // Only owner can transfer
  validate(transferSchema),
  studentController.transferStudent
);

router.delete(
  '/:id',
  authenticate,
  requireRole('OWNER'), // Only owner can delete
  studentController.deleteStudent
);

export default router;

