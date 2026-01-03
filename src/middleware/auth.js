import { verifyToken } from '../config/jwt';
import { UnauthorizedError } from '../utils/errors';
export const authenticate = (req, res, next) => {
    try {
        // Try to get token from cookie first
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new UnauthorizedError('Authentication required');
        }
        const payload = verifyToken(token);
        req.user = payload;
        next();
    }
    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError('Invalid or expired token');
    }
};
//# sourceMappingURL=auth.js.map