import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  DatabaseError,
} from './errors';

// Mock Error.captureStackTrace
jest.spyOn(Error, 'captureStackTrace').mockImplementation(() => {});

describe('Error Classes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create an AppError with custom message and status code', () => {
      const message = 'Custom error message';
      const statusCode = 500;
      const error = new AppError(message, statusCode);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(Error.captureStackTrace).toHaveBeenCalledWith(error, AppError);
    });

    it('should create an AppError with custom isOperational flag', () => {
      const message = 'Non-operational error';
      const statusCode = 500;
      const isOperational = false;
      const error = new AppError(message, statusCode, isOperational);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.isOperational).toBe(false);
      expect(Error.captureStackTrace).toHaveBeenCalledWith(error, AppError);
    });

    it('should default isOperational to true when not provided', () => {
      const error = new AppError('Test message', 400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should create a NotFoundError with custom message', () => {
      const customMessage = 'User not found';
      const error = new NotFoundError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('BadRequestError', () => {
    it('should create a BadRequestError with default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should create a BadRequestError with custom message', () => {
      const customMessage = 'Invalid input data';
      const error = new BadRequestError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
    });

    it('should create an UnauthorizedError with custom message', () => {
      const customMessage = 'Invalid credentials';
      const error = new UnauthorizedError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should create a ForbiddenError with custom message', () => {
      const customMessage = 'Access denied to this resource';
      const error = new ForbiddenError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with default message', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Validation error');
      expect(error.statusCode).toBe(422);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create a ValidationError with custom message', () => {
      const customMessage = 'Email format is invalid';
      const error = new ValidationError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(422);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('DatabaseError', () => {
    it('should create a DatabaseError with default message', () => {
      const error = new DatabaseError();

      expect(error.message).toBe('Database error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
    });

    it('should create a DatabaseError with custom message', () => {
      const customMessage = 'Connection timeout';
      const error = new DatabaseError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Error inheritance and instanceof checks', () => {
    it('should properly inherit from Error and AppError', () => {
      const errors = [
        new NotFoundError(),
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ValidationError(),
        new DatabaseError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(typeof error.statusCode).toBe('number');
        expect(typeof error.isOperational).toBe('boolean');
        expect(typeof error.message).toBe('string');
      });
    });
  });
}); 