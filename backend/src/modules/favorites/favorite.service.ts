import { FavoriteModel } from './favorite.model.js';
import { TrackModel } from '../music/track.model.js';
import { ITrack } from '../../types/index.js';

export class FavoriteService {
  static async toggleFavorite(userId: string, trackData: any): Promise<{ isFavorite: boolean }> {
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

    const currentFav = await FavoriteModel.isFavorite(userId, track.id);
    if (currentFav) {
      await FavoriteModel.remove(userId, track.id);
      return { isFavorite: false };
    } else {
      await FavoriteModel.add(userId, track.id);
      return { isFavorite: true };
    }
  }

  static async checkIsFavorite(userId: string, trackId: string): Promise<boolean> {
    return FavoriteModel.isFavorite(userId, trackId);
  }

  static async getUserFavorites(userId: string, limit: number = 50): Promise<ITrack[]> {
    return FavoriteModel.getUserFavorites(userId, limit);
  }
}
