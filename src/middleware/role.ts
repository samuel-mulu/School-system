import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../generated/prisma/enums';
import { ForbiddenError } from '../utils/errors';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Convenience middleware for specific roles
export const requireRegistrar = requireRole(UserRole.REGISTRAR);
export const requireOwner = requireRole(UserRole.OWNER);
export const requireTeacher = requireRole(UserRole.TEACHER);
export const requireRegistrarOrOwner = requireRole(UserRole.REGISTRAR, UserRole.OWNER);

