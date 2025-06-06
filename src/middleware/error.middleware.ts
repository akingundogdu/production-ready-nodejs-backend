import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
    }
  }

  // Log unexpected errors
  logger.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
  });

  // Hide error details in production
  const message = config.env === 'production' 
    ? 'Something went wrong' 
    : err.message;

  return res.status(500).json({
    status: 'error',
    message,
    ...(config.env !== 'production' && { stack: err.stack }),
  });
}; 