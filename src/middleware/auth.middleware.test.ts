import { Request, Response, NextFunction } from 'express';
import { extractToken, authenticate, optionalAuth } from './auth.middleware';
import { UnauthorizedError } from '../utils/errors';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { User } from '../models/user.entity';

// Mock dependencies
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../models/user.entity', () => ({
  User: {
    findOneBy: jest.fn(),
  },
}));

jest.mock('../utils/errors', () => ({
  UnauthorizedError: jest.fn().mockImplementation((message: string) => {
    const error = new Error(message);
    error.name = 'UnauthorizedError';
    return error;
  }),
}));

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockUserFindOneBy = User.findOneBy as jest.MockedFunction<typeof User.findOneBy>;

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Bearer authorization header', () => {
      mockReq.headers = {
        authorization: 'Bearer token123',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBe('token123');
    });

    it('should extract token from Bearer header with different token', () => {
      mockReq.headers = {
        authorization: 'Bearer abc123xyz',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBe('abc123xyz');
    });

    it('should return undefined when no authorization header', () => {
      mockReq.headers = {};

      const result = extractToken(mockReq as Request);

      expect(result).toBeUndefined();
    });

    it('should return undefined when authorization header does not start with Bearer', () => {
      mockReq.headers = {
        authorization: 'Basic token123',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBeUndefined();
    });

    it('should return undefined when authorization header is Bearer only', () => {
      mockReq.headers = {
        authorization: 'Bearer',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBeUndefined();
    });

    it('should return undefined when authorization header is empty', () => {
      mockReq.headers = {
        authorization: '',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBeUndefined();
    });

    it('should handle authorization header with extra spaces', () => {
      mockReq.headers = {
        authorization: 'Bearer  token123',
      };

      const result = extractToken(mockReq as Request);

      expect(result).toBe('token123');
    });
  });

  describe('authenticate', () => {
    it('should authenticate user successfully with valid token', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'access',
      };
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      } as User;

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockResolvedValue(mockUser);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.token).toBe(mockToken);
      expect(mockReq.tokenPayload).toBe(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedError when no token provided', async () => {
      mockReq.headers = {};

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('No token provided');
    });

    it('should throw UnauthorizedError when token type is not access', async () => {
      const mockToken = 'refresh-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'refresh',
      };

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('Invalid token type');
    });

    it('should throw UnauthorizedError when user not found', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '999',
        email: 'nonexistent@example.com',
        type: 'access',
      };

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockResolvedValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('User not found');
    });

    it('should handle JWT verification error', async () => {
      const mockToken = 'invalid-token';
      const jwtError = new Error('JWT verification failed');

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockImplementation(() => {
        throw jwtError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('JWT verification failed');
    });

    it('should handle non-Error exceptions', async () => {
      const mockToken = 'invalid-token';

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockImplementation(() => {
        throw 'string error';
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('Invalid token');
    });

    it('should handle database error when finding user', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'access',
      };
      const dbError = new Error('Database connection failed');

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockRejectedValue(dbError);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(UnauthorizedError).toHaveBeenCalledWith('Database connection failed');
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate user successfully with valid token', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'access',
      };
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      } as User;

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockResolvedValue(mockUser);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.token).toBe(mockToken);
      expect(mockReq.tokenPayload).toBe(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should continue without authentication when no token provided', async () => {
      mockReq.headers = {};

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should continue without authentication when token type is not access', async () => {
      const mockToken = 'refresh-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'refresh',
      };

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when user not found', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '999',
        email: 'nonexistent@example.com',
        type: 'access',
      };

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockResolvedValue(null);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when JWT verification fails', async () => {
      const mockToken = 'invalid-token';
      const jwtError = new Error('JWT verification failed');

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockImplementation(() => {
        throw jwtError;
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when database error occurs', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'access',
      };
      const dbError = new Error('Database connection failed');

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserFindOneBy.mockRejectedValue(dbError);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when non-Error exception occurs', async () => {
      const mockToken = 'invalid-token';

      mockReq.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockVerifyToken.mockImplementation(() => {
        throw 'string error';
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.token).toBeUndefined();
      expect(mockReq.tokenPayload).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
}); 