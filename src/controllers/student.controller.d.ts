import type { Request, Response, NextFunction } from 'express';
export declare const createStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getStudents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getStudentById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const assignStudentToClass: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const transferStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=student.controller.d.ts.map