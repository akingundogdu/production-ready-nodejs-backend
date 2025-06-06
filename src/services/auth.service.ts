import { User } from '../models/user.entity';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { AppDataSource } from '../config/database';

export interface RegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(data: RegisterDTO): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOneBy({ email: data.email });
    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    const user = this.userRepository.create(data);
    await this.userRepository.save(user);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    const userResponse = user.toJSON();
    return {
      user: userResponse,
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.userRepository.findOneBy({ email: data.email });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const userResponse = user.toJSON();
    return {
      user: userResponse,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyToken(token);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      const user = await this.userRepository.findOneBy({ id: payload.userId });
      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const accessToken = generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: undefined });
  }
} 