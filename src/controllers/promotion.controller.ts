import type { Request, Response, NextFunction } from 'express';
import * as promotionService from "../services/promotion.service.js";
import { sendSuccess } from "../utils/responses.js";

export const getPromotionPreview = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preview = await promotionService.getPromotionPreview();
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

