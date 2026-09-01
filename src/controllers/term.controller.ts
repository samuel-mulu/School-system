import type { Request, Response, NextFunction } from 'express';
import * as termService from "../services/term.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, academicYearId, startDate, endDate } = req.body;
    const term = await termService.createTerm({
      name,
      academicYearId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });
    sendSuccess(res, term, 'Term created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getTerms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { academicYearId } = req.query;
    const terms = await termService.getTerms(
      academicYearId as string | undefined
    );
    sendSuccess(res, terms);
  } catch (error) {
    next(error);
  }
};

export const getTermById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const term = await termService.getTermById(req.params.id);
    sendSuccess(res, term);
  } catch (error) {
    next(error);
  }
};

export const updateTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, startDate, endDate } = req.body;
    const term = await termService.updateTerm(req.params.id, {
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:
        endDate === null
          ? null
          : endDate
            ? new Date(endDate)
            : undefined,
    });
    sendSuccess(res, term, 'Term updated successfully');
  } catch (error) {
    next(error);
  }
};

export const closeTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const term = await termService.closeTerm(req.params.id);
    sendSuccess(res, term, 'Term closed successfully');
  } catch (error) {
    next(error);
  }
};

export const openTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const term = await termService.openTerm(req.params.id);
    sendSuccess(res, term, 'Term opened successfully');
  } catch (error) {
    next(error);
  }
};

export const activateTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const term = await termService.activateTerm(req.params.id);
    sendSuccess(res, term, 'Term activated successfully');
  } catch (error) {
    next(error);
  }
};

