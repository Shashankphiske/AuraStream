import { Response } from 'express';
import { HTTP_STATUS } from '../constants/index.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = HTTP_STATUS.OK
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}
