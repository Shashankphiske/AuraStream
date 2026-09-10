import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class UserController {
  static async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const profile = await UserService.getProfile(userId);
    if (!profile) {
      sendError(res, 'User profile not found', HTTP_STATUS.NOT_FOUND);
      return;
    }
    sendSuccess(res, profile, 'User profile retrieved');
  }

  static async updateInterests(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { interests } = req.body;
    const updated = await UserService.updateInterests(userId, interests);
    if (!updated) {
      sendError(res, 'Failed to update user interests', HTTP_STATUS.BAD_REQUEST);
      return;
    }
    sendSuccess(res, updated, 'Music interests updated successfully');
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const updated = await UserService.updateProfile(userId, req.body);
    if (!updated) {
      sendError(res, 'Failed to update profile', HTTP_STATUS.BAD_REQUEST);
      return;
    }
    sendSuccess(res, updated, 'Profile updated successfully');
  }
}
