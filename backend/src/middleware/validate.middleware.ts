import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendError(res, 'Validation failed for request body', HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
        return;
      }
      sendError(res, 'Invalid request payload', HTTP_STATUS.BAD_REQUEST);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendError(res, 'Validation failed for request parameters', HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
        return;
      }
      sendError(res, 'Invalid query parameters', HTTP_STATUS.BAD_REQUEST);
    }
  };
}
