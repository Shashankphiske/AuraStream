import api from './api';
import { ITrack } from '../types';

export const historyService = {
  async getHistory(limit: number = 40): Promise<ITrack[]> {
    const res = await api.get('/history', { params: { limit } });
    return res.data.data;
  },

  async logPlay(track: ITrack, durationListened: number = 0): Promise<void> {
    await api.post('/history', { track, durationListened });
  },

  async clearHistory(): Promise<void> {
    await api.delete('/history');
  },

  async getStats(): Promise<{ totalPlays: number; totalSeconds: number; topGenres: any[] }> {
    const res = await api.get('/history/stats');
    return res.data.data;
  },
};
