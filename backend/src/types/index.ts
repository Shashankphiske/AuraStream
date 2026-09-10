export interface IUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  interests: string[];
  created_at: string;
  updated_at: string;
}

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  interests: string[];
  created_at: string;
}

export interface ITrack {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail_url: string;
  genre: string;
  views?: number;
  created_at: string;
}

export interface IPlaylist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image?: string | null;
  is_public: boolean | number;
  created_at: string;
  updated_at: string;
  track_count?: number;
  user_name?: string;
}

export interface IPlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  track?: ITrack;
}

export interface IFavorite {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
  track?: ITrack;
}

export interface IHistory {
  id: string;
  user_id: string;
  track_id: string;
  duration_listened: number;
  played_at: string;
  track?: ITrack;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  execScript(sql: string): Promise<void>;
}
