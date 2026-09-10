import { PlaylistModel } from './playlist.model.js';
import { TrackModel } from '../music/track.model.js';
import { IPlaylist, ITrack } from '../../types/index.js';

export class PlaylistService {
  static async create(userId: string, data: { title: string; description?: string; cover_image?: string; is_public?: boolean }): Promise<IPlaylist> {
    return PlaylistModel.create({ ...data, userId });
  }

  static async getById(id: string, currentUserId?: string): Promise<{ playlist: IPlaylist; tracks: ITrack[] } | null> {
    const playlist = await PlaylistModel.findById(id);
    if (!playlist) return null;

    // If private and not owner, deny
    if (!playlist.is_public && playlist.user_id !== currentUserId) {
      const err: any = new Error('This playlist is private');
      err.statusCode = 403;
      throw err;
    }

    const tracks = await PlaylistModel.getTracks(id);
    return { playlist, tracks };
  }

  static async getUserPlaylists(userId: string): Promise<IPlaylist[]> {
    return PlaylistModel.findByUserId(userId);
  }

  static async getPublicPlaylists(limit: number = 20): Promise<IPlaylist[]> {
    return PlaylistModel.findPublic(limit);
  }

  static async update(id: string, userId: string, data: any): Promise<IPlaylist | null> {
    const existing = await PlaylistModel.findById(id);
    if (!existing) return null;
    if (existing.user_id !== userId) {
      const err: any = new Error('You do not have permission to edit this playlist');
      err.statusCode = 403;
      throw err;
    }
    return PlaylistModel.update(id, userId, data);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const existing = await PlaylistModel.findById(id);
    if (!existing) return false;
    if (existing.user_id !== userId) {
      const err: any = new Error('You do not have permission to delete this playlist');
      err.statusCode = 403;
      throw err;
    }
    return PlaylistModel.delete(id, userId);
  }

  static async addTrack(playlistId: string, userId: string, trackData: any): Promise<boolean> {
    const playlist = await PlaylistModel.findById(playlistId);
    if (!playlist) {
      const err: any = new Error('Playlist not found');
      err.statusCode = 404;
      throw err;
    }
    if (playlist.user_id !== userId) {
      const err: any = new Error('Only the playlist owner can add tracks');
      err.statusCode = 403;
      throw err;
    }

    // Ensure track exists in catalog
    let track = await TrackModel.findByYoutubeId(trackData.youtube_id);
    if (!track) {
      track = await TrackModel.save({
        id: trackData.id || `yt_${trackData.youtube_id}`,
        youtube_id: trackData.youtube_id,
        title: trackData.title,
        artist: trackData.artist,
        duration: trackData.duration || 180,
        thumbnail_url: trackData.thumbnail_url || `https://i.ytimg.com/vi/${trackData.youtube_id}/hqdefault.jpg`,
        genre: trackData.genre || 'Pop',
        views: 0,
      });
    }

    return PlaylistModel.addTrack(playlistId, track.id);
  }

  static async removeTrack(playlistId: string, userId: string, trackId: string): Promise<boolean> {
    const playlist = await PlaylistModel.findById(playlistId);
    if (!playlist) return false;
    if (playlist.user_id !== userId) {
      const err: any = new Error('Only the playlist owner can remove tracks');
      err.statusCode = 403;
      throw err;
    }

    return PlaylistModel.removeTrack(playlistId, trackId);
  }
}
