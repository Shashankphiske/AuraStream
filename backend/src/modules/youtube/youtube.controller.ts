import { Request, Response } from 'express';
import { YouTubeService } from './youtube.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class YouTubeController {
  static async search(req: Request, res: Response): Promise<void> {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query || query.trim().length === 0) {
      sendError(res, 'Search query parameter "q" is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const tracks = await YouTubeService.search(query.trim(), limit);
      sendSuccess(res, tracks, `Search results for "${query}"`);
    } catch (err: any) {
      sendError(res, 'Search failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  static async getDetails(req: Request, res: Response): Promise<void> {
    const { videoId } = req.params;
    if (!videoId) {
      sendError(res, 'Video ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const track = await YouTubeService.getTrackDetails(videoId);
      if (!track) {
        sendError(res, 'Track not found', HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, track, 'Track details retrieved');
    } catch (err: any) {
      sendError(res, 'Failed to retrieve track details', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
}
