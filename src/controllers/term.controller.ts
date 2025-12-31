import type { Request, Response, NextFunction } from 'express';
import * as termService from '../services/term.service';
import { sendSuccess } from '../utils/responses';

export const createTerm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    const term = await termService.createTerm(name);
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
    const terms = await termService.getTerms();
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

