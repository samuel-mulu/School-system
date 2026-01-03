import type { Request, Response, NextFunction } from 'express';
import * as classService from '../services/class.service';
import { sendSuccess } from '../utils/responses';

export const createClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classRecord = await classService.createClass(req.body);
    sendSuccess(res, classRecord, 'Class created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
    };
    const result = await classService.getClasses(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classRecord = await classService.getClassById(
      req.params.id,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, classRecord);
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classRecord = await classService.updateClass(req.params.id, req.body);
    sendSuccess(res, classRecord, 'Class updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await classService.deleteClass(req.params.id);
    sendSuccess(res, result, 'Class deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Subject controllers
export const createSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subject = await classService.createSubject(
      req.params.classId,
      req.body,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, subject, 'Subject created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getSubjectsByClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subjects = await classService.getSubjectsByClass(
      req.params.classId,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, subjects);
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subject = await classService.updateSubject(
      req.params.subjectId,
      req.body,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, subject, 'Subject updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await classService.deleteSubject(
      req.params.subjectId,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, result, 'Subject deleted successfully');
  } catch (error) {
    next(error);
  }
};

