import type { Request, Response, NextFunction } from 'express';
import * as promotionService from "../services/promotion.service.js";
import { sendSuccess } from "../utils/responses.js";

export const getPromotionPreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classId = req.query.classId as string | undefined;
    const includeStudents = req.query.includeStudents !== 'false';
    const preview = await promotionService.getPromotionPreview({
      classId,
      includeStudents,
    });
    sendSuccess(res, preview);
  } catch (error) {
    next(error);
  }
};

export const promoteStudents = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await promotionService.promoteStudents();
    sendSuccess(res, result, 'Promotion completed successfully');
  } catch (error) {
    next(error);
  }
};

