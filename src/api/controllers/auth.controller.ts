import { Request, Response, NextFunction } from 'express';
import { AuthService, RegisterDTO, LoginDTO } from '../../services/auth.service';
import { ValidationError } from '../../utils/errors';
import { validate } from 'class-validator';
import { User } from '../../models/user.entity';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData: RegisterDTO = req.body;

      // Validate input
      const user = new User();
      Object.assign(user, userData);
      const errors = await validate(user);
      if (errors.length > 0) {
        throw new ValidationError(errors.map(error => Object.values(error.constraints || {})).join(', '));
      }

      const result = await this.authService.register(userData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginData: LoginDTO = req.body;
      const result = await this.authService.login(loginData);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await this.authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      await this.authService.logout(req.user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
} 