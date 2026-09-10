import { getDatabase } from '../../database/connection.js';
import { ITrack } from '../../types/index.js';

export class TrackModel {
  static async save(track: Omit<ITrack, 'created_at'>): Promise<ITrack> {
    const db = getDatabase();
    await db.execute(
      `INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(youtube_id) DO UPDATE SET
         title = excluded.title,
         artist = excluded.artist,
         duration = excluded.duration,
         thumbnail_url = excluded.thumbnail_url,
         genre = excluded.genre`,
      [
        track.id,
        track.youtube_id,
        track.title,
        track.artist,
        track.duration,
        track.thumbnail_url,
        track.genre || 'Pop',
        track.views || 0,
      ]
    );

    const saved = await this.findByYoutubeId(track.youtube_id);
    return saved!;
  }

  static async findById(id: string): Promise<ITrack | null> {
    const db = getDatabase();
    return db.queryOne<ITrack>('SELECT * FROM tracks WHERE id = ?', [id]);
  }

  static async findByYoutubeId(youtubeId: string): Promise<ITrack | null> {
    const db = getDatabase();
    return db.queryOne<ITrack>('SELECT * FROM tracks WHERE youtube_id = ?', [youtubeId]);
  }

  static async getPopular(limit: number = 20): Promise<ITrack[]> {
    const db = getDatabase();
    return db.query<ITrack>('SELECT * FROM tracks ORDER BY views DESC LIMIT ?', [limit]);
  }

  static async getByGenre(genre: string, limit: number = 20): Promise<ITrack[]> {
    const db = getDatabase();
    return db.query<ITrack>('SELECT * FROM tracks WHERE genre = ? ORDER BY views DESC LIMIT ?', [genre, limit]);
  }

  static async searchLocal(query: string, limit: number = 20): Promise<ITrack[]> {
    const db = getDatabase();
    const pattern = `%${query}%`;
    return db.query<ITrack>(
      'SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? ORDER BY views DESC LIMIT ?',
      [pattern, pattern, limit]
    );
  }

  static async countAll(): Promise<number> {
    const db = getDatabase();
    const res = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM tracks');
    return res?.count || 0;
  }
}
