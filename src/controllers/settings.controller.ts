import type { Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settings.service';
import { sendSuccess } from '../utils/responses';

export const getSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const setting = await settingsService.getSetting(req.params.key);
    sendSuccess(res, setting);
  } catch (error) {
    next(error);
  }
};

export const getAllSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.getAllSettings();
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const setting = await settingsService.updateSetting(
      req.params.key,
      req.body.value,
      req.body.description
    );
    sendSuccess(res, setting, 'Setting updated successfully');
  } catch (error) {
    next(error);
  }
};

