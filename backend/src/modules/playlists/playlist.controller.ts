import { Request, Response } from 'express';
import { PlaylistService } from './playlist.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class PlaylistController {
  static async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const playlist = await PlaylistService.create(userId, req.body);
    sendSuccess(res, playlist, 'Playlist created', HTTP_STATUS.CREATED);
  }

  static async getMine(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const playlists = await PlaylistService.getUserPlaylists(userId);
    sendSuccess(res, playlists, 'User playlists retrieved');
  }

  static async getFeatured(req: Request, res: Response): Promise<void> {
    const playlists = await PlaylistService.getPublicPlaylists(20);
    sendSuccess(res, playlists, 'Featured public playlists retrieved');
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    try {
      const data = await PlaylistService.getById(id, currentUserId);
      if (!data) {
        sendError(res, 'Playlist not found', HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, data, 'Playlist retrieved');
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      const updated = await PlaylistService.update(id, userId, req.body);
      if (!updated) {
        sendError(res, 'Playlist not found', HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, updated, 'Playlist updated');
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      const success = await PlaylistService.delete(id, userId);
      if (!success) {
        sendError(res, 'Failed to delete playlist', HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, null, 'Playlist deleted successfully');
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST);
    }
  }

  static async addTrack(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      await PlaylistService.addTrack(id, userId, req.body.track);
      sendSuccess(res, null, 'Track added to playlist', HTTP_STATUS.CREATED);
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST);
    }
  }

  static async removeTrack(req: Request, res: Response): Promise<void> {
    const { id, trackId } = req.params;
    const userId = req.user!.userId;

    try {
      const success = await PlaylistService.removeTrack(id, userId, trackId);
      if (!success) {
        sendError(res, 'Track could not be removed from playlist', HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, null, 'Track removed from playlist');
    } catch (err: any) {
      sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST);
    }
  }
}
