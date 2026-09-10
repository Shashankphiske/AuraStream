import api from './api';
import { ITrack, PersonalizedMix } from '../types';
import { CURATED_TRACKS } from '../constants';

export interface HomeFeedResponse {
  jumpBackIn: ITrack[];
  madeForYou: PersonalizedMix[];
  trending: ITrack[];
  recommendedGenres: { genre: string; tracks: ITrack[] }[];
}

function getDefaultHomeFeed(): HomeFeedResponse {
  const allTracks = CURATED_TRACKS;
  const jumpBackIn = allTracks.slice(0, 6);
  const trending = allTracks;

  const synthwaveTracks = allTracks.filter((t) => t.genre === 'Synthwave' || t.genre === 'Electronic');
  const lofiTracks = allTracks.filter((t) => t.genre === 'Lo-Fi');
  const popTracks = allTracks.filter((t) => t.genre === 'Pop' || t.genre === 'Hip-Hop');

  const madeForYou: PersonalizedMix[] = [
    {
      id: 'mix_daily_1',
      title: 'Daily Mix 1 • Retrowave & Chill',
      description: 'Synthwave, Electronic, and Midnight drive beats tailored to you.',
      cover_image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
      tracks: synthwaveTracks,
    },
    {
      id: 'mix_daily_2',
      title: 'Daily Mix 2 • Deep Focus Flow',
      description: 'Lofi Girl and uninterrupted study beats.',
      cover_image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
      tracks: lofiTracks,
    },
    {
      id: 'mix_daily_3',
      title: 'Daily Mix 3 • Global Chart-Toppers',
      description: 'The Weeknd, Ed Sheeran, and top streaming pop music.',
      cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
      tracks: popTracks,
    },
  ];

  const recommendedGenres = [
    { genre: 'Synthwave', tracks: synthwaveTracks },
    { genre: 'Lo-Fi', tracks: lofiTracks },
    { genre: 'Pop', tracks: popTracks },
  ];

  return { jumpBackIn, madeForYou, trending, recommendedGenres };
}

export const recommendationService = {
  async getHomeFeed(): Promise<HomeFeedResponse> {
    try {
      const res = await api.get('/recommendations/home');
      if (res.data?.data && res.data.data.trending?.length > 0) {
        return res.data.data;
      }
      return getDefaultHomeFeed();
    } catch {
      return getDefaultHomeFeed();
    }
  },

  async getSimilarTracks(trackId: string, limit: number = 10): Promise<ITrack[]> {
    try {
      const res = await api.get(`/recommendations/similar/${encodeURIComponent(trackId)}`, {
        params: { limit },
      });
      return res.data.data;
    } catch {
      return CURATED_TRACKS.filter((t) => t.id !== trackId).slice(0, limit);
    }
  },
};
