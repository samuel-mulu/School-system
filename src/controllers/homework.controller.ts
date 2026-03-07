import type { NextFunction, Request, Response } from "express";
import * as homeworkService from "../services/homework.service.js";
import { sendSuccess } from "../utils/responses.js";

export const markHomework = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const homework = await homeworkService.markHomework(
      req.body,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, homework, "Homework marked successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const markBulkHomework = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { classId, subjectId, title, description, date, homeworkData } =
      req.body;
    const results = await homeworkService.markBulkHomework(
      classId,
      subjectId,
      title,
      description,
      new Date(date),
      homeworkData,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, results, "Bulk homework marked successfully");
  } catch (error) {
    next(error);
  }
};

export const getHomework = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = {
      studentId: req.query.studentId as string,
      classId: req.query.classId as string,
      subjectId: req.query.subjectId as string,
      dueDate: req.query.date ? new Date(req.query.date as string) : undefined,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
    };
    const result = await homeworkService.getHomework(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getHomeworkById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const homework = await homeworkService.getHomeworkById(
      req.params.id,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, homework);
  } catch (error) {
    next(error);
  }
};

export const getClassHomeworkForDate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { classId } = req.params;
    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date();
    const subjectId = req.query.subjectId as string | undefined;

    const result = await homeworkService.getClassHomeworkForDate(
      classId,
      date,
      subjectId,
      req.user?.userId,
      req.user?.role,
    );

    sendSuccess(res, result);
  } catch (error) {
    const classId = req.params.classId;
    const date = req.query.date;
    const subjectId = req.query.subjectId;
    console.error("Error in getClassHomeworkForDate controller:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      classId,
      date,
      subjectId,
    });
    next(error);
  }
};

export const updateHomework = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const homework = await homeworkService.updateHomework(
      req.params.id,
      req.body,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, homework, "Homework updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteHomework = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await homeworkService.deleteHomework(req.params.id);
    sendSuccess(res, result, "Homework deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getClassHomeworkDates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { classId } = req.params;
    const dates = await homeworkService.getClassHomeworkDates(
      classId,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, dates);
  } catch (error) {
    next(error);
  }
};

export const getClassHomeworkSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { classId } = req.params;
    const summary = await homeworkService.getClassHomeworkSummary(
      classId,
      req.user?.userId,
      req.user?.role,
    );
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
};
