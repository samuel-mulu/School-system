import type { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response;
export declare const sendError: (res: Response, error: string, statusCode?: number) => Response;
//# sourceMappingURL=responses.d.ts.map