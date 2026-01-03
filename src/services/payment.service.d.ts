import { PaymentStatus } from '../generated/prisma/enums';
interface CreatePaymentData {
    studentId: string;
    amount: number;
    month: string;
    year: number;
    paymentMethod?: string;
    notes?: string;
}
export declare const createPayment: (data: CreatePaymentData) => Promise<any>;
export declare const getPayments: (filters?: {
    studentId?: string;
    status?: PaymentStatus;
    month?: string;
    year?: number;
    page?: number;
    limit?: number;
}) => Promise<{
    payments: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        totalPages: number;
    };
}>;
export declare const getPaymentById: (id: string) => Promise<any>;
export declare const confirmPayment: (id: string, paymentDate?: Date, paymentMethod?: string) => Promise<any>;
export declare const generateReceipt: (paymentId: string) => Promise<any>;
export declare const getReceiptById: (id: string) => Promise<any>;
export declare const getReceiptByNumber: (receiptNumber: string) => Promise<any>;
export declare const deletePayment: (id: string) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=payment.service.d.ts.map