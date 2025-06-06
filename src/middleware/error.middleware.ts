import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
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

  res.status(500).json({
    status: 'error',
    message,
    ...(config.env !== 'production' && { stack: err.stack }),
  });
}; 