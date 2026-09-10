import { HistoryModel } from './history.model.js';
import { TrackModel } from '../music/track.model.js';
import { ITrack } from '../../types/index.js';

export class HistoryService {
  static async logPlayback(userId: string, trackData: any, durationListened: number = 0): Promise<void> {
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

    await HistoryModel.recordPlay(userId, track.id, durationListened);
  }

  static async getUserHistory(userId: string, limit: number = 30): Promise<ITrack[]> {
    return HistoryModel.getUserHistory(userId, limit);
  }

  static async clearUserHistory(userId: string): Promise<boolean> {
    return HistoryModel.clearUserHistory(userId);
  }

  static async getUserStats(userId: string) {
    return HistoryModel.getUserStats(userId);
  }
}
