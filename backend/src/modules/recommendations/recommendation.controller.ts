import { Request, Response } from 'express';
import { RecommendationService } from './recommendation.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class RecommendationController {
  static async getHomeFeed(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    try {
      const feed = await RecommendationService.getHomeFeed(userId);
      sendSuccess(res, feed, 'Home feed generated');
    } catch (err: any) {
      sendError(res, 'Failed to generate personalized home feed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  static async getSimilar(req: Request, res: Response): Promise<void> {
    const { trackId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    try {
      const tracks = await RecommendationService.getSimilarTracks(trackId, limit);
      sendSuccess(res, tracks, 'Similar track recommendations retrieved');
    } catch (err: any) {
      sendError(res, 'Failed to fetch recommendations', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
}
