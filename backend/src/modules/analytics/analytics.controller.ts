import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class AnalyticsController {
  static async getMine(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const analytics = await AnalyticsService.getUserAnalytics(userId);
    sendSuccess(res, analytics, 'User analytics retrieved');
  }

  static async getPlatform(req: Request, res: Response): Promise<void> {
    const analytics = await AnalyticsService.getPlatformAnalytics();
    sendSuccess(res, analytics, 'Platform analytics retrieved');
  }
}
