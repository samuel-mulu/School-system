import type { Request, Response, NextFunction } from 'express';
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map