import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../generated/prisma/enums';
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRegistrar: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireOwner: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireTeacher: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRegistrarOrOwner: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=role.d.ts.map