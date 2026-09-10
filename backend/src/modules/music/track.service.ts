import { TrackModel } from './track.model.js';
import { YouTubeService } from '../youtube/youtube.service.js';
import { ITrack } from '../../types/index.js';
import { GENRES, MOODS } from '../../constants/index.js';

export class TrackService {
  static async getTrending(limit: number = 20): Promise<ITrack[]> {
    const localPopular = await TrackModel.getPopular(limit);
    if (localPopular.length >= 10) {
      return localPopular;
    }

    // Augment with YouTube trending music
    try {
      const ytTracks = await YouTubeService.search('top music hits 2025 trending', limit);
      for (const t of ytTracks) {
        await TrackModel.save(t).catch(() => {});
      }
      return TrackModel.getPopular(limit);
    } catch {
      return localPopular;
    }
  }

  static async getByGenre(genre: string, limit: number = 20): Promise<ITrack[]> {
    const local = await TrackModel.getByGenre(genre, limit);
    if (local.length >= 6) {
      return local;
    }

    // Fetch genre-specific tracks from YouTube and save to catalog
    try {
      const ytTracks = await YouTubeService.search(`${genre} best songs playlist`, limit);
      for (const t of ytTracks) {
        await TrackModel.save({ ...t, genre }).catch(() => {});
      }
      return TrackModel.getByGenre(genre, limit);
    } catch {
      return local;
    }
  }

  static async getByMood(moodId: string, limit: number = 20): Promise<ITrack[]> {
    const mood = MOODS.find(m => m.id === moodId);
    if (!mood) return this.getTrending(limit);

    try {
      const ytTracks = await YouTubeService.search(mood.query, limit);
      for (const t of ytTracks) {
        await TrackModel.save({ ...t, genre: mood.title }).catch(() => {});
      }
      return ytTracks;
    } catch {
      return this.getTrending(limit);
    }
  }

  static async searchMusic(query: string, limit: number = 25): Promise<ITrack[]> {
    // 1. Search local DB
    const localResults = await TrackModel.searchLocal(query, 10);

    // 2. Search live YouTube
    try {
      const ytResults = await YouTubeService.search(query, limit);

      // Save tracks to DB in background
      for (const track of ytResults) {
        TrackModel.save(track).catch(() => {});
      }

      // Merge and deduplicate by youtube_id
      const seen = new Set<string>();
      const combined: ITrack[] = [];

      for (const t of [...localResults, ...ytResults]) {
        if (!seen.has(t.youtube_id)) {
          seen.add(t.youtube_id);
          combined.push(t);
        }
      }

      return combined.slice(0, limit);
    } catch {
      return localResults;
    }
  }

  static async getTrackDetails(idOrYoutubeId: string): Promise<ITrack | null> {
    // Try finding by internal ID
    let track = await TrackModel.findById(idOrYoutubeId);
    if (track) return track;

    // Try finding by YouTube ID
    track = await TrackModel.findByYoutubeId(idOrYoutubeId);
    if (track) return track;

    // Fetch from YouTube directly and save
    const ytTrack = await YouTubeService.getTrackDetails(idOrYoutubeId);
    if (ytTrack) {
      return TrackModel.save(ytTrack);
    }

    return null;
  }
}
