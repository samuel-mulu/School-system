import type { Request, Response, NextFunction } from 'express';
export declare const markAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const markBulkAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAttendanceById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getClassAttendanceForDate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getClassAttendanceDates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=attendance.controller.d.ts.map