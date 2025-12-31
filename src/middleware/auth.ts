import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import type { JWTPayload } from '../config/jwt';
import { UnauthorizedError } from '../utils/errors';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Try to get token from cookie first
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
};

