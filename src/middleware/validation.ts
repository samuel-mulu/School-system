import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from "../utils/errors.js";

export const validate = (schema: z.ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: z.ZodIssue) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError(
          `Validation failed: ${errors.map((e: { message: string }) => e.message).join(', ')}`
        ));
      }
      return next(error);
    }
  };
};

