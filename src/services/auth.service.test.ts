import { AuthService, RegisterDTO, LoginDTO } from './auth.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { User } from '../models/user.entity';
import { AppDataSource } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';

// Mock dependencies
jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../models/user.entity', () => ({
  User: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockUser: any;

  beforeEach(() => {
    // Setup mock repository
    mockUserRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    // Setup mock user
    mockUser = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      refreshToken: 'old-refresh-token',
      lastLoginAt: null,
      comparePassword: jest.fn(),
      toJSON: jest.fn().mockReturnValue({
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
    authService = new AuthService();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData: RegisterDTO = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      // Setup mocks
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');

      // Execute
      const result = await authService.register(registerData);

      // Verify
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: registerData.email });
      expect(mockUserRepository.create).toHaveBeenCalledWith(registerData);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(2);
      expect(generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(generateRefreshToken).toHaveBeenCalledWith(mockUser);
      expect(mockUser.toJSON).toHaveBeenCalled();

      expect(result).toEqual({
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw BadRequestError if email already exists', async () => {
      // Setup mocks
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      // Execute & Verify
      await expect(authService.register(registerData)).rejects.toThrow(BadRequestError);
      await expect(authService.register(registerData)).rejects.toThrow('Email already registered');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: registerData.email });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData: LoginDTO = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      // Setup mocks
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');

      // Execute
      const result = await authService.login(loginData);

      // Verify
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(generateRefreshToken).toHaveBeenCalledWith(mockUser);
      expect(mockUser.lastLoginAt).toBe(mockDate);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockUser.toJSON).toHaveBeenCalled();

      expect(result).toEqual({
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should throw UnauthorizedError if user not found', async () => {
      // Setup mocks
      mockUserRepository.findOneBy.mockResolvedValue(null);

      // Execute & Verify
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.comparePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      // Setup mocks
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      // Execute & Verify
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(generateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      // Setup mocks
      const mockPayload = { userId: '1', email: 'john@example.com', type: 'refresh' };
      mockUser.refreshToken = refreshToken;
      
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      (generateAccessToken as jest.Mock).mockReturnValue('new-access-token');

      // Execute
      const result = await authService.refreshToken(refreshToken);

      // Verify
      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: mockPayload.userId });
      expect(generateAccessToken).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        accessToken: 'new-access-token',
      });
    });

    it('should throw UnauthorizedError if token type is not refresh', async () => {
      // Setup mocks
      const mockPayload = { userId: '1', email: 'john@example.com', type: 'access' };
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);

      // Execute & Verify
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if user not found', async () => {
      // Setup mocks
      const mockPayload = { userId: '1', email: 'john@example.com', type: 'refresh' };
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOneBy.mockResolvedValue(null);

      // Execute & Verify
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: mockPayload.userId });
    });

    it('should throw UnauthorizedError if stored token does not match', async () => {
      // Setup mocks
      const mockPayload = { userId: '1', email: 'john@example.com', type: 'refresh' };
      mockUser.refreshToken = 'different-token';
      
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      // Execute & Verify
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: mockPayload.userId });
    });

    it('should throw UnauthorizedError if token verification throws error', async () => {
      // Setup mocks
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Execute & Verify
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Setup mocks
      const userId = '1';
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      // Execute
      await authService.logout(userId);

      // Verify
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { refreshToken: undefined });
    });
  });
}); 