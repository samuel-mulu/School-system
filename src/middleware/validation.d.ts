import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const validate: (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map