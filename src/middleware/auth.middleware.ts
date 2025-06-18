import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { User } from '../models/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
      tokenPayload?: TokenPayload;
    }
  }
}

export const extractToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Handle extra spaces by filtering out empty strings
    const parts = authHeader.split(' ').filter(part => part.length > 0);
    return parts.length > 1 ? parts[1] : undefined;
  }
  return undefined;
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await User.findOneBy({ id: payload.userId });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    req.token = token;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(new UnauthorizedError(error.message));
    } else {
      next(new UnauthorizedError('Invalid token'));
    }
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      return next();
    }

    const user = await User.findOneBy({ id: payload.userId });
    if (!user) {
      return next();
    }

    req.user = user;
    req.token = token;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next();
  }
}; 