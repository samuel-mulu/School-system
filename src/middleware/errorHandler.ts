import type { Request, Response, NextFunction } from 'express';
import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/responses.js";

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError' || err.message.includes('Invalid value') || err.message.includes('Argument') || err.message.includes('missing')) {
    const errorMessage = err.message.includes('dateOfBirth') 
      ? 'Invalid date format. Please provide a valid date.'
      : err.message.includes('missing') && err.message.includes('Prisma')
      ? 'Database schema mismatch. Please regenerate Prisma client by running: npx prisma generate'
      : err.message.split('\n').pop() || 'Validation error';
    return sendError(res, errorMessage, 400);
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  return sendError(res, 'Internal server error', 500);
};

