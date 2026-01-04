import type { Request, Response, NextFunction } from 'express';
import * as academicYearService from "../services/academicYear.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createAcademicYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await academicYearService.createAcademicYear({
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    });
    sendSuccess(res, academicYear, 'Academic year created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getAcademicYears = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYears = await academicYearService.getAcademicYears();
    sendSuccess(res, academicYears);
  } catch (error) {
    next(error);
  }
};

export const getAcademicYearById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await academicYearService.getAcademicYearById(req.params.id);
    sendSuccess(res, academicYear);
  } catch (error) {
    next(error);
  }
};

export const getActiveAcademicYear = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await academicYearService.getActiveAcademicYear();
    sendSuccess(res, academicYear);
  } catch (error) {
    next(error);
  }
};

export const activateAcademicYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await academicYearService.activateAcademicYear(req.params.id);
    sendSuccess(res, academicYear, 'Academic year activated successfully');
  } catch (error) {
    next(error);
  }
};

export const closeAcademicYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await academicYearService.closeAcademicYear(req.params.id);
    sendSuccess(res, academicYear, 'Academic year closed successfully');
  } catch (error) {
    next(error);
  }
};

export const updateAcademicYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updateData: any = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) {
      updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }

    const academicYear = await academicYearService.updateAcademicYear(
      req.params.id,
      updateData
    );
    sendSuccess(res, academicYear, 'Academic year updated successfully');
  } catch (error) {
    next(error);
  }
};

