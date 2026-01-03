import type { Request, Response, NextFunction } from 'express';
import * as marksService from '../services/marks.service';
import { sendSuccess } from '../utils/responses';

export const createMark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mark = await marksService.createMark(
      req.body,
      req.user?.userId,
      req.user?.role
    );
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
      termId: req.query.termId as string,
      subExamId: req.query.subExamId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
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
    const mark = await marksService.getMarkById(
      req.params.id,
      req.user?.userId,
      req.user?.role
    );
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
    const { studentId, termId } = req.params;
    const result = await marksService.getStudentMarksByTerm(studentId, termId);
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
    const { classId, termId } = req.params;
    const subjectId = req.query.subjectId as string | undefined;
    const result = await marksService.getClassMarksByTerm(
      classId,
      termId,
      subjectId,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const recordMark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, subExamId } = req.params;
    const { score, notes } = req.body;
    const mark = await marksService.recordMark(
      studentId,
      subExamId,
      score,
      notes,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, mark, 'Mark recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const recordBulkMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subExamId } = req.params;
    const { marksData } = req.body;
    const results = await marksService.recordBulkMarks(
      subExamId,
      marksData,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, results, 'Bulk marks recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const calculateTermScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, subjectId, termId } = req.params;
    const result = await marksService.calculateTermScore(
      studentId,
      subjectId,
      termId
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const calculateYearScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, subjectId } = req.params;
    const result = await marksService.calculateYearScore(studentId, subjectId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTermReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, termId } = req.params;
    const result = await marksService.getTermReport(studentId, termId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const generateRoster = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId } = req.params;
    const termId = req.query.termId as string | undefined;
    const { generateRoster: generateRosterService } = await import(
      '../services/calculation.service'
    );
    const result = await generateRosterService(classId, termId);
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
    const mark = await marksService.updateMark(
      req.params.id,
      req.body,
      req.user?.userId,
      req.user?.role
    );
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
    const result = await marksService.deleteMark(
      req.params.id,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, result, 'Mark deleted successfully');
  } catch (error) {
    next(error);
  }
};

