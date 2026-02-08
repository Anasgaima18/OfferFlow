import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map((issue) => ({
                        field: issue.path.map(String).join('.'),
                        message: issue.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
