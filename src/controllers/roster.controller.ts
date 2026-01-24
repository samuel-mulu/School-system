import type { Request, Response, NextFunction } from 'express';
import * as rosterService from "../services/roster.service.js";
import { sendSuccess } from "../utils/responses.js";

export const getRosterResults = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId, termId } = req.params;
    const result = await rosterService.getRosterResults(
      classId,
      termId,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getRosterResultsSemesters = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { classId } = req.params;
    const result = await rosterService.getRosterResultsSemesters(
      classId,
      req.user?.userId,
      req.user?.role
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};