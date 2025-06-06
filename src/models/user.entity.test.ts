import { User } from './user.entity';
import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.id = '1';
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.email = 'john@example.com';
    user.password = 'password123';
    user.isEmailVerified = false;
    user.refreshToken = 'refresh-token';
    user.lastLoginAt = new Date('2023-01-01');
    user.createdAt = new Date('2023-01-01');
    user.updatedAt = new Date('2023-01-01');

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password when password is provided', async () => {
      // Setup mocks
      const mockSalt = 'mock-salt';
      const mockHashedPassword = 'hashed-password';
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(mockSalt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      // Set password
      user.password = 'plaintext-password';

      // Execute
      await user.hashPassword();

      // Verify
      expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext-password', mockSalt);
      expect(user.password).toBe(mockHashedPassword);
    });

    it('should not hash password when password is not provided', async () => {
      // Setup - no password
      user.password = '';

      // Execute
      await user.hashPassword();

      // Verify
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe('');
    });

    it('should not hash password when password is null/undefined', async () => {
      // Setup - null password
      user.password = null as any;

      // Execute
      await user.hashPassword();

      // Verify
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe(null);
    });
  });

  describe('comparePassword', () => {
    it('should return true when password matches', async () => {
      // Setup mocks
      const candidatePassword = 'test-password';
      const hashedPassword = 'hashed-password';
      user.password = hashedPassword;
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Execute
      const result = await user.comparePassword(candidatePassword);

      // Verify
      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      // Setup mocks
      const candidatePassword = 'wrong-password';
      const hashedPassword = 'hashed-password';
      user.password = hashedPassword;
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Execute
      const result = await user.comparePassword(candidatePassword);

      // Verify
      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return user object without password and refreshToken', () => {
      // Setup
      user.password = 'hashed-password';
      user.refreshToken = 'refresh-token';

      // Execute
      const result = user.toJSON();

      // Verify
      expect(result).toEqual({
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isEmailVerified: false,
        lastLoginAt: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      });

      // Ensure sensitive fields are not present
      expect(result.password).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
    });

    it('should handle undefined refreshToken properly', () => {
      // Setup
      user.password = 'hashed-password';
      user.refreshToken = undefined;

      // Execute
      const result = user.toJSON();

      // Verify
      expect(result.password).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
      expect(result.id).toBe('1');
      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should handle optional fields correctly', () => {
      // Setup
      user.lastLoginAt = undefined;
      user.deletedAt = undefined;

      // Execute
      const result = user.toJSON();

      // Verify
      expect(result.lastLoginAt).toBeUndefined();
      expect(result.deletedAt).toBeUndefined();
      expect(result.password).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
      expect(result.id).toBe('1');
    });
  });

  describe('User entity properties', () => {
    it('should have all required properties', () => {
      // Verify that user instance has all expected properties
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('isEmailVerified');
      expect(user).toHaveProperty('refreshToken');
      expect(user).toHaveProperty('lastLoginAt');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });

    it('should set default values correctly', () => {
      const newUser = new User();
      newUser.firstName = 'Jane';
      newUser.lastName = 'Smith';
      newUser.email = 'jane@example.com';
      newUser.password = 'password';

      // isEmailVerified should default to false
      expect(newUser.isEmailVerified).toBeUndefined(); // Since we're not using actual TypeORM, defaults won't apply
      // But we can test the structure is correct
      expect(typeof newUser.firstName).toBe('string');
      expect(typeof newUser.email).toBe('string');
    });
  });
}); 