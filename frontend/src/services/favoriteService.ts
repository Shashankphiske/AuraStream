import api from './api';
import { ITrack } from '../types';

export const favoriteService = {
  async getFavorites(limit: number = 50): Promise<ITrack[]> {
    const res = await api.get('/favorites', { params: { limit } });
    return res.data.data;
  },

  async toggleFavorite(track: ITrack): Promise<{ isFavorite: boolean }> {
    const res = await api.post('/favorites/toggle', { track });
    return res.data.data;
  },

  async checkIsFavorite(trackId: string): Promise<boolean> {
    const res = await api.get(`/favorites/check/${encodeURIComponent(trackId)}`);
    return res.data.data.isFavorite;
  },
};
