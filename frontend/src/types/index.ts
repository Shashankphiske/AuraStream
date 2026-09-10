export interface ITrack {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnail_url: string;
  genre?: string;
  views?: number;
  created_at?: string;
  played_at?: string;
  favorited_at?: string;
  // Local / Offline properties
  is_local?: boolean;
  local_url?: string;
  file_name?: string;
  file_size?: number;
  folder_name?: string;
  last_modified?: number;
}

export interface IPlaylist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image?: string | null;
  is_public: boolean;
  track_count?: number;
  user_name?: string;
  created_at: string;
  updated_at: string;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  interests: string[];
  created_at: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PersonalizedMix {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: ITrack[];
}

export interface GenreCategory {
  id: string;
  title: string;
  color: string;
  query: string;
}

// Social & Friends
export interface IFriendUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  friendship_id: string;
  status: 'pending' | 'accepted' | 'declined';
  direction?: 'incoming' | 'outgoing';
  now_playing?: string | null;
}

export interface IFriendsData {
  friends: IFriendUser[];
  pendingIncoming: IFriendUser[];
  pendingOutgoing: IFriendUser[];
}

// Listen Together Rooms (AuraRooms)
export interface IRoom {
  id: string;
  code: string;
  name: string;
  description?: string;
  host_id: string;
  host_name?: string;
  host_avatar?: string | null;
  is_public: boolean | number;
  dj_mode: 'host_only' | 'collaborative';
  current_track_id?: string | null;
  is_playing: boolean | number;
  playback_time: number;
  last_sync_time: number;
  member_count?: number;
  track_id?: string;
  youtube_id?: string;
  track_title?: string;
  track_artist?: string;
  track_thumbnail?: string;
  track_duration?: number;
  is_offline?: boolean;
  voice_enabled?: boolean;
  created_at?: string;
}

export interface IRoomMember {
  id: string;
  name: string;
  avatar?: string | null;
  role: 'host' | 'dj' | 'listener';
  joined_at?: string;
}

export interface IRoomQueueItem {
  queue_id: string;
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  duration: number;
  position: number;
  votes: number;
  added_by_name?: string;
}

export interface IRoomMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string | null;
  content: string;
  message_type: 'chat' | 'reaction' | 'system';
  created_at: string;
}

export interface IRoomSyncEvent {
  type: 'SYNC_STATE' | 'PLAY' | 'PAUSE' | 'SEEK' | 'NEXT_TRACK' | 'QUEUE_UPDATE' | 'REACTION';
  roomId: string;
  track?: ITrack | null;
  isPlaying?: boolean;
  playbackTime?: number;
  timestamp: number;
  senderId?: string;
  reaction?: string;
}

export interface ILocalFolder {
  id: string;
  name: string;
  track_count: number;
  total_duration: number;
  total_size: number;
  scanned_at: string;
}

export interface IHotspotPeer {
  id: string;
  name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  connected_at: number;
  latency_ms?: number;
}

export interface IHotspotSession {
  code: string;
  isHost: boolean;
  hostName: string;
  activePeers: IHotspotPeer[];
  currentTrackId?: string;
  isPlaying: boolean;
  playbackTime: number;
}

export interface IHotspotMessage {
  type: 'HANDSHAKE' | 'TRACK_META' | 'AUDIO_CHUNK' | 'AUDIO_COMPLETE' | 'PLAY' | 'PAUSE' | 'SEEK' | 'HEARTBEAT';
  senderId: string;
  senderName?: string;
  track?: ITrack;
  chunkIndex?: number;
  totalChunks?: number;
  chunkData?: string;
  playbackTime?: number;
  isPlaying?: boolean;
  timestamp: number;
}


