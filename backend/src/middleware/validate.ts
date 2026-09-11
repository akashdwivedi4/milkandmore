import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        res.status(400).json({
          success: false,
          error: `Validation error: ${errorMessages}`,
          details: error.errors,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Invalid request payload',
      });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        res.status(400).json({
          success: false,
          error: `Query validation error: ${errorMessages}`,
          details: error.errors,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
};
