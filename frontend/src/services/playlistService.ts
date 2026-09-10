import api from './api';
import { IPlaylist, ITrack } from '../types';

export const playlistService = {
  async getMyPlaylists(): Promise<IPlaylist[]> {
    const res = await api.get('/playlists');
    return res.data.data;
  },

  async getFeaturedPlaylists(): Promise<IPlaylist[]> {
    const res = await api.get('/playlists/featured');
    return res.data.data;
  },

  async getById(id: string): Promise<{ playlist: IPlaylist; tracks: ITrack[] }> {
    const res = await api.get(`/playlists/${encodeURIComponent(id)}`);
    return res.data.data;
  },

  async create(data: { title: string; description?: string; cover_image?: string; is_public?: boolean }): Promise<IPlaylist> {
    const res = await api.post('/playlists', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<IPlaylist>): Promise<IPlaylist> {
    const res = await api.patch(`/playlists/${encodeURIComponent(id)}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/playlists/${encodeURIComponent(id)}`);
  },

  async addTrack(playlistId: string, track: ITrack): Promise<void> {
    await api.post(`/playlists/${encodeURIComponent(playlistId)}/tracks`, { track });
  },

  async removeTrack(playlistId: string, trackId: string): Promise<void> {
    await api.delete(`/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`);
  },
};
