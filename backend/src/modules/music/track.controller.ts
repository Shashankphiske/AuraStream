import { Request, Response } from 'express';
import { TrackService } from './track.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS, GENRES, MOODS } from '../../constants/index.js';

export class TrackController {
  static async getTrending(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const tracks = await TrackService.getTrending(limit);
    sendSuccess(res, tracks, 'Trending tracks retrieved');
  }

  static async getByGenre(req: Request, res: Response): Promise<void> {
    const { genre } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const tracks = await TrackService.getByGenre(genre, limit);
    sendSuccess(res, tracks, `Tracks for genre ${genre}`);
  }

  static async getByMood(req: Request, res: Response): Promise<void> {
    const { moodId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const tracks = await TrackService.getByMood(moodId, limit);
    sendSuccess(res, tracks, `Tracks for mood ${moodId}`);
  }

  static async search(req: Request, res: Response): Promise<void> {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

    if (!query || query.trim().length === 0) {
      sendError(res, 'Query parameter "q" is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    const tracks = await TrackService.searchMusic(query.trim(), limit);
    sendSuccess(res, tracks, `Music search results for "${query}"`);
  }

  static async getDetails(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const track = await TrackService.getTrackDetails(id);
    if (!track) {
      sendError(res, 'Track not found', HTTP_STATUS.NOT_FOUND);
      return;
    }
    sendSuccess(res, track, 'Track details retrieved');
  }

  static async getGenres(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { genres: GENRES, moods: MOODS }, 'Genres and moods retrieved');
  }
}
