import crypto from 'crypto';
import { getDatabase } from '../../database/connection.js';
import { ITrack } from '../../types/index.js';

export class FavoriteModel {
  static async add(userId: string, trackId: string): Promise<boolean> {
    const db = getDatabase();
    const id = `fav_${crypto.randomUUID()}`;
    const res = await db.execute(
      'INSERT OR IGNORE INTO favorites (id, user_id, track_id) VALUES (?, ?, ?)',
      [id, userId, trackId]
    );
    return res.changes > 0;
  }

  static async remove(userId: string, trackId: string): Promise<boolean> {
    const db = getDatabase();
    const res = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND (track_id = ? OR track_id IN (SELECT id FROM tracks WHERE youtube_id = ?))',
      [userId, trackId, trackId]
    );
    return res.changes > 0;
  }

  static async isFavorite(userId: string, trackId: string): Promise<boolean> {
    const db = getDatabase();
    const row = await db.queryOne(
      'SELECT id FROM favorites WHERE user_id = ? AND (track_id = ? OR track_id IN (SELECT id FROM tracks WHERE youtube_id = ?))',
      [userId, trackId, trackId]
    );
    return Boolean(row);
  }

  static async getUserFavorites(userId: string, limit: number = 50, offset: number = 0): Promise<ITrack[]> {
    const db = getDatabase();
    return db.query<ITrack>(
      `SELECT t.*, f.created_at as favorited_at
       FROM favorites f
       JOIN tracks t ON f.track_id = t.id OR f.track_id = t.youtube_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  static async countUserFavorites(userId: string): Promise<number> {
    const db = getDatabase();
    const res = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [userId]
    );
    return res?.count || 0;
  }
}
