import type { NextFunction, Request, Response } from "express";
import { getCookieOptions } from "../config/jwt.js";
import * as authService from "../services/auth.service.js";
import { sendSuccess } from "../utils/responses.js";

/**
 * =========================
 * REGISTER
 * =========================
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, user, "User registered successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * =========================
 * LOGIN
 * =========================
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, token } = await authService.login(req.body);

    // ✅ Correct cookie setup for production
    res.cookie("token", token, getCookieOptions());

    // 🔴 DO NOT rely on token in frontend
    sendSuccess(res, { user }, "Login successful");
  } catch (error) {
    next(error);
  }
};

/**
 * =========================
 * LOGOUT
 * =========================
 */
export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.clearCookie("token", {
      path: "/",
      secure: true,
      sameSite: "none",
    });

    sendSuccess(res, null, "Logout successful");
  } catch (error) {
    next(error);
  }
};

/**
 * =========================
 * GET CURRENT USER
 * =========================
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await authService.getCurrentUser(req.user.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};
