import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/responses';
import { getCookieOptions } from '../config/jwt';
export const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        sendSuccess(res, user, 'User registered successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
export const login = async (req, res, next) => {
    try {
        const { user, token } = await authService.login(req.body);
        // Set token in HTTP-only cookie
        res.cookie('token', token, getCookieOptions());
        sendSuccess(res, { user, token }, 'Login successful');
    }
    catch (error) {
        next(error);
    }
};
export const logout = async (req, res, next) => {
    try {
        res.clearCookie('token', { path: '/' });
        sendSuccess(res, null, 'Logout successful');
    }
    catch (error) {
        next(error);
    }
};
export const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('User not authenticated');
        }
        const user = await authService.getCurrentUser(req.user.userId);
        sendSuccess(res, user);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=auth.controller.js.map