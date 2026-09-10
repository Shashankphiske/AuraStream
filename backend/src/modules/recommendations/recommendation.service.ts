import { UserModel } from '../users/user.model.js';
import { TrackModel } from '../music/track.model.js';
import { HistoryModel } from '../history/history.model.js';
import { FavoriteModel } from '../favorites/favorite.model.js';
import { YouTubeService } from '../youtube/youtube.service.js';
import { ITrack } from '../../types/index.js';

export interface PersonalizedMix {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: ITrack[];
}

export class RecommendationService {
  /**
   * Generates a personalized Home feed for the user
   */
  static async getHomeFeed(userId?: string): Promise<{
    jumpBackIn: ITrack[];
    madeForYou: PersonalizedMix[];
    trending: ITrack[];
    recommendedGenres: { genre: string; tracks: ITrack[] }[];
  }> {
    // 1. Trending tracks (always included)
    const trending = await TrackModel.getPopular(15);

    if (!userId) {
      // Guest / Anonymous feed
      const popTracks = await TrackModel.getByGenre('Pop', 8);
      const lofiTracks = await TrackModel.getByGenre('Lo-Fi', 8);
      const electronicTracks = await TrackModel.getByGenre('Electronic', 8);

      return {
        jumpBackIn: trending.slice(0, 6),
        madeForYou: [
          {
            id: 'mix_lofi',
            title: 'Chill Lo-Fi Focus',
            description: 'Beats to study, relax, and code to.',
            cover_image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500',
            tracks: lofiTracks,
          },
          {
            id: 'mix_cyber',
            title: 'Cyberpunk & Synth',
            description: 'Retrowave, darksynth, and neon vibes.',
            cover_image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500',
            tracks: electronicTracks,
          },
          {
            id: 'mix_hits',
            title: 'Global Top Picks',
            description: 'The tracks taking over streaming right now.',
            cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
            tracks: popTracks,
          },
        ],
        trending,
        recommendedGenres: [
          { genre: 'Electronic', tracks: electronicTracks },
          { genre: 'Lo-Fi', tracks: lofiTracks },
        ],
      };
    }

    // 2. Authenticated user personalization
    const user = await UserModel.findById(userId);
    const history = await HistoryModel.getUserHistory(userId, 10);
    const favorites = await FavoriteModel.getUserFavorites(userId, 10);

    const jumpBackIn = history.slice(0, 8);

    // Collect user's favorite genres
    const userInterests = user?.interests && user.interests.length > 0
      ? user.interests
      : ['Electronic', 'Lo-Fi', 'Pop', 'Hip-Hop'];

    const madeForYou: PersonalizedMix[] = [];

    // Create customized mixes based on their top 3 interests
    for (let i = 0; i < Math.min(3, userInterests.length); i++) {
      const genre = userInterests[i];
      let genreTracks = await TrackModel.getByGenre(genre, 8);

      // If few tracks locally, fetch via YouTube search
      if (genreTracks.length < 5) {
        try {
          const ytTracks = await YouTubeService.search(`${genre} best hits music`, 8);
          for (const t of ytTracks) {
            await TrackModel.save({ ...t, genre }).catch(() => {});
          }
          genreTracks = await TrackModel.getByGenre(genre, 8);
        } catch {}
      }

      const coverImages = [
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
        'https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?w=500',
      ];

      madeForYou.push({
        id: `mix_${genre.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        title: `${genre} Daily Mix`,
        description: `Custom blend inspired by your love for ${genre}.`,
        cover_image: coverImages[i % coverImages.length],
        tracks: genreTracks,
      });
    }

    // Recommended genre carousels
    const recommendedGenres: { genre: string; tracks: ITrack[] }[] = [];
    for (const g of userInterests.slice(0, 2)) {
      const gTracks = await TrackModel.getByGenre(g, 6);
      if (gTracks.length > 0) {
        recommendedGenres.push({ genre: g, tracks: gTracks });
      }
    }

    return {
      jumpBackIn: jumpBackIn.length > 0 ? jumpBackIn : trending.slice(0, 6),
      madeForYou,
      trending,
      recommendedGenres,
    };
  }

  /**
   * Recommends tracks similar to a given track
   */
  static async getSimilarTracks(trackId: string, limit: number = 10): Promise<ITrack[]> {
    const track = await TrackModel.findById(trackId) || await TrackModel.findByYoutubeId(trackId);
    if (!track) {
      return TrackModel.getPopular(limit);
    }

    // Try finding tracks of same genre or artist
    const localSimilar = await TrackModel.searchLocal(track.artist, limit);
    if (localSimilar.length >= 5) {
      return localSimilar.filter(t => t.youtube_id !== track.youtube_id);
    }

    // Query YouTube for related tracks
    try {
      const ytRelated = await YouTubeService.getRelatedTracks(track.artist, track.genre, limit);
      for (const t of ytRelated) {
        TrackModel.save(t).catch(() => {});
      }
      return ytRelated.filter(t => t.youtube_id !== track.youtube_id);
    } catch {
      return localSimilar;
    }
  }
}
