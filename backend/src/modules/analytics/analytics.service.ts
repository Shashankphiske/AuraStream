import { UserModel } from '../users/user.model.js';
import { TrackModel } from '../music/track.model.js';
import { PlaylistModel } from '../playlists/playlist.model.js';
import { HistoryModel } from '../history/history.model.js';
import { getDatabase } from '../../database/connection.js';

export class AnalyticsService {
  static async getUserAnalytics(userId: string) {
    const stats = await HistoryModel.getUserStats(userId);
    const db = getDatabase();

    // Top tracks by this user
    const topTracks = await db.query(
      `SELECT t.*, COUNT(h.id) as play_count
       FROM history h
       JOIN tracks t ON h.track_id = t.id OR h.track_id = t.youtube_id
       WHERE h.user_id = ?
       GROUP BY t.id
       ORDER BY play_count DESC
       LIMIT 10`,
      [userId]
    );

    return {
      ...stats,
      totalHours: Math.round((stats.totalSeconds / 3600) * 10) / 10,
      topTracks,
    };
  }

  static async getPlatformAnalytics() {
    const totalUsers = await UserModel.countAll();
    const totalTracks = await TrackModel.countAll();
    const totalPlaylists = await PlaylistModel.countAll();
    const totalPlays = await HistoryModel.countAllPlays();

    const db = getDatabase();
    const topGlobalTracks = await db.query(
      'SELECT * FROM tracks ORDER BY views DESC LIMIT 5'
    );

    return {
      totalUsers,
      totalTracks,
      totalPlaylists,
      totalPlays,
      topGlobalTracks,
    };
  }
}
