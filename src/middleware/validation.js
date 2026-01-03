import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
export const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
            }
            throw error;
        }
    };
};
//# sourceMappingURL=validation.js.map