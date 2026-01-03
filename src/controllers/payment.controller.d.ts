import type { Request, Response, NextFunction } from 'express';
export declare const createPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPaymentById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const confirmPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateReceipt: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getReceiptById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getReceiptByNumber: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deletePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map