import type { Request, Response, NextFunction } from 'express';
export declare const createMark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMarks: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMarkById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getStudentMarksByTerm: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getClassMarksByTerm: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const recordMark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const recordBulkMarks: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const calculateTermScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const calculateYearScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTermReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateRoster: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteMark: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=marks.controller.d.ts.map