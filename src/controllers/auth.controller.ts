import type { NextFunction, Request, Response } from 'express';
import { getCookieOptions } from "../config/jwt.js";
import * as authService from "../services/auth.service.js";
import { sendSuccess } from "../utils/responses.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, user, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, token } = await authService.login(req.body);

    // ✅ Correct cookie for production & local
    res.cookie('token', token, getCookieOptions());

    sendSuccess(res, { user }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ✅ MUST match cookie options exactly
    res.clearCookie('token', getCookieOptions());

    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const user = await authService.getCurrentUser(req.user.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};
