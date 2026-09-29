import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('API Error:', {
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // 3. Mongo Duplicate Key Error (11000)
  if (err.code === 11000) {
    const keys = Object.keys((err as any).keyValue || {});
    const field = keys.find((k) => k !== 'businessId') || keys[0] || 'field';
    const errorMsg = `Duplicate value entered for ${field}. It must be unique.`;
    res.status(409).json({
      success: false,
      error: errorMsg,
      message: errorMsg,
    });
    return;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    const errorMsg = messages.join(', ') || 'Validation error.';
    res.status(400).json({
      success: false,
      error: errorMsg,
      message: errorMsg,
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const errorMsg = `Invalid identifier: ${err.value}`;
    res.status(400).json({
      success: false,
      error: errorMsg,
      message: errorMsg,
    });
    return;
  }

  // Handle known error messages from business rules
  if (err.message && err.message.includes('ERR_INSUFFICIENT_STOCK')) {
    res.status(400).json({
      success: false,
      error: 'Insufficient stock available.',
      message: 'Insufficient stock available.',
      details: err.message,
    });
    return;
  }

  if (err instanceof AppError || (err.statusCode && typeof err.statusCode === 'number')) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
    });
    return;
  }

  const errorMsg = err.message || 'Something went wrong. Please try again.';
  res.status(err.statusCode || 500).json({
    success: false,
    error: errorMsg,
    message: errorMsg,
  });
};
