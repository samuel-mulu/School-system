import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/responses';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  return sendError(res, 'Internal server error', 500);
};

