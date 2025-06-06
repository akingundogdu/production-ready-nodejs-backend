import { Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller';
import { ValidationError } from '../../utils/errors';

// Extend Express Request type for testing
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; email: string; [key: string]: any };
  }
}

// Mock all dependencies at the top level
jest.mock('../../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  })),
}));

jest.mock('class-validator', () => ({
  validate: jest.fn(),
}));

jest.mock('../../models/user.entity', () => ({
  User: jest.fn().mockImplementation(() => ({})),
}));

// Import after mocking
import { AuthService } from '../../services/auth.service';
import { validate } from 'class-validator';
import { User } from '../../models/user.entity';

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authController = new AuthController();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    (authController as any).authService = mockAuthService;

    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const mockAuthResponse = {
      user: { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    it('should register user successfully', async () => {
      mockRequest.body = validRegisterData;
      (validate as jest.Mock).mockResolvedValue([]);
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(validate).toHaveBeenCalled();
      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAuthResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockRequest.body = validRegisterData;
      const validationErrors = [
        {
          constraints: { minLength: 'firstName must be at least 2 characters long' },
        },
      ];
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(validate).toHaveBeenCalled();
      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle validation errors with undefined constraints (LINE 19 branch)', async () => {
      mockRequest.body = validRegisterData;
      const validationErrors = [
        {
          property: 'firstName',
          // constraints is undefined - this tests the fallback `|| {}` on line 19
        },
        {
          constraints: null, // Also test null case
        },
      ];
      (validate as jest.Mock).mockResolvedValue(validationErrors);

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(validate).toHaveBeenCalled();
      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest.body = validRegisterData;
      (validate as jest.Mock).mockResolvedValue([]);
      const serviceError = new Error('Service error');
      mockAuthService.register.mockRejectedValue(serviceError);

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterData);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'john@example.com',
      password: 'password123',
    };

    const mockAuthResponse = {
      user: { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    it('should login user successfully', async () => {
      mockRequest.body = validLoginData;
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginData);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAuthResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest.body = validLoginData;
      const serviceError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(serviceError);

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginData);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const validRefreshToken = 'valid-refresh-token';
    const mockTokenResponse = { accessToken: 'new-access-token' };

    it('should refresh token successfully', async () => {
      mockRequest.body = { refreshToken: validRefreshToken };
      mockAuthService.refreshToken.mockResolvedValue(mockTokenResponse);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(validRefreshToken);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTokenResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing refresh token', async () => {
      mockRequest.body = {};

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest.body = { refreshToken: validRefreshToken };
      const serviceError = new Error('Invalid refresh token');
      mockAuthService.refreshToken.mockRejectedValue(serviceError);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(validRefreshToken);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockUser = { id: '1', email: 'john@example.com' };

    it('should logout user successfully', async () => {
      mockRequest.user = mockUser;
      mockAuthService.logout.mockResolvedValue();

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      mockRequest.user = undefined;

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest.user = mockUser;
      const serviceError = new Error('Logout failed');
      mockAuthService.logout.mockRejectedValue(serviceError);

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });
}); 