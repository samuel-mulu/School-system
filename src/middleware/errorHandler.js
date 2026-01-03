import { AppError } from '../utils/errors';
import { sendError } from '../utils/responses';
export const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode);
    }
    // Handle Prisma validation errors
    if (err.name === 'PrismaClientValidationError' || err.message.includes('Invalid value')) {
        const errorMessage = err.message.includes('dateOfBirth')
            ? 'Invalid date format. Please provide a valid date.'
            : err.message.split('\n').pop() || 'Validation error';
        return sendError(res, errorMessage, 400);
    }
    // Log unexpected errors
    console.error('Unexpected error:', err);
    return sendError(res, 'Internal server error', 500);
};
//# sourceMappingURL=errorHandler.js.map