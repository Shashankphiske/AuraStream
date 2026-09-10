import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'aurastream_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'User registered successfully',
        HTTP_STATUS.CREATED
      );
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Login successful'
      );
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.UNAUTHORIZED);
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!token) {
        sendError(res, 'Refresh token missing', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const result = await AuthService.refresh(token);
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Token refreshed successfully'
      );
    } catch (err: any) {
      clearRefreshCookie(res);
      sendError(res, err.message || 'Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    clearRefreshCookie(res);
    sendSuccess(res, null, 'Logged out successfully');
  }
}
