import type { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../services/attendance.service';
import { sendSuccess } from '../utils/responses';

export const markAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attendance = await attendanceService.markAttendance(req.body);
    sendSuccess(res, attendance, 'Attendance marked successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const markBulkAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId, date, attendanceData } = req.body;
    const results = await attendanceService.markBulkAttendance(
      classId,
      new Date(date),
      attendanceData
    );
    sendSuccess(res, results, 'Bulk attendance marked successfully');
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      studentId: req.query.studentId as string,
      classId: req.query.classId as string,
      date: req.query.date ? new Date(req.query.date as string) : undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await attendanceService.getAttendance(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attendance = await attendanceService.getAttendanceById(req.params.id);
    sendSuccess(res, attendance);
  } catch (error) {
    next(error);
  }
};

export const getClassAttendanceForDate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId } = req.params;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const result = await attendanceService.getClassAttendanceForDate(classId, date);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attendance = await attendanceService.updateAttendance(req.params.id, req.body);
    sendSuccess(res, attendance, 'Attendance updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await attendanceService.deleteAttendance(req.params.id);
    sendSuccess(res, result, 'Attendance deleted successfully');
  } catch (error) {
    next(error);
  }
};

