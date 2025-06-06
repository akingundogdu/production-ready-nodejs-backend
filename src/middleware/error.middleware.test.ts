import { Request, Response, NextFunction } from 'express';
import { errorHandler } from './error.middleware';
import { AppError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

// Mock config
jest.mock('../config', () => ({
  env: 'development',
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('AppError handling', () => {
    it('should handle operational AppError correctly', () => {
      const appError = new BadRequestError('Invalid input data');
      
      errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid input data',
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle non-operational AppError', () => {
      const appError = new AppError('Database error', 500, false);
      
      errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: 'Database error',
        stack: appError.stack,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error',
        stack: appError.stack,
      });
    });

    it('should handle operational AppError with custom status and message', () => {
      const appError = new AppError('Unauthorized access', 401, true);
      
      errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized access',
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Regular Error handling', () => {
    it('should handle regular Error in development environment', () => {
      (config as any).env = 'development';
      const regularError = new Error('Unexpected server error');
      
      errorHandler(regularError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: 'Unexpected server error',
        stack: regularError.stack,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unexpected server error',
        stack: regularError.stack,
      });
    });

    it('should handle regular Error in production environment', () => {
      (config as any).env = 'production';
      const regularError = new Error('Unexpected server error');
      
      errorHandler(regularError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: 'Unexpected server error',
        stack: regularError.stack,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went wrong',
      });
    });

    it('should handle regular Error in test environment', () => {
      (config as any).env = 'test';
      const regularError = new Error('Test error');
      
      errorHandler(regularError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: 'Test error',
        stack: regularError.stack,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
        stack: regularError.stack,
      });
    });
  });

  describe('Error without message', () => {
    it('should handle error with empty message', () => {
      (config as any).env = 'development';
      const errorWithoutMessage = new Error('');
      
      errorHandler(errorWithoutMessage, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: '',
        stack: errorWithoutMessage.stack,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: '',
        stack: errorWithoutMessage.stack,
      });
    });
  });

  describe('Stack trace handling', () => {
    it('should include stack trace in non-production environment', () => {
      (config as any).env = 'development';
      const error = new Error('Stack trace test');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Stack trace test',
        stack: error.stack,
      });
    });

    it('should not include stack trace in production environment', () => {
      (config as any).env = 'production';
      const error = new Error('Production error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).toEqual({
        status: 'error',
        message: 'Something went wrong',
      });
      expect(jsonCall).not.toHaveProperty('stack');
    });
  });

  describe('Edge cases', () => {
    it('should handle error without stack property', () => {
      (config as any).env = 'development';
      const errorWithoutStack = { message: 'Error without stack' } as Error;
      
      errorHandler(errorWithoutStack, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error:', {
        error: 'Error without stack',
        stack: undefined,
      });
    });

    it('should handle null/undefined error message', () => {
      (config as any).env = 'development';
      const errorWithUndefinedMessage = { message: undefined } as any;
      
      errorHandler(errorWithUndefinedMessage, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: undefined,
        stack: undefined,
      });
    });
  });
}); 