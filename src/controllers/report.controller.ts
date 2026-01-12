import type { Request, Response, NextFunction } from 'express';
import * as reportService from "../services/report.service.js";
import { sendSuccess } from "../utils/responses.js";

export const getStudentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await reportService.getStudentReport(req.params.studentId);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await reportService.getPaymentHistory(req.params.studentId);
    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
};

export const getClassReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const term = req.query.term as string;
    const report = await reportService.getClassReport(req.params.classId, term);
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

export const getPaymentReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { academicYearId, paymentTypeId, month, registrarId } = req.query;
    const report = await reportService.getPaymentReports({
      academicYearId: academicYearId as string | undefined,
      paymentTypeId: paymentTypeId as string | undefined,
      month: month as string | undefined,
      registrarId: registrarId as string | undefined,
    });
    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};

