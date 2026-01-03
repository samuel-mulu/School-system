import type { Request, Response, NextFunction } from 'express';
export declare const createClass: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getClasses: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getClassById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateClass: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteClass: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createSubject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getSubjectsByClass: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateSubject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteSubject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=class.controller.d.ts.map