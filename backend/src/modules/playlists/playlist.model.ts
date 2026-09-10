import crypto from 'crypto';
import { getDatabase } from '../../database/connection.js';
import { IPlaylist, ITrack } from '../../types/index.js';

export class PlaylistModel {
  static async create(data: {
    userId: string;
    title: string;
    description?: string;
    cover_image?: string;
    is_public?: boolean;
  }): Promise<IPlaylist> {
    const db = getDatabase();
    const id = `pl_${crypto.randomUUID()}`;
    const isPublicInt = data.is_public === false ? 0 : 1;

    await db.execute(
      `INSERT INTO playlists (id, user_id, title, description, cover_image, is_public)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description || '', data.cover_image || null, isPublicInt]
    );

    const created = await this.findById(id);
    return created!;
  }

  static async findById(id: string): Promise<IPlaylist | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      `SELECT p.*, u.name as user_name, COUNT(pt.id) as track_count
       FROM playlists p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id]
    );
    if (!row) return null;
    return {
      ...row,
      is_public: Boolean(row.is_public),
      track_count: row.track_count || 0,
    };
  }

  static async findByUserId(userId: string): Promise<IPlaylist[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT p.*, u.name as user_name, COUNT(pt.id) as track_count
       FROM playlists p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [userId]
    );
    return rows.map(r => ({
      ...r,
      is_public: Boolean(r.is_public),
      track_count: r.track_count || 0,
    }));
  }

  static async findPublic(limit: number = 20): Promise<IPlaylist[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT p.*, u.name as user_name, COUNT(pt.id) as track_count
       FROM playlists p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
       WHERE p.is_public = 1
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({
      ...r,
      is_public: Boolean(r.is_public),
      track_count: r.track_count || 0,
    }));
  }

  static async update(
    id: string,
    userId: string,
    data: { title?: string; description?: string; cover_image?: string; is_public?: boolean }
  ): Promise<IPlaylist | null> {
    const db = getDatabase();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.cover_image !== undefined) {
      updates.push('cover_image = ?');
      params.push(data.cover_image);
    }
    if (data.is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(data.is_public ? 1 : 0);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, userId);

    const result = await db.execute(
      `UPDATE playlists SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    if (result.changes === 0) return null;
    return this.findById(id);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.execute('DELETE FROM playlists WHERE id = ? AND user_id = ?', [id, userId]);
    return result.changes > 0;
  }

  static async addTrack(playlistId: string, trackId: string): Promise<boolean> {
    const db = getDatabase();
    // Get current max position
    const maxPos = await db.queryOne<{ max_pos: number }>(
      'SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = ?',
      [playlistId]
    );
    const nextPos = (maxPos?.max_pos ?? -1) + 1;
    const ptId = `pt_${crypto.randomUUID()}`;

    const res = await db.execute(
      'INSERT INTO playlist_tracks (id, playlist_id, track_id, position) VALUES (?, ?, ?, ?)',
      [ptId, playlistId, trackId, nextPos]
    );
    return res.changes > 0;
  }

  static async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    const db = getDatabase();
    const res = await db.execute(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
      [playlistId, trackId]
    );
    return res.changes > 0;
  }

  static async getTracks(playlistId: string): Promise<ITrack[]> {
    const db = getDatabase();
    return db.query<ITrack>(
      `SELECT t.*, pt.position, pt.added_at
       FROM playlist_tracks pt
       JOIN tracks t ON pt.track_id = t.id OR pt.track_id = t.youtube_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position ASC`,
      [playlistId]
    );
  }

  static async countAll(): Promise<number> {
    const db = getDatabase();
    const res = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM playlists');
    return res?.count || 0;
  }
}
