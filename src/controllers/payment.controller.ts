import type { Request, Response, NextFunction } from 'express';
import * as paymentService from "../services/payment.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await paymentService.createPayment(req.body);
    sendSuccess(res, payment, 'Payment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      studentId: req.query.studentId as string,
      status: req.query.status as any,
      month: req.query.month as string,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await paymentService.getPayments(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    sendSuccess(res, payment);
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentDate, paymentMethod } = req.body;
    const result = await paymentService.confirmPayment(
      req.params.id,
      paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod
    );
    sendSuccess(res, result, 'Payment confirmed successfully');
  } catch (error) {
    next(error);
  }
};

export const generateReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const receipt = await paymentService.generateReceipt(req.params.paymentId);
    sendSuccess(res, receipt, 'Receipt generated successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getReceiptById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const receipt = await paymentService.getReceiptById(req.params.id);
    sendSuccess(res, receipt);
  } catch (error) {
    next(error);
  }
};

export const getReceiptByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const receipt = await paymentService.getReceiptByNumber(req.params.receiptNumber);
    sendSuccess(res, receipt);
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await paymentService.deletePayment(req.params.id);
    sendSuccess(res, result, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
};

