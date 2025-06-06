import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  TokenPayload,
} from './jwt';
import config from '../config';
import { User } from '../models/user.entity';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
  verify: jest.fn().mockReturnValue({}),
  decode: jest.fn().mockReturnValue({}),
}));

// Mock config
jest.mock('../config', () => ({
  jwt: {
    secret: 'test-secret-key',
    expiration: '1h',
    refreshExpiration: '7d',
  },
}));

// Mock User model
jest.mock('../models/user.entity', () => ({
  User: jest.fn(),
}));

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Utilities', () => {
  let mockUser: User;

  beforeEach(() => {
    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    } as User;

    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct payload', () => {
      const expectedToken = 'generated-access-token';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      const result = generateAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          type: 'access',
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiration,
        }
      );
      expect(result).toBe(expectedToken);
    });

    it('should generate token with different user data', () => {
      const differentUser = {
        id: '987fcdeb-51a2-43d1-9f4e-123456789abc',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      } as User;

      const expectedToken = 'different-access-token';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      const result = generateAccessToken(differentUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: differentUser.id,
          email: differentUser.email,
          type: 'access',
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiration,
        }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload', () => {
      const expectedToken = 'generated-refresh-token';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      const result = generateRefreshToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          type: 'refresh',
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.refreshExpiration,
        }
      );
      expect(result).toBe(expectedToken);
    });

    it('should generate token with different user data', () => {
      const differentUser = {
        id: '111e1111-e11b-11d1-a111-111111111111',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
      } as User;

      const expectedToken = 'different-refresh-token';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      const result = generateRefreshToken(differentUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: differentUser.id,
          email: differentUser.email,
          type: 'refresh',
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.refreshExpiration,
        }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return token payload successfully', () => {
      const token = 'valid-jwt-token';
      const expectedPayload: TokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'access',
      };

      mockJwt.verify.mockReturnValue(expectedPayload as any);

      const result = verifyToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, config.jwt.secret);
      expect(result).toEqual(expectedPayload);
    });

    it('should verify refresh token payload', () => {
      const token = 'valid-refresh-token';
      const expectedPayload: TokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'refresh',
      };

      mockJwt.verify.mockReturnValue(expectedPayload as any);

      const result = verifyToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, config.jwt.secret);
      expect(result).toEqual(expectedPayload);
    });

    it('should throw error when token verification fails', () => {
      const token = 'invalid-jwt-token';
      const verificationError = new Error('Token verification failed');

      mockJwt.verify.mockImplementation(() => {
        throw verificationError;
      });

      expect(() => verifyToken(token)).toThrow(verificationError);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, config.jwt.secret);
    });

    it('should throw error for expired token', () => {
      const token = 'expired-jwt-token';
      const expiredError = new Error('Token expired');

      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      expect(() => verifyToken(token)).toThrow(expiredError);
    });
  });

  describe('decodeToken', () => {
    it('should decode token successfully without verification', () => {
      const token = 'jwt-token-to-decode';
      const expectedPayload: TokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'access',
      };

      mockJwt.decode.mockReturnValue(expectedPayload as any);

      const result = decodeToken(token);

      expect(mockJwt.decode).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedPayload);
    });

    it('should return null when decode fails', () => {
      const token = 'malformed-token';

      mockJwt.decode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      const result = decodeToken(token);

      expect(mockJwt.decode).toHaveBeenCalledWith(token);
      expect(result).toBeNull();
    });

    it('should return null when decode returns null', () => {
      const token = 'empty-token';

      mockJwt.decode.mockReturnValue(null as any);

      const result = decodeToken(token);

      expect(mockJwt.decode).toHaveBeenCalledWith(token);
      expect(result).toBeNull();
    });

    it('should handle different token types', () => {
      const token = 'refresh-jwt-token';
      const expectedPayload: TokenPayload = {
        userId: '999',
        email: 'refresh@example.com',
        type: 'refresh',
      };

      mockJwt.decode.mockReturnValue(expectedPayload as any);

      const result = decodeToken(token);

      expect(result).toEqual(expectedPayload);
    });
  });

  describe('TokenPayload interface', () => {
    it('should work with access token payload', () => {
      const payload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        type: 'access',
      };

      expect(payload.type).toBe('access');
      expect(payload.userId).toBe('123');
      expect(payload.email).toBe('test@example.com');
    });

    it('should work with refresh token payload', () => {
      const payload: TokenPayload = {
        userId: '456',
        email: 'refresh@example.com',
        type: 'refresh',
      };

      expect(payload.type).toBe('refresh');
      expect(payload.userId).toBe('456');
      expect(payload.email).toBe('refresh@example.com');
    });
  });
}); 