import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export function requireRole(allowedRoles: Array<'user' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Forbidden: Insufficient permissions to access this resource', HTTP_STATUS.FORBIDDEN);
      return;
    }

    next();
  };
}
