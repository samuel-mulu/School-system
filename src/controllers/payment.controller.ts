import type { Request, Response, NextFunction } from 'express';
import * as paymentService from "../services/payment.service.js";
import { sendSuccess } from "../utils/responses.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { BadRequestError } from "../utils/errors.js";

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

export const createBulkPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payments = await paymentService.createBulkPayments(req.body);
    sendSuccess(res, { payments }, `Successfully created ${payments.length} payment${payments.length !== 1 ? 's' : ''}`, 201);
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
    const { paymentDate, paymentMethod, proofImageUrl, transactionNumber } = req.body;
    const result = await paymentService.confirmPayment(
      req.params.id,
      paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      proofImageUrl,
      transactionNumber
    );
    sendSuccess(res, result, 'Payment confirmed successfully');
  } catch (error) {
    next(error);
  }
};

export const confirmBulkPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentIds, paymentDate, paymentMethod, proofImageUrl, transactionNumber } = req.body;
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return next(new Error('paymentIds array is required'));
    }
    const result = await paymentService.confirmBulkPayments(
      paymentIds,
      paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      proofImageUrl,
      transactionNumber
    );
    sendSuccess(res, result, `Successfully confirmed ${result.payments.length} payment${result.payments.length !== 1 ? 's' : ''} with receipt ${result.receipt.receiptNumber}`);
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
    const receiptData = await paymentService.getReceiptById(req.params.id);
    // Extract receipt and payments for frontend compatibility
    const { payments, ...receipt } = receiptData;
    sendSuccess(res, { receipt, payments });
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
    const receiptData = await paymentService.getReceiptByNumber(req.params.receiptNumber);
    // Extract receipt and payments for frontend compatibility
    const { payments, ...receipt } = receiptData;
    sendSuccess(res, { receipt, payments });
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

export const uploadPaymentProof = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      throw new BadRequestError('No image file provided');
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestError('File must be an image');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestError('Image size must be less than 5MB');
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'students/payments',
    });

    sendSuccess(res, {
      imageUrl: result.secure_url,
      publicId: result.public_id,
    }, 'Payment proof image uploaded successfully');
  } catch (error) {
    next(error);
  }
};

