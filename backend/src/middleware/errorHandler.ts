import { Request, Response, NextFunction } from 'express';

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  stack?: string;
}

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Database errors
  if (err.message && err.message.includes('duplicate key')) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Supabase errors
  if (err.message && err.message.includes('JWT')) {
    const message = 'Invalid or expired token';
    error = new AppError(message, 401);
  }

  // Default error
  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Server Error';

  // Send error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(errorResponse);
}; 