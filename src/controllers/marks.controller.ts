import type { Request, Response, NextFunction } from 'express';
import * as marksService from '../services/marks.service';
import { sendSuccess } from '../utils/responses';

export const createMark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mark = await marksService.createMark(req.body);
    sendSuccess(res, mark, 'Mark created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      studentId: req.query.studentId as string,
      classId: req.query.classId as string,
      subjectId: req.query.subjectId as string,
      term: req.query.term as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await marksService.getMarks(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getMarkById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mark = await marksService.getMarkById(req.params.id);
    sendSuccess(res, mark);
  } catch (error) {
    next(error);
  }
};

export const getStudentMarksByTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, term } = req.params;
    const result = await marksService.getStudentMarksByTerm(studentId, term);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getClassMarksByTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId, term } = req.params;
    const result = await marksService.getClassMarksByTerm(classId, term);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateMark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mark = await marksService.updateMark(req.params.id, req.body);
    sendSuccess(res, mark, 'Mark updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteMark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await marksService.deleteMark(req.params.id);
    sendSuccess(res, result, 'Mark deleted successfully');
  } catch (error) {
    next(error);
  }
};

