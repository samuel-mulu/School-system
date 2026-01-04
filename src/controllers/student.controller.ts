import type { Request, Response, NextFunction } from 'express';
import * as studentService from "../services/student.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await studentService.createStudent(req.body);
    sendSuccess(res, student, 'Student registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      classStatus: req.query.classStatus as any,
      paymentStatus: req.query.paymentStatus as any,
      search: req.query.search as string,
      classId: req.query.classId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
    };
    const result = await studentService.getStudents(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await studentService.getStudentById(
      req.params.id,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, student);
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    sendSuccess(res, student, 'Student updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignStudentToClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId, reason } = req.body;
    const student = await studentService.assignStudentToClass(
      req.params.id,
      classId,
      reason
    );
    sendSuccess(res, student, 'Student assigned to class successfully');
  } catch (error) {
    next(error);
  }
};

export const transferStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newClassId, reason } = req.body;
    const student = await studentService.transferStudent(
      req.params.id,
      newClassId,
      reason
    );
    sendSuccess(res, student, 'Student transferred successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await studentService.deleteStudent(req.params.id);
    sendSuccess(res, result, 'Student deleted successfully');
  } catch (error) {
    next(error);
  }
};

