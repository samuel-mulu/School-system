import type { Request, Response, NextFunction } from 'express';
import * as paymentTypeService from "../services/payment-type.service.js";
import { sendSuccess } from "../utils/responses.js";

export const createPaymentType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentType = await paymentTypeService.createPaymentType(req.body);
    sendSuccess(res, paymentType, 'Payment type created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPaymentTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      includeInactive: req.query.includeInactive === 'true',
    };
    const paymentTypes = await paymentTypeService.getPaymentTypes(filters);
    sendSuccess(res, paymentTypes);
  } catch (error) {
    next(error);
  }
};

export const getPaymentTypeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentType = await paymentTypeService.getPaymentTypeById(req.params.id);
    sendSuccess(res, paymentType);
  } catch (error) {
    next(error);
  }
};

export const updatePaymentType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentType = await paymentTypeService.updatePaymentType(req.params.id, req.body);
    sendSuccess(res, paymentType, 'Payment type updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePaymentType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await paymentTypeService.deletePaymentType(req.params.id);
    sendSuccess(res, result, 'Payment type deleted successfully');
  } catch (error) {
    next(error);
  }
};
