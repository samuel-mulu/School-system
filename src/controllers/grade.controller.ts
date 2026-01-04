import type { Request, Response, NextFunction } from 'express';
import * as gradeService from "../services/grade.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grade = await gradeService.createGrade(req.body);
    sendSuccess(res, grade, 'Grade created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getGrades = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grades = await gradeService.getGrades();
    sendSuccess(res, grades);
  } catch (error) {
    next(error);
  }
};

export const getGradeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grade = await gradeService.getGradeById(req.params.id);
    sendSuccess(res, grade);
  } catch (error) {
    next(error);
  }
};

export const updateGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    sendSuccess(res, grade, 'Grade updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await gradeService.deleteGrade(req.params.id);
    sendSuccess(res, result, 'Grade deleted successfully');
  } catch (error) {
    next(error);
  }
};

