import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../models/user.entity';

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  };

  // @ts-ignore - Temporarily ignore JWT typing issues
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiration,
  });
};

export const generateRefreshToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    type: 'refresh',
  };

  // @ts-ignore - Temporarily ignore JWT typing issues
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiration,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (error) {
    throw error;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}; 