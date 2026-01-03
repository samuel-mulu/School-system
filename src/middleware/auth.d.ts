import type { Request, Response, NextFunction } from 'express';
import type { JWTPayload } from '../config/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map