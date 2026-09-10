import { Request, Response } from 'express';
import { FavoriteService } from './favorite.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class FavoriteController {
  static async toggle(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { track } = req.body;

    if (!track || !track.youtube_id) {
      sendError(res, 'Valid track object with youtube_id is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    const result = await FavoriteService.toggleFavorite(userId, track);
    sendSuccess(res, result, result.isFavorite ? 'Track added to favorites' : 'Track removed from favorites');
  }

  static async getMine(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const favorites = await FavoriteService.getUserFavorites(userId, limit);
    sendSuccess(res, favorites, 'Liked songs retrieved');
  }

  static async checkStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { trackId } = req.params;
    const isFavorite = await FavoriteService.checkIsFavorite(userId, trackId);
    sendSuccess(res, { isFavorite });
  }
}
