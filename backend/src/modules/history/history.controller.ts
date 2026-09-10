import { Request, Response } from 'express';
import { HistoryService } from './history.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class HistoryController {
  static async logPlay(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { track, durationListened } = req.body;

    if (!track || !track.youtube_id) {
      sendError(res, 'Valid track object with youtube_id is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    await HistoryService.logPlayback(userId, track, durationListened || 0);
    sendSuccess(res, null, 'Playback logged', HTTP_STATUS.CREATED);
  }

  static async getMine(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const history = await HistoryService.getUserHistory(userId, limit);
    sendSuccess(res, history, 'Listening history retrieved');
  }

  static async clear(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await HistoryService.clearUserHistory(userId);
    sendSuccess(res, null, 'Listening history cleared');
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const stats = await HistoryService.getUserStats(userId);
    sendSuccess(res, stats, 'Listening statistics retrieved');
  }
}
