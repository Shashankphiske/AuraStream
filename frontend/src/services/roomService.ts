import api from './api';
import { IRoom, IRoomMember, IRoomQueueItem, IRoomMessage, ITrack, IRoomVoicePeer, IRoomVoiceSignal } from '../types';
import { CURATED_TRACKS } from '../constants';

export interface RoomDetailsResponse {
  room: IRoom;
  members: IRoomMember[];
  queue: IRoomQueueItem[];
  messages: IRoomMessage[];
}

export interface RoomPollResponse {
  room: {
    id: string;
    code: string;
    is_playing: boolean | number;
    playback_time: number;
    last_sync_time: number;
    current_track_id?: string;
    track_id?: string;
    youtube_id?: string;
    track_title?: string;
    track_artist?: string;
    track_thumbnail?: string;
    track_duration?: number;
  };
  queue: IRoomQueueItem[];
  members: IRoomMember[];
  messages: IRoomMessage[];
  serverTime: number;
}

export const roomService = {
  async getRooms(): Promise<IRoom[]> {
    try {
      const res = await api.get('/rooms');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  async getRoom(idOrCode: string): Promise<RoomDetailsResponse> {
    const res = await api.get(`/rooms/${encodeURIComponent(idOrCode)}`);
    return res.data.data;
  },

  async createRoom(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
    djMode?: 'host_only' | 'collaborative';
    initialTrack?: ITrack;
  }): Promise<{ id: string; code: string; name: string }> {
    const res = await api.post('/rooms', data);
    return res.data.data;
  },

  async joinRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/join`);
    } catch {}
  },

  async leaveRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/leave`);
    } catch {}
  },

  async syncPlayback(
    roomId: string,
    data: { trackId?: string; isPlaying: boolean; playbackTime: number }
  ): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/sync`, data);
    } catch {}
  },

  async pollRoom(roomId: string): Promise<RoomPollResponse> {
    const res = await api.get(`/rooms/${encodeURIComponent(roomId)}/poll`);
    return res.data.data;
  },

  async addToQueue(roomId: string, track: ITrack): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/queue`, { track });
    } catch {}
  },

  async sendMessage(roomId: string, content: string, messageType: 'chat' | 'reaction' | 'system' = 'chat'): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/messages`, { content, messageType });
    } catch {}
  },

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${encodeURIComponent(roomId)}`);
  },

  async skipTrack(roomId: string): Promise<{ nextTrack: ITrack }> {
    const res = await api.post(`/rooms/${encodeURIComponent(roomId)}/skip`);
    return res.data?.data;
  },

  // WebRTC Room Voice Chat Signaling Methods
  async joinVoice(
    roomId: string,
    data: { peerId: string; userName: string; userAvatar?: string | null; audioMode?: string }
  ): Promise<{ peers: IRoomVoicePeer[] }> {
    const res = await api.post(`/rooms/${encodeURIComponent(roomId)}/voice/join`, data);
    return res.data?.data || { peers: [] };
  },

  async leaveVoice(roomId: string, peerId: string): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/voice/leave`, { peerId });
    } catch {}
  },

  async sendVoiceSignal(
    roomId: string,
    data: { fromPeerId: string; toPeerId: string; fromName?: string; signalData: any }
  ): Promise<void> {
    try {
      await api.post(`/rooms/${encodeURIComponent(roomId)}/voice/signal`, data);
    } catch {}
  },

  async pollVoice(
    roomId: string,
    peerId: string,
    isMuted: boolean,
    isSpeaking: boolean
  ): Promise<{ signals: IRoomVoiceSignal[]; peers: IRoomVoicePeer[] }> {
    const res = await api.get(
      `/rooms/${encodeURIComponent(roomId)}/voice/poll?peerId=${encodeURIComponent(peerId)}&isMuted=${isMuted ? 1 : 0}&isSpeaking=${isSpeaking ? 1 : 0}`
    );
    return res.data?.data || { signals: [], peers: [] };
  },
};
