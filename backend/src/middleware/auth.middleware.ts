import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { IJwtPayload } from '../types/index.js';

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication required: missing or invalid Authorization header', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Authentication required: missing bearer token', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Token has expired', HTTP_STATUS.UNAUTHORIZED);
      return;
    }
    sendError(res, 'Invalid or malformed token', HTTP_STATUS.UNAUTHORIZED);
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
  } catch {
    // Silently continue without user for optional auth
  }
  next();
}
