import api from './api';
import { ITrack } from '../types';
import { CURATED_TRACKS, GENRE_ITEMS, MOOD_CATEGORIES } from '../constants';

export const musicService = {
  async getTrending(limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get('/music/trending', { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
      return CURATED_TRACKS.slice(0, limit);
    } catch {
      return CURATED_TRACKS.slice(0, limit);
    }
  },

  async getByGenre(genre: string, limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get(`/music/genre/${encodeURIComponent(genre)}`, { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
      return CURATED_TRACKS.filter((t) => t.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
    } catch {
      return CURATED_TRACKS.filter((t) => t.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
    }
  },

  async getByMood(moodId: string, limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get(`/music/mood/${encodeURIComponent(moodId)}`, { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
      return CURATED_TRACKS.slice(0, limit);
    } catch {
      return CURATED_TRACKS.slice(0, limit);
    }
  },

  async search(query: string, limit: number = 25): Promise<ITrack[]> {
    try {
      const res = await api.get('/music/search', { params: { q: query, limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
      const lower = query.toLowerCase();
      const matches = CURATED_TRACKS.filter(
        (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower) || t.genre.toLowerCase().includes(lower)
      );
      return matches.length > 0 ? matches : CURATED_TRACKS.slice(0, limit);
    } catch {
      const lower = query.toLowerCase();
      const matches = CURATED_TRACKS.filter(
        (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower) || t.genre.toLowerCase().includes(lower)
      );
      return matches.length > 0 ? matches : CURATED_TRACKS.slice(0, limit);
    }
  },

  async getTrackDetails(id: string): Promise<ITrack> {
    try {
      const res = await api.get(`/music/track/${encodeURIComponent(id)}`);
      if (res.data?.data) return res.data.data;
    } catch {}
    const found = CURATED_TRACKS.find((t) => t.id === id || t.youtube_id === id);
    if (found) return found;
    return {
      id,
      youtube_id: id,
      title: 'YouTube Stream Track',
      artist: 'YouTube Artist',
      duration: 210,
      thumbnail_url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      genre: 'Music',
      views: 1000000,
    };
  },

  async getCategories(): Promise<{ genres: string[]; moods: any[] }> {
    try {
      const res = await api.get('/music/categories');
      if (res.data?.data) return res.data.data;
    } catch {}
    return { genres: GENRE_ITEMS, moods: MOOD_CATEGORIES };
  },
};

