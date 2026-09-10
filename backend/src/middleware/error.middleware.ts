import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log diagnostic error details securely
  logger.error('Unhandled API Error:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific known error types
  if (err.name === 'SyntaxError' && 'body' in err) {
    sendError(res, 'Malformed JSON payload', HTTP_STATUS.BAD_REQUEST);
    return;
  }

  // Generic secure message to client to prevent internal leaks
  sendError(
    res,
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected internal server error occurred' 
      : err.message || 'Internal server error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
}
