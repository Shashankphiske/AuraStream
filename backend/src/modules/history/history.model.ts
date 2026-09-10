import crypto from 'crypto';
import { getDatabase } from '../../database/connection.js';
import { ITrack } from '../../types/index.js';

export class HistoryModel {
  static async recordPlay(userId: string, trackId: string, durationListened: number = 0): Promise<void> {
    const db = getDatabase();
    const id = `hist_${crypto.randomUUID()}`;
    await db.execute(
      'INSERT INTO history (id, user_id, track_id, duration_listened) VALUES (?, ?, ?, ?)',
      [id, userId, trackId, durationListened]
    );

    // Also increment track views count in tracks table
    await db.execute(
      'UPDATE tracks SET views = views + 1 WHERE id = ? OR youtube_id = ?',
      [trackId, trackId]
    );
  }

  static async getUserHistory(userId: string, limit: number = 30): Promise<ITrack[]> {
    const db = getDatabase();
    return db.query<ITrack>(
      `SELECT t.*, h.played_at, h.duration_listened
       FROM history h
       JOIN tracks t ON h.track_id = t.id OR h.track_id = t.youtube_id
       WHERE h.user_id = ?
       ORDER BY h.played_at DESC
       LIMIT ?`,
      [userId, limit]
    );
  }

  static async clearUserHistory(userId: string): Promise<boolean> {
    const db = getDatabase();
    const res = await db.execute('DELETE FROM history WHERE user_id = ?', [userId]);
    return res.changes > 0;
  }

  static async getUserStats(userId: string): Promise<{ totalPlays: number; totalSeconds: number; topGenres: any[] }> {
    const db = getDatabase();
    const totalRow = await db.queryOne<{ total_plays: number; total_seconds: number }>(
      'SELECT COUNT(*) as total_plays, SUM(duration_listened) as total_seconds FROM history WHERE user_id = ?',
      [userId]
    );

    const topGenres = await db.query(
      `SELECT t.genre, COUNT(*) as play_count
       FROM history h
       JOIN tracks t ON h.track_id = t.id OR h.track_id = t.youtube_id
       WHERE h.user_id = ? AND t.genre IS NOT NULL
       GROUP BY t.genre
       ORDER BY play_count DESC
       LIMIT 5`,
      [userId]
    );

    return {
      totalPlays: totalRow?.total_plays || 0,
      totalSeconds: totalRow?.total_seconds || 0,
      topGenres,
    };
  }

  static async countAllPlays(): Promise<number> {
    const db = getDatabase();
    const res = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM history');
    return res?.count || 0;
  }
}
