import type { Request, Response, NextFunction } from 'express';
import * as subExamService from '../services/subexam.service';
import { sendSuccess } from '../utils/responses';

export const createSubExam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subExam = await subExamService.createSubExam(req.body);
    sendSuccess(res, subExam, 'Sub-exam created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getSubExamsBySubjectAndTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subjectId, termId } = req.params;
    const subExams = await subExamService.getSubExamsBySubjectAndTerm(
      subjectId,
      termId
    );
    sendSuccess(res, subExams);
  } catch (error) {
    next(error);
  }
};

export const updateSubExam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subExam = await subExamService.updateSubExam(
      req.params.id,
      req.body
    );
    sendSuccess(res, subExam, 'Sub-exam updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteSubExam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await subExamService.deleteSubExam(req.params.id);
    sendSuccess(res, result, 'Sub-exam deleted successfully');
  } catch (error) {
    next(error);
  }
};

