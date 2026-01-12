import { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from "../utils/errors.js";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// Convenience middleware for specific roles
export const requireRegistrar = requireRole(UserRole.REGISTRAR);
export const requireOwner = requireRole(UserRole.OWNER);
export const requireTeacher = requireRole(UserRole.TEACHER);
export const requireRegistrarOrOwner = requireRole(UserRole.REGISTRAR, UserRole.OWNER);

