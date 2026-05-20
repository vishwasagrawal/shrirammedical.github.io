import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendResponse } from '../utils/response';
import { AppError } from '../utils/app-error';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'PHARMACIST', 'CASHIER']).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await AuthService.login(dto, req.ip, req.headers['user-agent']);
      sendResponse(res, 200, { message: 'Login successful', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') throw new AppError('Only admins can register new users', 403);
      const dto = registerSchema.parse(req.body);
      const user = await AuthService.register(dto);
      sendResponse(res, 201, { message: 'User registered successfully', data: user });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new AppError('Refresh token required', 400);
      const tokens = await AuthService.refreshToken(refreshToken);
      sendResponse(res, 200, { message: 'Token refreshed', data: tokens });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getProfile(req.user!.id);
      sendResponse(res, 200, { data: user });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      await AuthService.changePassword(req.user!.id, oldPassword, newPassword);
      sendResponse(res, 200, { message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await AuthService.getAllUsers();
      sendResponse(res, 200, { data: users });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
      if (!allowed.includes(status)) throw new AppError(`Invalid status. Must be one of: ${allowed.join(', ')}`, 400);
      const user = await AuthService.updateUserStatus(id, status);
      sendResponse(res, 200, { message: 'User status updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // In production: invalidate token in a blacklist/Redis
      sendResponse(res, 200, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}
